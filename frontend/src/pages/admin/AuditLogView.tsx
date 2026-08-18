import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { AuditLog } from '../../types';
import { Search, ShieldAlert, History } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ logs: AuditLog[] }>('/v1/audit');
      setLogs(res.data.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.entityType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Governance & Traceability
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            System Audit Trail & Version Logs
          </h1>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="p-3.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by action, officer, or entity (e.g. CASE_INITIALIZED, RECALCULATE)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border rounded-gov-md focus:ring-1 focus:ring-gov-navy outline-none text-slate-800"
          />
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="p-0 overflow-hidden shadow-soft-xs border-slate-200">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs min-w-[760px]">
            <thead>
              <tr className="gov-table-header">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Officer / Authority</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-6">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading audit trail records...
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((log) => (
                  <tr key={log.id} className="gov-table-row">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.userName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gov-navy text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {log.entityType} ({log.entityId})
                    </td>
                    <td className="py-3 px-6 text-slate-600 text-[11px]">
                      {log.newValue ? (
                        <div className="font-mono text-slate-700">
                          {log.previousValue && <span className="text-slate-400 line-through mr-2">{log.previousValue}</span>}
                          <strong className="text-emerald-700">{log.newValue}</strong>
                        </div>
                      ) : (
                        log.previousValue || 'Action recorded'
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No audit records matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
