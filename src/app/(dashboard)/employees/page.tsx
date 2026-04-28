'use client';

import { useApp } from '@/contexts/AppContext';
import { useState } from 'react';
import { Employee } from '@/lib/store';

export default function AddEmployees() {
  const { state, updateState } = useApp();

  const employees = state.employees;

  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    name: '',
    role: 'Medical',
    floor: 1,
    phone: '',
    available: true
  });

  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = async () => {
    if (!newEmp.name || !newEmp.phone) return;
    const emp: Employee = {
      id: Date.now().toString(),
      name: newEmp.name!,
      role: newEmp.role as any,
      floor: Number(newEmp.floor) || 1,
      phone: newEmp.phone!,
      available: newEmp.available!
    };
    const updated = [...employees, emp];
    await updateState('UPDATE_EMPLOYEES', { employees: updated });
    setNewEmp({ name: '', role: 'Medical', floor: 1, phone: '', available: true });
    setShowAddForm(false);
  };

  const handleRemove = async (id: string) => {
    const updated = employees.filter(e => e.id !== id);
    await updateState('UPDATE_EMPLOYEES', { employees: updated });
  };

  const toggleAvailable = async (id: string) => {
    const updated = employees.map(e => e.id === id ? { ...e, available: !e.available } : e);
    await updateState('UPDATE_EMPLOYEES', { employees: updated });
  };

  const medicalCount = employees.filter(e => e.role === 'Medical').length;
  const securityCount = employees.filter(e => e.role === 'Security').length;
  const officeCount = employees.filter(e => e.role === 'Office').length;

  const getRoleTheme = (role: string) => {
    switch(role) {
      case 'Medical': return { color: 'text-error', bg: 'bg-error', border: 'border-error', icon: 'medical_services' };
      case 'Security': return { color: 'text-primary', bg: 'bg-primary', border: 'border-primary', icon: 'local_police' };
      case 'Office': return { color: 'text-on-surface-variant', bg: 'bg-on-surface-variant', border: 'border-outline', icon: 'engineering' };
      default: return { color: 'text-on-surface', bg: 'bg-on-surface', border: 'border-on-surface', icon: 'person' };
    }
  };

  const inputClass = "w-full bg-surface-container-lowest dark:bg-surface-container-lowest border border-outline-variant/50 dark:border-outline-variant/30 text-on-surface px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary dark:focus:border-primary transition-colors text-sm";
  const labelClass = "text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block";

  return (
    <div className="animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <p className="text-primary text-label-caps uppercase mb-1">Personnel Database</p>
          <h1 className="text-headline-lg text-on-surface">Active Responders</h1>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-premium text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined text-sm">{showAddForm ? 'close' : 'person_add'}</span>
          {showAddForm ? 'Cancel' : 'Add Personnel'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="glass-panel p-6 rounded-xl mb-8 animate-in slide-in-from-top-4">
          <h2 className="text-label-caps text-on-surface uppercase tracking-widest mb-5 flex items-center gap-2 pb-3 border-b border-outline-variant/20 dark:border-outline-variant/20">
            <span className="material-symbols-outlined text-primary text-sm">person_add</span>
            Provision New Responder
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div>
              <label className={labelClass}>Full Name</label>
              <input type="text" className={inputClass}
                value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
            </div>
            <div>
              <label className={labelClass}>Designation</label>
              <select className={inputClass + ' uppercase font-bold'}
                value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value as any})}>
                <option value="Medical">Medical Staff</option>
                <option value="Security">Security Officer</option>
                <option value="Office">Facility Admin</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Assigned Floor</label>
              <input type="number" min="1" className={inputClass}
                value={newEmp.floor || ''} onChange={e => setNewEmp({...newEmp, floor: parseInt(e.target.value) || 1})} />
            </div>
            <div>
              <label className={labelClass}>Contact Number</label>
              <input type="text" placeholder="+1..." className={inputClass}
                value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleAdd} className="btn-premium text-white px-6 py-2.5 rounded-lg text-label-caps text-xs flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <span className="material-symbols-outlined text-sm">how_to_reg</span> Commit Record
            </button>
          </div>
        </div>
      )}

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel rounded-xl p-4 border-l-4 border-primary">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total</span>
          <div className="text-2xl font-bold text-on-surface mt-1">{employees.length}</div>
        </div>
        <div className="glass-panel rounded-xl p-4 border-l-4 border-error">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Medical</span>
          <div className="text-2xl font-bold text-error mt-1">{medicalCount}</div>
        </div>
        <div className="glass-panel rounded-xl p-4 border-l-4 border-primary">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Security</span>
          <div className="text-2xl font-bold text-primary mt-1">{securityCount}</div>
        </div>
        <div className="glass-panel rounded-xl p-4 border-l-4 border-outline">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Facility</span>
          <div className="text-2xl font-bold text-on-surface-variant mt-1">{officeCount}</div>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {employees.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-outline-variant/30 rounded-xl">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">person_off</span>
            <div className="text-on-surface-variant text-sm">No personnel records found</div>
          </div>
        )}
        
        {employees.map(emp => {
          const theme = getRoleTheme(emp.role);
          return (
            <div key={emp.id} className={`glass-panel rounded-xl overflow-hidden flex flex-col border-t-2 ${theme.border} hover:shadow-lg transition-all`}>
              <div className="p-4 flex gap-4">
                <div className={`w-12 h-12 rounded-lg ${theme.bg}/10 border ${theme.border}/30 flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${theme.color}`}>{theme.icon}</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-on-surface truncate pr-2">{emp.name}</h3>
                    <button onClick={() => handleRemove(emp.id)} className="text-on-surface-variant hover:text-error transition-colors shrink-0">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  <div className={`text-[10px] font-bold tracking-wider uppercase ${theme.color}`}>{emp.role}</div>
                  <div className="text-[10px] text-on-surface-variant mt-1">Floor {emp.floor}</div>
                </div>
              </div>
              
              <div className="px-4 pb-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs bg-surface-container dark:bg-surface-container-high p-2.5 rounded-lg text-on-surface">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">call</span>
                  {emp.phone}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">Status</span>
                  <button onClick={() => toggleAvailable(emp.id)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    emp.available 
                      ? 'bg-primary/10 text-primary border-primary/20' 
                      : 'bg-surface-container-highest text-on-surface-variant border-outline-variant/20'
                  }`}>
                    {emp.available ? 'On Duty' : 'Off Duty'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
