import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { LoadError } from '../components/common/LoadError';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import {  } from 'lucide-react';

export const AuditLogsPage = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');

  const [loadError, setLoadError] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoadError(null);
      let url = '/audit?limit=100';
      if (actionFilter) url += `&action=${actionFilter}`;
      if (targetTypeFilter) url += `&targetType=${targetTypeFilter}`;

      const res = await api.get(url);
      setLogs(res.data.logs);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, targetTypeFilter]);

  return (
    <div className="space-y-6">
      <LoadError message={loadError} onRetry={fetchLogs} />
      <PageHeader
        title={t('audit.pageTitle', 'Audit Log')}
        subtitle={t('audit.pageSub', 'Every sign-in, wage change, payment and account action, newest first')}
      />

      {/* Audit Log Table */}
      <Card title={`${t('audit.auditEvents', 'Audit Events')} (${logs.length})`} subtitle={t('audit.eventsStream', 'Chronological immutable events stream')}>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-700 dark:text-slate-400 italic">{t('audit.noLogs', 'No audit records found.')}</p>
        ) : (
          <div>
            {/* Mobile / Tablet Responsive Cards: Single View, Zero Side Scroll */}
            <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 sm:p-4 space-y-3">
              {logs.map((l) => (
                <div key={l._id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{l.actorName}</span>
                    <Badge variant="default" size="sm">{l.actorRole}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-purple-900 dark:text-purple-300">{l.action}</span>
                    <span className="font-mono text-[11px] text-slate-500">{new Date(l.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg break-words">
                    <span className="font-semibold">{l.targetType}: </span>
                    {l.newValues ? JSON.stringify(l.newValues) : l.reason || l.targetId || '-'}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
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
          </div>
        )}
      </Card>
    </div>
  );
};

