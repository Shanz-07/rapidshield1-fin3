export type EmployeeRole = 'Medical' | 'Security' | 'Office';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  floor: number;
  phone: string;
  available: boolean;
}

export interface Camera {
  id: string;
  floor: number;
  zone: string;
  rtspUrl: string;
}

export interface Sensor {
  id: string;
  type: 'smoke' | 'thermal' | 'vibration' | 'motion' | 'gas';
  floor: number;
  zone: string;
  status: 'ok' | 'warning' | 'triggered';
}

// Wireless ESP32 speaker device — one per employee, connected to RPi5 WiFi hotspot
export interface SpeakerDevice {
  id: string;                      // e.g. "SPK_EMP_01" — matches ESP32 DEVICE_ID
  assignedTo: string;              // employee ID
  employeeName: string;
  role: EmployeeRole;
  floor: number;
  status: 'online' | 'offline';
  lastAlertPlayed: string | null;  // ISO timestamp
  lastAlertMessage: string | null;
  sosPressed: boolean;             // currently in SOS state
  rpiChannel: string;              // WiFi connection identifier on RPi5 hotspot
}

// SOS dispatch record — triggered via RPi5 to external authorities
export interface SOSDispatch {
  id: string;
  triggeredBy: string; // employee ID
  employeeName: string;
  employeeRole: EmployeeRole;
  floor: number;
  timestamp: string;
  alertType: string | null; // current crisis type, or null if manual SOS
  servicesDispatched: { name: string; number: string; distance?: string }[];
  status: 'dispatching' | 'dispatched' | 'acknowledged';
  venueGps: { lat: number; lng: number };
  dispatchedVia: 'RPi5_GSM' | 'RPi5_INTERNET'; // connection method to external authorities
}

export interface VenueConfig {
  name: string;
  type: 'Hospital' | 'Hotel';
  floors: number;
  gps: { lat: number; lng: number };
  rpi5DeviceId: string;
}

export interface AlertLog {
  id: string;
  timestamp: string;
  source: 'RPi5' | 'Simulated';
  type: string;
  floor: number;
  zone: string;
  cameraId: string;
  confidence: number;
  internalNotified: number;
  externalCalled: number;
  gsmUsed: boolean;
  resolution: string;
}

export interface ActiveAlertPayload {
  alert_type: string;
  confidence: number;
  camera_id: string;
  floor: number;
  zone: string;
  sensor_triggered: string[];
  gps: { lat: number; lng: number };
  timestamp: string;
  footage_available: boolean;
  internet_status: 'online' | 'offline';
  device_id: string;
  source: 'RPi5' | 'Simulated';
  snapshot?: string; // Base64 JPEG data URL from the edge device
}

export interface RPi5Stats {
  cpuPercent: number;         // 0-100
  memUsedMB: number;          // e.g. 1200
  memTotalMB: number;         // e.g. 4096
  tempC: number;              // CPU temperature in Celsius
  uptimeSeconds: number;      // seconds since boot
  ip: string;                 // e.g. "192.168.4.1"
  connectedDevices: number;   // ESP32 speakers connected
}

interface ServerState {
  config: VenueConfig;
  employees: Employee[];
  cameras: Camera[];
  sensors: Sensor[];
  speakers: SpeakerDevice[];
  sosDispatches: SOSDispatch[];
  logs: AlertLog[];
  activeAlert: ActiveAlertPayload | null;
  rpi5LastHeartbeat: number;
  rpi5Stats: RPi5Stats;
}

// Helper: generate speaker device for an employee (wireless ESP32 unit)
function createSpeakerForEmployee(emp: { id: string; name: string; role: EmployeeRole; floor: number }, index: number): SpeakerDevice {
  return {
    id: `SPK_EMP_0${index}`,           // Matches DEVICE_ID in ESP32 firmware
    assignedTo: emp.id,
    employeeName: emp.name,
    role: emp.role,
    floor: emp.floor,
    status: emp.id === '5' ? 'offline' : 'online', // Guard Ravi is off duty
    lastAlertPlayed: null,
    lastAlertMessage: null,
    sosPressed: false,
    rpiChannel: `192.168.4.${10 + index}`,  // ESP32 IP on RPi5 hotspot
  };
}

const defaultEmployees: Employee[] = [
  { id: '1', name: 'Dr. Ramesh', role: 'Medical', floor: 2, phone: '+91-9876543210', available: true },
  { id: '2', name: 'Officer Singh', role: 'Security', floor: 1, phone: '+91-9876543211', available: true },
  { id: '3', name: 'Admin Priya', role: 'Office', floor: 3, phone: '+91-9876543212', available: true },
  { id: '4', name: 'Nurse Kavya', role: 'Medical', floor: 4, phone: '+91-9876543213', available: true },
  { id: '5', name: 'Guard Ravi', role: 'Security', floor: 5, phone: '+91-9876543214', available: false },
];

const defaultState: ServerState = {
  config: {
    name: "City General Hospital",
    type: "Hospital",
    floors: 5,
    gps: { lat: 17.3850, lng: 78.4867 },
    rpi5DeviceId: "RPi5_UNIT_01"
  },
  employees: defaultEmployees,
  cameras: [
    { id: 'CAM_FLOOR1', floor: 1, zone: 'A', rtspUrl: 'rtsp://192.168.1.101:554/stream' },
    { id: 'CAM_FLOOR2', floor: 2, zone: 'B', rtspUrl: 'rtsp://192.168.1.102:554/stream' },
    { id: 'CAM_FLOOR3', floor: 3, zone: 'C', rtspUrl: 'rtsp://192.168.1.103:554/stream' },
    { id: 'CAM_FLOOR4', floor: 4, zone: 'A', rtspUrl: 'rtsp://192.168.1.104:554/stream' },
    { id: 'CAM_FLOOR5', floor: 5, zone: 'B', rtspUrl: 'rtsp://192.168.1.105:554/stream' },
  ],
  sensors: [
    { id: 'S1', type: 'smoke', floor: 3, zone: 'C', status: 'ok' },
    { id: 'S2', type: 'thermal', floor: 3, zone: 'C', status: 'ok' },
  ],
  speakers: defaultEmployees.map((emp, i) => createSpeakerForEmployee(emp, i + 1)),
  sosDispatches: [],
  logs: [],
  activeAlert: null,
  rpi5LastHeartbeat: 0,
  rpi5Stats: {
    cpuPercent: 0,
    memUsedMB: 0,
    memTotalMB: 4096,
    tempC: 0,
    uptimeSeconds: 0,
    ip: '—',
    connectedDevices: 0,
  },
};

// Next.js hot-reload persistence
const globalForState = global as unknown as { serverState: ServerState };

export const serverState = globalForState.serverState || defaultState;

// Ensure speakers and sosDispatches exist on hot-reload if state was persisted before this update
if (!serverState.speakers) {
  serverState.speakers = defaultState.speakers;
}
if (!serverState.sosDispatches) {
  serverState.sosDispatches = [];
}

if (process.env.NODE_ENV !== "production") {
  globalForState.serverState = serverState;
}

export type SSEClient = {
  id: string;
  send: (data: any) => void;
};

// Keep track of connected SSE clients
const globalForSSE = global as unknown as { sseClients: SSEClient[] };
export const sseClients = globalForSSE.sseClients || [];
if (process.env.NODE_ENV !== "production") {
  globalForSSE.sseClients = sseClients;
}

export function broadcastState() {
  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    state: serverState
  });
  sseClients.forEach(client => {
    try {
      client.send(payload);
    } catch (e) {
      // Ignore
    }
  });
}

// Helper to sync speakers when employees change
export function syncSpeakersWithEmployees() {
  const existingSpeakerMap = new Map(serverState.speakers.map(s => [s.assignedTo, s]));
  
  serverState.speakers = serverState.employees.map((emp, i) => {
    const existing = existingSpeakerMap.get(emp.id);
    if (existing) {
      // Update employee info but keep speaker state
      return {
        ...existing,
        employeeName: emp.name,
        role: emp.role,
        floor: emp.floor,
        status: emp.available ? existing.status : 'offline' as const,
      };
    }
    // Create new speaker for new employee
    return createSpeakerForEmployee(emp, i + 1);
  });
}
