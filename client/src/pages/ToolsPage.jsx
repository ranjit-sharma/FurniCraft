import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  Wrench,
  Plus,
  ArrowRightLeft,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Tag,
  Building,
} from 'lucide-react';

export const ToolsPage = () => {
  const { user, isOwner, isThekedar, isWorker } = useAuth();
  const { t } = useLanguage();

  const [tools, setTools] = useState([]);
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');
  const [message, setMessage] = useState(null);

  // Add Tool Modal
  const [addToolOpen, setAddToolOpen] = useState(false);
  const [toolName, setToolName] = useState('');
  const [toolCategory, setToolCategory] = useState('DRILL');
  const [toolBrand, setToolBrand] = useState('Bosch');
  const [toolCondition, setToolCondition] = useState('EXCELLENT');
  const [purchaseCost, setPurchaseCost] = useState('');

  // Issue Tool Modal
  const [issueToolOpen, setIssueToolOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [issueProjectId, setIssueProjectId] = useState('');
  const [issueWorkerId, setIssueWorkerId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');

  // Return Tool Modal
  const [returnToolOpen, setReturnToolOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnDamageNotes, setReturnDamageNotes] = useState('');

  // Transfer Tool Modal
  const [transferToolOpen, setTransferToolOpen] = useState(false);
  const [transferIssue, setTransferIssue] = useState(null);
  const [toProjectId, setToProjectId] = useState('');
  const [toWorkerId, setToWorkerId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Thekedar isolation & filter states
  const [thekedars, setThekedars] = useState([]);
  const [thekedarFilter, setThekedarFilter] = useState('');
  const [toolThekedarId, setToolThekedarId] = useState('');

  const fetchToolsData = async (filterId = thekedarFilter) => {
    try {
      let toolsUrl = '/tools';
      if (isOwner && filterId) {
        toolsUrl += `?thekedarId=${filterId}`;
      }

      const reqs = [
        api.get(toolsUrl),
        api.get('/tools/issues'),
        api.get('/projects'),
        isOwner || isThekedar ? api.get('/users/workers') : Promise.resolve({ data: { workers: [] } }),
      ];

      if (isOwner) {
        reqs.push(api.get('/users/thekedars'));
      }

      const [toolsRes, issuesRes, projectsRes, workersRes, thekedarsRes] = await Promise.all(reqs);
      setTools(toolsRes.data.tools);
      setIssues(issuesRes.data.issues);
      setProjects(projectsRes.data.projects);
      setWorkers(workersRes.data?.workers || []);

      if (thekedarsRes?.data?.thekedars) {
        setThekedars(thekedarsRes.data.thekedars);
        if (thekedarsRes.data.thekedars.length > 0 && !toolThekedarId) {
          const firstThekedar = thekedarsRes.data.thekedars[0];
          setToolThekedarId(firstThekedar.userId?._id || firstThekedar._id);
        }
      }

      if (projectsRes.data?.projects?.length > 0) {
        setIssueProjectId(projectsRes.data.projects[0]._id);
        setToProjectId(projectsRes.data.projects[0]._id);
      }
      if (workersRes.data?.workers?.length > 0) {
        const firstWorker = workersRes.data.workers[0];
        const firstWorkerId = firstWorker.userId?._id || firstWorker._id;
        setIssueWorkerId(firstWorkerId);
        setToWorkerId(firstWorkerId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToolsData();
  }, []);

  const handleAddTool = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tools', {
        name: toolName,
        category: toolCategory,
        brand: toolBrand,
        condition: toolCondition,
        purchaseCost: parseFloat(purchaseCost) || 0,
        thekedarId: isOwner ? toolThekedarId || undefined : undefined,
      });
      setMessage({ type: 'success', text: 'New tool added to workshop inventory!' });
      setAddToolOpen(false);
      setToolName('');
      setPurchaseCost('');
      fetchToolsData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleIssueTool = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tools/issue', {
        toolId: selectedTool._id,
        projectId: issueProjectId,
        workerId: issueWorkerId,
        expectedReturnDate: expectedReturnDate || undefined,
      });
      setMessage({ type: 'success', text: `Tool '${selectedTool.name}' issued successfully!` });
      setIssueToolOpen(false);
      fetchToolsData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleReturnTool = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tools/issues/${selectedIssue._id}/return`, {
        conditionAtReturn: returnCondition,
        damageNotes: returnDamageNotes || undefined,
      });
      setMessage({ type: 'success', text: 'Tool return recorded successfully.' });
      setReturnToolOpen(false);
      fetchToolsData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleTransferTool = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tools/issues/transfer', {
        toolIssueId: transferIssue._id,
        toProjectId,
        toWorkerId,
        reason: transferReason,
      });
      setMessage({ type: 'success', text: 'Tool transferred to new project and worker!' });
      setTransferToolOpen(false);
      setTransferReason('');
      fetchToolsData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-xl p-4 text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900">
              {t('tools.title', 'Modern Furniture Tool Tracking & Job Site Assets')}
            </h2>
            {isThekedar && (
              <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                {t('tools.thekedarFilterLabel', 'Thekedar:')} {user?.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 mt-1">
            {isThekedar
              ? t('tools.thekedarScope', 'Your team\'s dedicated equipment and power tools. Isolated per Thekedar to prevent job site mix-ups and tool conflicts.')
              : t('tools.ownerScope', 'Central inventory of plunge saws, routers, edge banders, drills, and site hand tool sets across contractors.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isOwner && thekedars.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">{t('tools.thekedarFilterLabel', 'Thekedar:')}</span>
              <select
                value={thekedarFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setThekedarFilter(val);
                  fetchToolsData(val);
                }}
                className="rounded-lg border border-slate-300 p-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="">{t('tools.allThekedarsTools', 'All Thekedars\' Tools')}</option>
                {thekedars.map((th) => {
                  const thId = th.userId?._id || th._id;
                  const thName = th.userId?.name || th.name || 'Contractor';
                  const thCode = th.thekedarCode || th.phone || '';
                  return (
                    <option key={thId} value={thId}>
                      {thName} {thCode ? `(${thCode})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {(isOwner || isThekedar) && (
            <Button variant="primary" onClick={() => setAddToolOpen(true)} icon={Plus}>
              {t('tools.addAsset', 'Add Tool Asset')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`whitespace-nowrap px-4 py-2.5 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'inventory' ? 'border-amber-600 text-amber-900' : 'border-transparent text-slate-700 hover:text-slate-900'
          }`}
        >
          {t('tools.inventoryTab', 'Tool Inventory')} ({tools.length})
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`whitespace-nowrap px-4 py-2.5 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'issues' ? 'border-amber-600 text-amber-900' : 'border-transparent text-slate-700 hover:text-slate-900'
          }`}
        >
          {t('tools.issuesTab', 'Active Issues & History')} ({issues.length})
        </button>
      </div>

      {/* Tab 1: Central Tool Inventory */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Card key={tool._id} className="flex flex-col justify-between hover:border-amber-400">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">{tool.toolCode}</span>
                  <div className="flex items-center gap-1.5">
                    {isOwner && tool.thekedarId && (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                        {tool.thekedarId.name}
                      </span>
                    )}
                    <Badge variant={tool.status} size="sm">{tool.status}</Badge>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{tool.name}</h3>
                    <p className="text-xs text-slate-700">{tool.category} • {t('tools.brand', 'Brand')}: {tool.brand || 'Standard'}</p>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-slate-700">
                      {t('tools.condition', 'Condition')}: <strong className="text-slate-800">{tool.condition}</strong>
                    </span>
                  </div>
                </div>

                {tool.currentAssignment?.projectId && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-2.5 text-xs space-y-0.5">
                    <div className="text-slate-700">{t('tools.deployedAt', 'Currently Deployed at:')}</div>
                    <div className="font-bold text-slate-900">{tool.currentAssignment?.projectId?.name}</div>
                    <div className="text-[11px] text-amber-900">
                      {t('tools.handoverWith', 'With:')} {tool.currentAssignment?.workerId?.name || 'Site Crew'}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                {(isOwner || isThekedar) && tool.status === 'AVAILABLE' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setSelectedTool(tool);
                      setIssueToolOpen(true);
                    }}
                  >
                    {t('tools.issueTool', 'Issue Tool')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 2: Issues & Movement History */}
      {activeTab === 'issues' && (
        <Card title={t('tools.activeIssuesTitle', 'Active Issues & Movement History')} subtitle={t('tools.activeIssuesSubtitle', 'Project assignments, receipts, and returns')}>
          {issues.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-700 italic">{t('tools.noIssues', 'No tool issue records found.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">{t('tools.tableIssueCode', 'Issue Code')}</th>
                    <th className="p-3">{t('tools.tableTool', 'Tool')}</th>
                    <th className="p-3">{t('tools.tableProjectSite', 'Project Site')}</th>
                    <th className="p-3">{t('tools.tableWorkerInCharge', 'Worker In-Charge')}</th>
                    <th className="p-3">{t('tools.tableIssueDate', 'Issue Date')}</th>
                    <th className="p-3">{t('tools.tableStatus', 'Status')}</th>
                    <th className="p-3 text-right">{t('tools.tableActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issues.map((iss) => (
                    <tr key={iss._id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-amber-800">{iss.issueCode}</td>
                      <td className="p-3 font-semibold text-slate-900">{iss.toolId?.name}</td>
                      <td className="p-3 text-slate-700">{iss.projectId?.name}</td>
                      <td className="p-3 font-medium text-slate-800">{iss.workerId?.name}</td>
                      <td className="p-3">{new Date(iss.issueDate).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Badge variant={iss.status} size="sm">{iss.status}</Badge>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        {(isOwner || isThekedar) && iss.status === 'ISSUED' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTransferIssue(iss);
                                setTransferToolOpen(true);
                              }}
                              icon={ArrowRightLeft}
                            >
                              {t('tools.transfer', 'Transfer')}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedIssue(iss);
                                setReturnToolOpen(true);
                              }}
                              icon={RotateCcw}
                            >
                              {t('tools.returnBtn', 'Return')}
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal: Add Tool */}
      <Modal isOpen={addToolOpen} onClose={() => setAddToolOpen(false)} title={t('tools.addModalTitle', 'Add Tool Asset to Central Inventory')}>
        <form onSubmit={handleAddTool} className="space-y-4">
          {isOwner && thekedars.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('tools.ownershipLabel', 'Assign Ownership to Thekedar *')}</label>
              <select
                required
                value={toolThekedarId}
                onChange={(e) => setToolThekedarId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold"
              >
                {thekedars.map((th) => {
                  const thId = th.userId?._id || th._id;
                  const thName = th.userId?.name || th.name || 'Contractor';
                  const thCode = th.thekedarCode || th.phone || '';
                  return (
                    <option key={thId} value={thId}>
                      {thName} {thCode ? `(${thCode})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('tools.toolNameLabel', 'Tool / Machinery Name')}</label>
            <input
              type="text"
              required
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="e.g. Bosch GSB 18V-50 Cordless Impact Drill"
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('tools.categoryLabel', 'Category')}</label>
              <select
                value={toolCategory}
                onChange={(e) => setToolCategory(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="DRILL">Drill / Driver</option>
                <option value="CUTTER">Plunge / Circular Saw</option>
                <option value="ROUTER">Wood Router / Trimmer</option>
                <option value="SANDER">Orbital Sander</option>
                <option value="EDGE_BANDER_TOOL">Edge Bander</option>
                <option value="MEASURING_TOOL">Laser Meter / Level</option>
                <option value="TOOL_KIT">Tool Kit Box</option>
                <option value="LADDER">Aluminum Ladder</option>
                <option value="OTHER">Other Equipment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('tools.brandLabel', 'Brand')}</label>
              <input
                type="text"
                value={toolBrand}
                onChange={(e) => setToolBrand(e.target.value)}
                placeholder="e.g. Bosch / Makita / Festool"
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('tools.conditionLabel', 'Condition')}</label>
              <select
                value={toolCondition}
                onChange={(e) => setToolCondition(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="NEW">New</option>
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('tools.purchaseCostLabel', 'Purchase Cost (₹)')}</label>
              <input
                type="number"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                placeholder="e.g. 14500"
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddToolOpen(false)}>Cancel</Button>
            <Button type="submit">Add Tool</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Issue Tool */}
      <Modal isOpen={issueToolOpen} onClose={() => setIssueToolOpen(false)} title="Issue Tool to Site">
        {selectedTool && (
          <form onSubmit={handleIssueTool} className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              Tool: <strong className="text-sm">{selectedTool.name}</strong> ({selectedTool.toolCode})
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Destination Furniture Project</label>
              <select
                value={issueProjectId}
                onChange={(e) => setIssueProjectId(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.projectCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Responsible Worker</label>
              <select
                value={issueWorkerId}
                onChange={(e) => setIssueWorkerId(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                {workers.map((w) => {
                  const wId = w.userId?._id || w._id;
                  const wName = w.userId?.name || w.name || 'Worker';
                  const wCode = w.workerCode || '';
                  return (
                    <option key={wId} value={wId}>
                      {wName} {wCode ? `(${wCode})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Expected Return Date</label>
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIssueToolOpen(false)}>Cancel</Button>
              <Button type="submit">Confirm Tool Issue</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Return Tool */}
      <Modal isOpen={returnToolOpen} onClose={() => setReturnToolOpen(false)} title="Record Tool Return">
        {selectedIssue && (
          <form onSubmit={handleReturnTool} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              Returning: <strong className="text-sm text-slate-900">{selectedIssue.toolId?.name}</strong> from project <strong className="text-slate-900">{selectedIssue.projectId?.name}</strong>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Condition at Handover</label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="DAMAGED">Damaged / Needs Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Condition / Damage Notes</label>
              <textarea
                rows={2}
                value={returnDamageNotes}
                onChange={(e) => setReturnDamageNotes(e.target.value)}
                placeholder="Note any blade wear, cable cuts, or necessary maintenance..."
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReturnToolOpen(false)}>Cancel</Button>
              <Button type="submit">Confirm Return to Inventory</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Transfer Tool */}
      <Modal isOpen={transferToolOpen} onClose={() => setTransferToolOpen(false)} title="Transfer Tool Between Projects">
        {transferIssue && (
          <form onSubmit={handleTransferTool} className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              Tool: <strong>{transferIssue.toolId?.name}</strong> currently at <strong>{transferIssue.projectId?.name}</strong>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Destination Furniture Project</label>
              <select
                value={toProjectId}
                onChange={(e) => setToProjectId(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.projectCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Destination Worker In-Charge</label>
              <select
                value={toWorkerId}
                onChange={(e) => setToWorkerId(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                {workers.map((w) => {
                  const wId = w.userId?._id || w._id;
                  const wName = w.userId?.name || w.name || 'Worker';
                  const wCode = w.workerCode || '';
                  return (
                    <option key={wId} value={wId}>
                      {wName} {wCode ? `(${wCode})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Reason for Project Transfer</label>
              <input
                type="text"
                required
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Urgent circular plunge cutting needed at Penthouse site"
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setTransferToolOpen(false)}>Cancel</Button>
              <Button type="submit">Confirm Project Transfer</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
