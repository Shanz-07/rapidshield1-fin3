'use client';

import { useApp } from '@/contexts/AppContext';
import { FileText, Download, Filter, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function IncidentLog() {
  const { state, updateState } = useApp();
  const { logs } = state;
  const [filterType, setFilterType] = useState('ALL');

  const filteredLogs = logs.filter(log => filterType === 'ALL' || log.type === filterType);

  const getBadgeColor = (type: string) => {
    if (['FIRE', 'EXPLOSION', 'WAR', 'BLAST', 'TERROR'].includes(type)) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (['MEDICAL', 'MEDICAL EMERGENCY'].includes(type)) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (['INTRUSION', 'VIOLENCE'].includes(type)) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (['GAS', 'GAS LEAK'].includes(type)) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <FileText className="mr-3 h-8 w-8 text-blue-400" /> Incident Log
          </h1>
          <p className="text-gray-400">Complete audit trail of all AI detections and crisis routing escalations.</p>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select 
              className="bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none text-sm"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="ALL">All Crisis Types</option>
              <option value="FIRE">Fire</option>
              <option value="MEDICAL EMERGENCY">Medical Emergency</option>
              <option value="EXPLOSION">Explosion</option>
              <option value="INTRUSION">Intrusion</option>
            </select>
          </div>
          <button 
            onClick={() => updateState('CLEAR_LOGS', {})}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </button>
          <button className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/50 text-xs uppercase text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Source</th>
                <th className="px-6 py-4 font-semibold">Crisis Type</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Confidence</th>
                <th className="px-6 py-4 font-semibold text-center">Contacts (Int/Ext)</th>
                <th className="px-6 py-4 font-semibold text-center">Network Mode</th>
                <th className="px-6 py-4 font-semibold">Resolution</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${log.source === 'RPi5' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                      {log.source}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getBadgeColor(log.type)}`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="font-semibold text-white">Floor {log.floor}, Zone {log.zone}</div>
                    <div className="text-gray-500 mt-0.5">{log.cameraId}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-emerald-400">
                    {Math.round(log.confidence * 100)}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-white">{log.internalNotified}</span> / <span className="font-semibold text-blue-400">{log.externalCalled}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                     {log.gsmUsed ? (
                       <span className="text-[10px] uppercase tracking-wider font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">GSM Fallback</span>
                     ) : (
                       <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">Cloud API</span>
                     )}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`text-xs font-semibold ${log.resolution === 'Active' ? 'text-red-400 animate-pulse' : 'text-gray-500'}`}>
                       {log.resolution}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button className="text-gray-500 hover:text-white transition-colors p-1">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => updateState('DELETE_LOG', { logId: log.id })}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Delete Log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 italic">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-10 w-10 text-gray-700 mb-3" />
                      <p>No incidents recorded.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
