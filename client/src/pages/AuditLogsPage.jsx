import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ShieldAlert, Activity, Filter } from 'lucide-react';

export const AuditLogsPage = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');

  const fetchLogs = async () => {
    try {
      let url = '/audit?limit=100';
      if (actionFilter) url += `&action=${actionFilter}`;
      if (targetTypeFilter) url += `&targetType=${targetTypeFilter}`;

      const res = await api.get(url);
      setLogs(res.data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, targetTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
          <ShieldAlert className="h-4 w-4" />
          <span>{t('audit.securityCompliance', 'Security & Compliance')}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">{t('audit.title', 'Append-Only Application Audit Trail')}</h2>
        <p className="text-xs text-slate-700 dark:text-slate-300">{t('audit.subtitle', 'Tamper-evident logs of logins, user registrations, wage updates, payroll finalizations, and tool handovers.')}</p>
      </div>

      {/* Audit Log Table */}
      <Card title={`${t('audit.auditEvents', 'Audit Events')} (${logs.length})`} subtitle={t('audit.eventsStream', 'Chronological immutable events stream')}>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-700 dark:text-slate-400 italic">{t('audit.noLogs', 'No audit records found.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">{t('audit.timestamp', 'Timestamp')}</th>
                  <th className="p-3">{t('audit.actor', 'Actor')}</th>
                  <th className="p-3">{t('audit.role', 'Role')}</th>
                  <th className="p-3">{t('audit.action', 'Action')}</th>
                  <th className="p-3">{t('audit.targetEntity', 'Target Entity')}</th>
                  <th className="p-3">{t('audit.targetId', 'Target ID')}</th>
                  <th className="p-3">{t('audit.detailsChanges', 'Details / Changes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="p-3 text-slate-700 dark:text-slate-400 font-mono text-[11px]">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{l.actorName}</td>
                    <td className="p-3">
                      <Badge variant="default" size="sm">{l.actorRole}</Badge>
                    </td>
                    <td className="p-3 font-semibold text-purple-900 dark:text-purple-300">{l.action}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{l.targetType}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-700 dark:text-slate-400 truncate max-w-[120px]">
                      {l.targetId || '-'}
                    </td>
                    <td className="p-3 text-[11px] text-slate-700 dark:text-slate-400 max-w-xs truncate">
                      {l.newValues ? JSON.stringify(l.newValues) : l.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

