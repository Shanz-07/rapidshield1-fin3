import { ActiveAlertPayload, Employee, AlertLog, SOSDispatch, serverState, broadcastState } from './store';

export interface ExternalService {
  name: string;
  number: string;
  distance?: string;
  called: boolean;
}

export interface RoutingResult {
  internal: { employee: Employee; status: string; reason: string }[];
  external: ExternalService[];
  paMessage: string | null;
  lockdown: boolean;
  gsmUsed: boolean;
  speakerMessage: string | null;
}

// Generate the TTS voice message that speakers will broadcast via RPi5
export function getSpeakerAlertMessage(alertType: string, floor: number, zone: string): string {
  const type = alertType.toUpperCase();
  
  switch (type) {
    case 'FIRE':
      return `ATTENTION! FIRE DETECTED AT FLOOR ${floor}, ZONE ${zone}! PLEASE EVACUATE IMMEDIATELY USING THE NEAREST STAIRCASE. DO NOT USE ELEVATORS.`;
    case 'MEDICAL EMERGENCY':
    case 'MEDICAL':
      return `MEDICAL EMERGENCY AT FLOOR ${floor}, ZONE ${zone}! MEDICAL TEAM PLEASE RESPOND IMMEDIATELY.`;
    case 'EXPLOSION':
      return `CRITICAL ALERT! EXPLOSION DETECTED AT FLOOR ${floor}! ALL PERSONNEL EVACUATE IMMEDIATELY. THIS IS NOT A DRILL.`;
    case 'INTRUSION':
    case 'VIOLENCE':
      return `SECURITY ALERT! UNAUTHORIZED INTRUSION DETECTED AT FLOOR ${floor}, ZONE ${zone}. SECURITY TEAM RESPOND. ALL STAFF REMAIN IN PLACE.`;
    case 'LANDSLIDE':
    case 'STRUCTURAL COLLAPSE':
    case 'STRUCTURAL':
      return `STRUCTURAL ALERT AT FLOOR ${floor}! EVACUATE THE BUILDING IMMEDIATELY VIA STAIRCASES. MOVE TO THE DESIGNATED ASSEMBLY POINT.`;
    case 'WAR':
    case 'BLAST':
    case 'TERROR':
      return `IMMEDIATE DANGER! SHELTER IN PLACE NOW. MOVE TO BASEMENT OR INNER ROOMS. DO NOT GO NEAR WINDOWS.`;
    case 'GAS LEAK':
    case 'GAS':
      return `GAS LEAK DETECTED AT FLOOR ${floor}, ZONE ${zone}! DO NOT USE ELEVATORS. EVACUATE NOW. AVOID USING ELECTRICAL SWITCHES.`;
    default:
      return `ALERT! ANOMALY DETECTED AT FLOOR ${floor}, ZONE ${zone}. ALL PERSONNEL STAND BY FOR FURTHER INSTRUCTIONS.`;
  }
}

// Determine which speakers should receive alerts based on role and crisis type
function getSpeakerRecipientsForAlert(alertType: string, floor: number): string[] {
  const type = alertType.toUpperCase();
  
  // Critical events → ALL speakers
  if (['FIRE', 'EXPLOSION', 'WAR', 'BLAST', 'TERROR', 'LANDSLIDE', 'STRUCTURAL COLLAPSE', 'STRUCTURAL', 'GAS LEAK', 'GAS'].includes(type)) {
    return ['Medical', 'Security', 'Office'];
  }
  
  // Medical → Medical + nearby Security
  if (['MEDICAL EMERGENCY', 'MEDICAL'].includes(type)) {
    return ['Medical', 'Security'];
  }
  
  // Intrusion → Security only (silent for others)
  if (['INTRUSION', 'VIOLENCE'].includes(type)) {
    return ['Security'];
  }
  
  return ['Security', 'Office'];
}

// Update all relevant speakers when an alert fires (via RPi5 server)
export function updateSpeakersOnAlert(alertType: string, floor: number, zone: string) {
  const message = getSpeakerAlertMessage(alertType, floor, zone);
  const targetRoles = getSpeakerRecipientsForAlert(alertType, floor);
  const now = new Date().toISOString();
  
  serverState.speakers = serverState.speakers.map(speaker => {
    if (speaker.status === 'online' && targetRoles.includes(speaker.role)) {
      return {
        ...speaker,
        lastAlertPlayed: now,
        lastAlertMessage: message,
      };
    }
    return speaker;
  });
}

// Determine external services for SOS based on alert type
function getSOSServices(alertType: string | null): { name: string; number: string; distance?: string }[] {
  if (!alertType) {
    // Manual SOS without active alert — dispatch all services
    return [
      { name: 'City Police', number: '100', distance: '2.1km' },
      { name: 'City Fire Station', number: '101', distance: '1.2km' },
      { name: 'Apollo Ambulance', number: '108', distance: '0.8km' },
    ];
  }
  
  const type = alertType.toUpperCase();
  
  if (['FIRE', 'GAS LEAK', 'GAS'].includes(type)) {
    return [
      { name: 'City Fire Station', number: '101', distance: '1.2km' },
      { name: 'Apollo Ambulance', number: '108', distance: '0.8km' },
    ];
  }
  
  if (['MEDICAL EMERGENCY', 'MEDICAL'].includes(type)) {
    return [
      { name: 'Apollo Ambulance', number: '108', distance: '0.8km' },
    ];
  }
  
  if (['INTRUSION', 'VIOLENCE'].includes(type)) {
    return [
      { name: 'City Police', number: '100', distance: '2.1km' },
    ];
  }
  
  if (['EXPLOSION', 'WAR', 'BLAST', 'TERROR'].includes(type)) {
    return [
      { name: 'City Police', number: '100', distance: '2.1km' },
      { name: 'City Fire Station', number: '101', distance: '1.2km' },
      { name: 'Apollo Ambulance', number: '108', distance: '0.8km' },
      { name: 'Military Emergency', number: '1090' },
    ];
  }
  
  if (['LANDSLIDE', 'STRUCTURAL COLLAPSE', 'STRUCTURAL'].includes(type)) {
    return [
      { name: 'Fire & Rescue', number: '101', distance: '1.2km' },
      { name: 'Civil Defense', number: '1070' },
      { name: 'Apollo Ambulance', number: '108', distance: '0.8km' },
    ];
  }
  
  return [
    { name: 'City Police', number: '100', distance: '2.1km' },
    { name: 'Apollo Ambulance', number: '108', distance: '0.8km' },
  ];
}

// SOS dispatch — triggered by employee pressing SOS button, routed via RPi5 server
export function triggerSOS(employeeId: string): SOSDispatch | null {
  const employee = serverState.employees.find(e => e.id === employeeId);
  if (!employee) return null;
  
  const activeAlert = serverState.activeAlert;
  const alertType = activeAlert ? activeAlert.alert_type : null;
  const internetStatus = activeAlert?.internet_status || 'online';
  
  const services = getSOSServices(alertType);
  
  const dispatch: SOSDispatch = {
    id: `SOS_${Date.now()}`,
    triggeredBy: employeeId,
    employeeName: employee.name,
    employeeRole: employee.role,
    floor: employee.floor,
    timestamp: new Date().toISOString(),
    alertType,
    servicesDispatched: services,
    status: 'dispatching',
    venueGps: serverState.config.gps,
    dispatchedVia: internetStatus === 'offline' ? 'RPi5_GSM' : 'RPi5_INTERNET',
  };
  
  serverState.sosDispatches.unshift(dispatch);
  
  // Mark the speaker's SOS as pressed
  serverState.speakers = serverState.speakers.map(s => 
    s.assignedTo === employeeId ? { ...s, sosPressed: true } : s
  );
  
  // Auto-transition to 'dispatched' after 2 seconds (simulated RPi5 confirmation)
  setTimeout(() => {
    const existing = serverState.sosDispatches.find(d => d.id === dispatch.id);
    if (existing) {
      existing.status = 'dispatched';
    }
    broadcastState();
  }, 2000);
  
  broadcastState();
  return dispatch;
}

export function evaluateCrisis(payload: ActiveAlertPayload, employees: Employee[]): RoutingResult {
  const { alert_type, floor, internet_status } = payload;
  
  const gsmUsed = internet_status === 'offline';
  
  const internalContacts: { employee: Employee; status: string; reason: string }[] = [];
  const externalContacts: ExternalService[] = [];
  let paMessage: string | null = null;
  let lockdown = false;

  const availableEmployees = employees.filter(e => e.available);
  
  const getEmployees = (role: string, targetFloor?: number) => {
    return availableEmployees.filter(e => e.role === role && (targetFloor === undefined || e.floor === targetFloor));
  };

  const notifyInternal = (emp: Employee, reason: string) => {
    if (!internalContacts.find(c => c.employee.id === emp.id)) {
      internalContacts.push({ employee: emp, status: gsmUsed ? 'SMS Sent (GSM)' : 'SMS Sent', reason });
    }
  };

  const addExternal = (name: string, number: string, distance?: string) => {
    externalContacts.push({ name, number, distance, called: true });
  };

  const securityAll = getEmployees('Security');
  const medicalAll = getEmployees('Medical');
  const adminAll = getEmployees('Office'); // Using Office as Admin/Warden

  // Helper: Escalate to nearest floor for a role
  const getNearestRole = (role: string, startFloor: number): Employee | null => {
    const candidates = availableEmployees.filter(e => e.role === role);
    if (candidates.length === 0) return null;
    
    candidates.sort((a, b) => Math.abs(a.floor - startFloor) - Math.abs(b.floor - startFloor));
    return candidates[0];
  };

  switch (alert_type.toUpperCase()) {
    case 'FIRE':
      securityAll.forEach(e => notifyInternal(e, 'Security protocol'));
      const warden = getNearestRole('Office', floor);
      if (warden) notifyInternal(warden, `Warden for Floor ${floor}`);
      const medicsFire = getEmployees('Medical', floor);
      if (medicsFire.length > 0) {
        medicsFire.forEach(e => notifyInternal(e, 'Casualty standby'));
      } else {
        const nearestMedic = getNearestRole('Medical', floor);
        if (nearestMedic) notifyInternal(nearestMedic, 'Escalated Medical for casualty standby');
      }
      addExternal('City Fire Station', '101', '1.2km');
      paMessage = `Attention: Fire on Floor ${floor}. Please evacuate immediately.`;
      break;

    case 'MEDICAL EMERGENCY':
    case 'MEDICAL':
      let medics = getEmployees('Medical', floor);
      if (medics.length === 0) {
        const nearest = getNearestRole('Medical', floor);
        if (nearest) medics = [nearest];
      }
      medics.forEach(e => notifyInternal(e, 'Primary responder'));
      addExternal('Apollo Ambulance', '108', '0.8km');
      paMessage = `Medical team to Floor ${floor} immediately.`;
      break;

    case 'EXPLOSION':
      securityAll.forEach(e => notifyInternal(e, 'Emergency security protocol'));
      medicalAll.forEach(e => notifyInternal(e, 'Mass casualty standby'));
      adminAll.forEach(e => notifyInternal(e, 'Coordination needed'));
      addExternal('City Fire Station', '101', '1.2km');
      addExternal('Apollo Ambulance', '108', '0.8km');
      addExternal('City Police', '100', '2.1km');
      paMessage = 'EVACUATE IMMEDIATELY. All staff report to emergency posts.';
      lockdown = true;
      break;

    case 'INTRUSION':
    case 'VIOLENCE':
      securityAll.forEach(e => notifyInternal(e, 'Silent alert - Intrusion detected'));
      if (securityAll.length === 0 && adminAll.length > 0) {
         notifyInternal(adminAll[0], 'Escalated Security - Intrusion detected');
      }
      addExternal('City Police', '100', '2.1km');
      paMessage = null; // Silent
      break;

    case 'LANDSLIDE':
    case 'STRUCTURAL COLLAPSE':
    case 'STRUCTURAL':
      securityAll.forEach(e => notifyInternal(e, 'Evacuation coordination'));
      adminAll.forEach(e => notifyInternal(e, 'Evacuation coordination'));
      availableEmployees.forEach(e => notifyInternal(e, 'Evacuate immediately'));
      addExternal('Fire & Rescue', '101', '1.2km');
      addExternal('Civil Defense', '1070');
      paMessage = 'Structural alert. Evacuate building immediately via staircases.';
      break;

    case 'WAR':
    case 'BLAST':
    case 'TERROR':
      availableEmployees.forEach(e => notifyInternal(e, 'Immediate danger - Shelter in place'));
      addExternal('City Police', '100', '2.1km');
      addExternal('Military Emergency', '1090');
      addExternal('Apollo Ambulance', '108', '0.8km');
      paMessage = 'Immediate shelter in place. Move to basement or inner rooms.';
      lockdown = true;
      break;

    case 'GAS LEAK':
    case 'GAS':
      securityAll.forEach(e => notifyInternal(e, 'Secure area'));
      const gasWarden = getNearestRole('Office', floor);
      if (gasWarden) notifyInternal(gasWarden, `Warden for Floor ${floor}`);
      addExternal('City Fire Station', '101', '1.2km');
      addExternal('Gas Emergency Line', '1906');
      paMessage = `Gas leak detected Floor ${floor}. Do not use elevators. Evacuate now.`;
      break;
      
    default:
      // Fallback for unknown alert types
      securityAll.forEach(e => notifyInternal(e, 'Unknown anomaly detected'));
      break;
  }

  // Generate speaker message
  const speakerMessage = getSpeakerAlertMessage(alert_type, floor, payload.zone);

  return {
    internal: internalContacts,
    external: externalContacts,
    paMessage,
    lockdown,
    gsmUsed,
    speakerMessage
  };
}

export function processIncomingAlert(payload: ActiveAlertPayload) {
  serverState.activeAlert = payload;
  
  // Create a log entry
  const routing = evaluateCrisis(payload, serverState.employees);
  
  const log: AlertLog = {
    id: Date.now().toString(),
    timestamp: payload.timestamp,
    source: payload.source,
    type: payload.alert_type,
    floor: payload.floor,
    zone: payload.zone,
    cameraId: payload.camera_id,
    confidence: payload.confidence,
    internalNotified: routing.internal.length,
    externalCalled: routing.external.length,
    gsmUsed: routing.gsmUsed,
    resolution: 'Active'
  };
  
  serverState.logs.unshift(log); // Add to beginning of history

  // Update speakers via RPi5 — broadcast alert message to relevant role-based speakers
  updateSpeakersOnAlert(payload.alert_type, payload.floor, payload.zone);
  
  // Reset any previous SOS states
  serverState.speakers = serverState.speakers.map(s => ({ ...s, sosPressed: false }));
  
  broadcastState();
}

