import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  FolderKanban,
  Users,
  CheckCircle,
  Clock,
  Wrench,
  Receipt,
  Plus,
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  Hammer,
  IndianRupee,
  ArrowRightLeft,
  UserMinus,
  Trash2,
  Flame,
  Zap,
  Archive,
} from 'lucide-react';

export const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const { user, isOwner, isThekedar, isWorker } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [message, setMessage] = useState(null);

  // Assign Worker Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [workersList, setWorkersList] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [wageOverride, setWageOverride] = useState('');
  const [roleInProject, setRoleInProject] = useState('Master Carpenter');

  // Create Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [furnitureItemName, setFurnitureItemName] = useState('');
  const [taskType, setTaskType] = useState('ASSEMBLY');
  const [assignedWorkerId, setAssignedWorkerId] = useState('');
  const [plannedUnits, setPlannedUnits] = useState(1);
  const [unitMetric, setUnitMetric] = useState('Units');

  // Record Money Received Modal
  const [moneyModalOpen, setMoneyModalOpen] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedStage, setReceivedStage] = useState('Advance Booking');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [receiptReference, setReceiptReference] = useState('');
  const [payerName, setPayerName] = useState('');
  const [moneyNotes, setMoneyNotes] = useState('');

  // Shift Worker Modal
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [selectedAssignmentToShift, setSelectedAssignmentToShift] = useState(null);
  const [shiftTargetProjectId, setShiftTargetProjectId] = useState('');
  const [shiftRole, setShiftRole] = useState('Master Assembly Carpenter');
  const [shiftWageOverride, setShiftWageOverride] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  // Remove Worker Modal
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedAssignmentToRemove, setSelectedAssignmentToRemove] = useState(null);

  // Projects list for shifting
  const [allProjects, setAllProjects] = useState([]);

  const fetchProjectDetails = async () => {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/users/workers');
      setWorkersList(res.data.workers);
      if (res.data.workers.length > 0) {
        const firstWorker = res.data.workers[0];
        const firstWorkerId = firstWorker.userId?._id || firstWorker._id;
        setSelectedWorkerId(firstWorkerId);
        setAssignedWorkerId(firstWorkerId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllProjects = async () => {
    try {
      const res = await api.get('/projects');
      const list = res.data.projects || [];
      setAllProjects(list);
      const other = list.find((p) => p._id !== projectId);
      if (other) setShiftTargetProjectId(other._id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
    if (isOwner || isThekedar) {
      fetchWorkers();
      fetchAllProjects();
    }
  }, [projectId]);

  const handleShiftWorker = async (e) => {
    e.preventDefault();
    if (!selectedAssignmentToShift || !shiftTargetProjectId) return;
    try {
      await api.post(`/projects/assignments/${selectedAssignmentToShift._id}/shift`, {
        toProjectId: shiftTargetProjectId,
        roleInProject: shiftRole,
        wageOverride: shiftWageOverride ? parseFloat(shiftWageOverride) : undefined,
        notes: shiftNotes || undefined,
      });
      setMessage({ type: 'success', text: `Craftsman successfully shifted to destination project site!` });
      setShiftModalOpen(false);
      setSelectedAssignmentToShift(null);
      setShiftNotes('');
      setShiftWageOverride('');
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleRemoveWorker = async () => {
    if (!selectedAssignmentToRemove) return;
    try {
      await api.delete(`/projects/assignments/${selectedAssignmentToRemove._id}`);
      setMessage({
        type: 'success',
        text: `Craftsman ${selectedAssignmentToRemove.workerId?.name} unassigned from this project.`,
      });
      setRemoveModalOpen(false);
      setSelectedAssignmentToRemove(null);
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleAssignWorker = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/assignments`, {
        workerId: selectedWorkerId,
        wageOverride: wageOverride ? parseFloat(wageOverride) : null,
        roleInProject,
      });
      setMessage({ type: 'success', text: 'Worker assigned to project successfully!' });
      setAssignModalOpen(false);
      setWageOverride('');
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/furniture-tasks', {
        projectId,
        furnitureItemName,
        taskType,
        assignedWorkerId: assignedWorkerId || null,
        plannedUnits: parseInt(plannedUnits, 10),
        unitMetric,
      });
      setMessage({ type: 'success', text: 'Furniture task created!' });
      setTaskModalOpen(false);
      setFurnitureItemName('');
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleVerifyTask = async (taskId) => {
    try {
      await api.patch(`/furniture-tasks/${taskId}/verify`);
      setMessage({ type: 'success', text: 'Craft task verified by supervisor!' });
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleRecordMoneyReceived = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/money-received`, {
        amount: parseFloat(receivedAmount),
        stage: receivedStage,
        paymentMethod,
        receiptReference: receiptReference || undefined,
        payerName: payerName || undefined,
        notes: moneyNotes,
      });
      setMessage({ type: 'success', text: 'Project money received recorded successfully!' });
      setMoneyModalOpen(false);
      setReceivedAmount('');
      setReceiptReference('');
      setPayerName('');
      setMoneyNotes('');
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleProjectStatusChange = async (newStatus) => {
    try {
      await api.put(`/projects/${projectId}`, { status: newStatus });
      setMessage({ type: 'success', text: `Project status successfully updated to ${newStatus}` });
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update project status' });
    }
  };

  const handleProjectPriorityChange = async (newPriority) => {
    try {
      await api.put(`/projects/${projectId}`, { priority: newPriority });
      setMessage({ type: 'success', text: `Project priority successfully updated to ${newPriority}` });
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update priority' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  const project = data?.project;
  const assignments = data?.assignments || [];
  const tasks = data?.tasks || [];
  const moneyReceived = data?.moneyReceived || [];
  const tools = data?.tools || [];
  const summary = data?.financialSummary || {};

  const projectThekedarId = (project?.thekedarId?._id || project?.thekedarId)?.toString();
  const eligibleWorkers = workersList.filter((w) => {
    const wThekedarId = (w.thekedarId?._id || w.thekedarId)?.toString();
    return wThekedarId && projectThekedarId && wThekedarId === projectThekedarId;
  });

  const eligibleShiftProjects = allProjects.filter((p) => {
    const pThekedarId = (p.thekedarId?._id || p.thekedarId)?.toString();
    return p._id !== projectId && pThekedarId === projectThekedarId;
  });

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900">
        <ArrowLeft className="h-4 w-4" /> {t('projectDetail.backToProjects', 'Back to Projects')}
      </Link>

      {message && (
        <div className={`rounded-xl p-4 text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      {/* Project Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-amber-800">{project?.projectCode}</span>
              {isThekedar ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-700">{t('common.status', 'Status')}:</span>
                    <select
                      value={project?.status}
                      onChange={(e) => handleProjectStatusChange(e.target.value)}
                      className="text-xs font-bold rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-slate-900 shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="PLANNED">PLANNED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="ON_HOLD">ON_HOLD</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="ARCHIVED">ARCHIVED 📁</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-700">Priority:</span>
                    <select
                      value={project?.priority || 'MEDIUM'}
                      onChange={(e) => handleProjectPriorityChange(e.target.value)}
                      className="text-xs font-black rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-slate-900 shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="CRITICAL">🔥 CRITICAL</option>
                      <option value="HIGH">⚡ HIGH</option>
                      <option value="MEDIUM">🔷 MEDIUM</option>
                      <option value="LOW">🟢 LOW</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <Badge variant={project?.status} size="sm">{project?.status}</Badge>
                  <Badge variant={project?.priority || 'MEDIUM'} size="sm">
                    {project?.priority === 'CRITICAL' && '🔥 '}
                    {project?.priority === 'HIGH' && '⚡ '}
                    {project?.priority || 'MEDIUM'} PRIORITY
                  </Badge>
                </>
              )}
              <Badge variant="default" size="sm">{project?.projectType ? project.projectType.replace('_', ' ') : ''}</Badge>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-2">{project?.name}</h1>
            <p className="text-xs text-slate-700 mt-1">{project?.siteAddress}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-0">
            {isThekedar && (
              <>
                <Button size="sm" variant="outline" onClick={() => setAssignModalOpen(true)} icon={Users}>
                  {t('projectDetail.assignWorker', 'Assign Worker')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMoneyModalOpen(true)} icon={IndianRupee}>
                  {t('projectDetail.recordMoney', 'Record Money Received')}
                </Button>
                <Button size="sm" variant="primary" onClick={() => setTaskModalOpen(true)} icon={Plus}>
                  {t('projectDetail.createTask', 'New Task')}
                </Button>
              </>
            )}
            {isOwner && (
              <span className="inline-flex items-center rounded-lg bg-purple-50 px-3 py-1.5 border border-purple-200 text-xs font-semibold text-purple-900">
                {t('projectDetail.readOnlyInspection', 'Read-Only Executive Inspection')}
              </span>
            )}
          </div>
        </div>

        {/* Financial Summary Strip */}
        {!isWorker && summary && (
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-700">{t('projectDetail.projectMoneyReceived', 'Project Money Received')}</span>
              <div className="text-xl font-black text-emerald-900 mt-0.5">₹{summary.totalMoneyReceived?.toLocaleString('en-IN') || 0}</div>
              <span className="text-[10px] text-emerald-700 font-medium">{t('projectDetail.inflowsFromClient', 'Inflows from client')}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-700">{t('projectDetail.actualLaborCost', 'Actual Labor Cost')}</span>
              <div className="text-xl font-black text-amber-900 mt-0.5">₹{summary.totalLaborCost?.toLocaleString('en-IN') || 0}</div>
              <span className="text-[10px] text-amber-700 font-medium">{t('projectDetail.earnedByWorkforce', 'Earned by assigned workforce')}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-700">{t('projectDetail.netOperatingSurplus', 'Net Operating Surplus')}</span>
              <div className={`text-xl font-black mt-0.5 ${(summary.netOperatingSurplus || 0) >= 0 ? 'text-blue-900' : 'text-rose-700'}`}>
                ₹{summary.netOperatingSurplus?.toLocaleString('en-IN') || 0}
              </div>
              <span className="text-[10px] text-slate-700 font-medium">{t('projectDetail.moneyMinusLabor', 'Money Received - Labor Cost')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar scrollbar-none pb-0.5">
        {[
          { id: 'tasks', label: `${t('projectDetail.tasks', 'Furniture Tasks')} (${tasks.length})` },
          { id: 'workers', label: `${t('projectDetail.workforce', 'Assigned Workers')} (${assignments.length})` },
          ...(!isWorker ? [{ id: 'moneyReceived', label: `${t('projectDetail.moneyReceived', 'Money Received')} (${moneyReceived.length})` }] : []),
          { id: 'tools', label: `${t('projectDetail.tools', 'Tools at Site')} (${tools.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2.5 text-xs font-bold transition-all border-b-2 shrink-0 ${
              activeTab === tab.id
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-slate-700 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Tasks */}
      {activeTab === 'tasks' && (
        <Card>
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-700 italic">{t('projectDetail.noTasksCreated', 'No tasks created yet.')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks.map((taskItem) => (
                <div key={taskItem._id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" size="sm">{taskItem.taskType}</Badge>
                      <span className="font-bold text-slate-900 text-sm">{taskItem.furnitureItemName}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      {t('projectDetail.assignedCraftsman', 'Assigned:')} <strong className="text-slate-800">{taskItem.assignedWorkerId?.name || t('projectDetail.unassigned', 'Unassigned')}</strong> • {t('projectDetail.progressUnits', 'Progress: {completed} / {planned} {unit}').replace('{completed}', taskItem.completedUnits).replace('{planned}', taskItem.plannedUnits).replace('{unit}', taskItem.unitMetric || '')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {taskItem.status === 'COMPLETED' ? (
                      <Badge variant="warning" size="sm">{t('projectDetail.awaitingApprovalBadge', 'COMPLETED (Awaiting Approval ⏳)')}</Badge>
                    ) : (
                      <Badge variant={taskItem.status} size="sm">{taskItem.status}</Badge>
                    )}
                    {isThekedar && taskItem.status !== 'VERIFIED' && (
                      <Button
                        size="sm"
                        variant={taskItem.status === 'COMPLETED' ? 'success' : 'outline'}
                        className={taskItem.status === 'COMPLETED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}
                        onClick={() => handleVerifyTask(taskItem._id)}
                        icon={CheckCircle}
                      >
                        {taskItem.status === 'COMPLETED' ? t('projectDetail.approveAndVerify', 'Approve & Verify ✓') : t('projectDetail.verify', 'Verify')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Workers */}
      {activeTab === 'workers' && (
        <Card>
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('projectDetail.assignedWorkforceTitle', 'Assigned Craftsmen & Site Workforce')}</h3>
              <p className="text-xs text-slate-700">{t('projectDetail.assignedWorkforceSub', 'Deployments, project roles, and wage agreements for this furniture site.')}</p>
            </div>
            {isThekedar && (
              <Button size="sm" variant="primary" onClick={() => setAssignModalOpen(true)} icon={Users}>
                {t('projectDetail.assignWorker', 'Assign Worker')}
              </Button>
            )}
          </div>
          {assignments.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-700 italic">{t('projectDetail.noWorkersAssigned', 'No workers currently assigned to this project.')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {assignments.map((a) => (
                <div key={a._id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{a.workerId?.name}</h4>
                    <p className="text-xs text-slate-700">
                      {a.roleInProject} • Phone: {a.workerId?.phone}
                    </p>
                    <span className="text-[11px] font-semibold text-amber-800">
                      {a.wageOverride ? t('projectDetail.wageOverrideLabel', 'Wage Override: ₹{rate} / day').replace('{rate}', a.wageOverride) : t('projectDetail.standardBaseWage', 'Standard Base Wage')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success" size="sm">{t('common.active', 'ACTIVE')}</Badge>
                    {isThekedar && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAssignmentToShift(a);
                            setShiftRole(a.roleInProject || 'Master Carpenter');
                            setShiftWageOverride(a.wageOverride ? String(a.wageOverride) : '');
                            const other = allProjects.find((p) => p._id !== projectId);
                            if (other) setShiftTargetProjectId(other._id);
                            setShiftModalOpen(true);
                          }}
                          icon={ArrowRightLeft}
                          title={t('projectDetail.shiftWorker', 'Shift craftsman to another project site')}
                        >
                          {t('projectDetail.shiftProject', 'Shift Project')}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setSelectedAssignmentToRemove(a);
                            setRemoveModalOpen(true);
                          }}
                          icon={Trash2}
                          title={t('projectDetail.removeWorker', 'Remove craftsman from this project')}
                        >
                          {t('projectDetail.remove', 'Remove')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Money Received */}
      {activeTab === 'moneyReceived' && !isWorker && (
        <Card>
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('projectDetail.moneyReceivedTitle', 'Project Money Received')}</h3>
              <p className="text-xs text-slate-700">{t('projectDetail.moneyReceivedSub', 'Client milestone disbursements, booking advances, and progress payments.')}</p>
            </div>
            {isThekedar && (
              <Button size="xs" variant="primary" onClick={() => setMoneyModalOpen(true)} icon={Plus}>
                {t('projectDetail.recordPayment', 'Record Payment')}
              </Button>
            )}
          </div>
          {moneyReceived.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-700 italic">{t('projectDetail.noPaymentsRecorded', 'No payments recorded from client yet.')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {moneyReceived.map((rec) => (
                <div key={rec._id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-800">{rec.receiptCode}</span>
                      <Badge variant="success" size="sm">{rec.stage || 'Payment'}</Badge>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{rec.payerName || project?.clientName}</h4>
                    <p className="text-xs text-slate-700">
                      Method: <strong>{rec.paymentMethod}</strong> {rec.receiptReference ? `• Ref: ${rec.receiptReference}` : ''} • Date: {new Date(rec.receivedDate).toLocaleDateString()}
                    </p>
                    {rec.notes && <p className="text-[11px] text-slate-700 mt-0.5 italic">{rec.notes}</p>}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-950 text-base">₹{rec.amount.toLocaleString('en-IN')}</div>
                    <span className="text-[10px] text-emerald-800 font-semibold">{t('projectDetail.receivedInflow', 'Received Inflow')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Tools */}
      {activeTab === 'tools' && (
        <Card>
          {tools.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-700 italic">{t('projectDetail.noToolsDeployed', 'No tools deployed at this project site.')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {tools.map((toolItem) => (
                <div key={toolItem._id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-amber-700" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{toolItem.name}</h4>
                      <p className="text-xs text-slate-700">Code: {toolItem.toolCode} • Category: {toolItem.category}</p>
                    </div>
                  </div>
                  <Badge variant={toolItem.status} size="sm">{toolItem.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modal: Assign Worker */}
      <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title={t('projectDetail.assignModalTitle', 'Assign Worker to Project')}>
        <form onSubmit={handleAssignWorker} className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-950">
            <span className="font-bold">{t('projectDetail.permanentThekedarRule', 'Permanent Thekedar Rule:')} </span>
            {t('projectDetail.permanentThekedarDesc', 'Workers can only work on projects managed by their permanent Thekedar ({thekedar}).').replace('{thekedar}', project?.thekedarId?.name || 'Contractor')}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.selectWorker', 'Select Worker')}</label>
            {eligibleWorkers.length === 0 ? (
              <div className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {t('projectDetail.noCraftsmenRegistered', 'No craftsmen are registered under permanent Thekedar {thekedar}. A worker can only work under their permanent Thekedar.').replace('{thekedar}', project?.thekedarId?.name || 'this contractor')}
              </div>
            ) : (
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                {eligibleWorkers.map((w) => {
                  const wId = w.userId?._id || w._id;
                  const wName = w.userId?.name || w.name || 'Worker';
                  const wCode = w.workerCode || '';
                  return (
                    <option key={wId} value={wId}>
                      {wName} {wCode ? `(${wCode})` : ''} - Standard Wage ₹{w.defaultDailyWage}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.roleInProject', 'Role in Project')}</label>
            <input
              type="text"
              required
              value={roleInProject}
              onChange={(e) => setRoleInProject(e.target.value)}
              placeholder={t('projectDetail.rolePlaceholder', 'e.g. Master Carpenter, Edge Bander Operator')}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.dailyWageOverrideOptional', 'Daily Wage Override (Optional)')}</label>
            <input
              type="number"
              value={wageOverride}
              onChange={(e) => setWageOverride(e.target.value)}
              placeholder={t('projectDetail.wageOverridePlaceholder', 'Leave blank to use worker standard wage')}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit">{t('projectDetail.assignWorker', 'Assign Worker')}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Task */}
      <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title={t('projectDetail.taskModalTitle', 'Add Furniture Craft Task')}>
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.taskDescriptionLabel', 'Furniture Item & Task Description')}</label>
            <input
              type="text"
              required
              value={furnitureItemName}
              onChange={(e) => setFurnitureItemName(e.target.value)}
              placeholder={t('projectDetail.taskDescPlaceholder', 'e.g. Overhead Glass Cabinets Assembly')}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.taskStage', 'Task Stage')}</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="CUTTING">Cutting</option>
                <option value="EDGE_BANDING">Edge Banding</option>
                <option value="ASSEMBLY">Assembly</option>
                <option value="FITTING">Fitting</option>
                <option value="POLISHING">Polishing</option>
                <option value="INSTALLATION">Installation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.assignedWorker', 'Assigned Worker')}</label>
              <select
                value={assignedWorkerId}
                onChange={(e) => setAssignedWorkerId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="">{t('projectDetail.noneTeam', 'None / Team')}</option>
                {assignments.map((a) => (
                  <option key={a.workerId?._id} value={a.workerId?._id}>
                    {a.workerId?.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.plannedQuantity', 'Planned Quantity')}</label>
              <input
                type="number"
                min="1"
                required
                value={plannedUnits}
                onChange={(e) => setPlannedUnits(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.unitMetric', 'Unit Metric')}</label>
              <input
                type="text"
                value={unitMetric}
                onChange={(e) => setUnitMetric(e.target.value)}
                placeholder={t('projectDetail.unitPlaceholder', 'Units / Running Ft / Sq.Ft')}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTaskModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit">{t('projectDetail.createTaskBtn', 'Create Task')}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Money Received */}
      <Modal isOpen={moneyModalOpen} onClose={() => setMoneyModalOpen(false)} title={t('projectDetail.recordMoneyModalTitle', 'Record Project Money Received')}>
        <form onSubmit={handleRecordMoneyReceived} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.amountReceivedLabel', 'Amount Received (INR ₹) *')}</label>
            <input
              type="number"
              required
              step="0.01"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.milestoneStage', 'Milestone / Stage')}</label>
              <select
                value={receivedStage}
                onChange={(e) => setReceivedStage(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="Advance Booking">Advance Booking</option>
                <option value="Material Delivery">Material Delivery</option>
                <option value="Carcass Assembly">Carcass Assembly</option>
                <option value="Shutter & Fitting">Shutter & Fitting</option>
                <option value="Polishing & Finishing">Polishing & Finishing</option>
                <option value="Final Handover">Final Handover</option>
                <option value="Part Payment">Part Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.paymentMethod', 'Payment Method')}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="BANK_TRANSFER">{t('finance.bankTransfer', 'Bank Transfer (NEFT/IMPS)')}</option>
                <option value="UPI">{t('finance.upi', 'UPI')}</option>
                <option value="CASH">{t('finance.cash', 'Cash')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.payerName', 'Payer Name')}</label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder={project?.clientName || t('projectDetail.payerPlaceholder', 'e.g. Client Name')}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.receiptRefLabel', 'UTR / Cheque / Receipt Ref')}</label>
              <input
                type="text"
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                placeholder={t('projectDetail.receiptRefPlaceholder', 'e.g. UTR-99882211')}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.notesRemarks', 'Notes / Remarks')}</label>
            <input
              type="text"
              value={moneyNotes}
              onChange={(e) => setMoneyNotes(e.target.value)}
              placeholder={t('projectDetail.notesPlaceholder', 'e.g. First installment received via bank transfer')}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMoneyModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit">{t('projectDetail.recordPayment', 'Record Payment')}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Shift Worker to Another Project */}
      <Modal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title={selectedAssignmentToShift ? t('projectDetail.shiftModalTitle', 'Shift {name} to Another Project').replace('{name}', selectedAssignmentToShift.workerId?.name || '') : t('projectDetail.shiftGenericTitle', 'Shift Worker')}
      >
        {selectedAssignmentToShift && (
          <form onSubmit={handleShiftWorker} className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              {t('projectDetail.transferringAlert', 'Transferring craftsman {name} from current project {project}.')
                .replace('{name}', selectedAssignmentToShift.workerId?.name || '')
                .replace('{project}', project?.name || '')}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.destProject', 'Destination Furniture Project *')}</label>
              {eligibleShiftProjects.length === 0 ? (
                <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                  {t('projectDetail.noDestProjects', 'No other active projects exist under permanent Thekedar {thekedar}. A worker can only work on projects of their permanent Thekedar.').replace('{thekedar}', project?.thekedarId?.name || 'this contractor')}
                </div>
              ) : (
                <select
                  required
                  value={shiftTargetProjectId}
                  onChange={(e) => setShiftTargetProjectId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
                >
                  {eligibleShiftProjects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.projectCode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.roleOnNewProject', 'Role on New Project')}</label>
                <select
                  value={shiftRole}
                  onChange={(e) => setShiftRole(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
                >
                  <option value="Master Assembly Carpenter">Master Assembly Carpenter</option>
                  <option value="Wardrobe Frame Fitter">Wardrobe Frame Fitter</option>
                  <option value="Edge Bander Operator">Edge Bander Operator</option>
                  <option value="Sliding Track Specialist">Sliding Track Specialist</option>
                  <option value="PU Finish Polisher">PU Finish Polisher</option>
                  <option value="Modular Kitchen Carcass Fitter">Modular Kitchen Carcass Fitter</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.dailyWageOverrideNew', 'Daily Wage Override (₹ optional)')}</label>
                <input
                  type="number"
                  value={shiftWageOverride}
                  onChange={(e) => setShiftWageOverride(e.target.value)}
                  placeholder={selectedAssignmentToShift.wageOverride ? String(selectedAssignmentToShift.wageOverride) : t('projectDetail.standardBaseWage', 'Standard Wage')}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projectDetail.shiftReasonLabel', 'Shift Reason / Transfer Notes')}</label>
              <input
                type="text"
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder={t('projectDetail.shiftReasonPlaceholder', 'e.g. Urgent carcass assembly at Golf Links Penthouse')}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShiftModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit">{t('projectDetail.confirmShiftBtn', 'Confirm Shift to Destination')}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Remove / Unassign Worker */}
      <Modal
        isOpen={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        title={t('projectDetail.removeModalTitle', 'Remove Craftsman from Project Site')}
      >
        {selectedAssignmentToRemove && (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
              <div className="font-bold text-sm mb-1 text-rose-950">{t('projectDetail.confirmUnassignmentTitle', 'Confirm Unassignment')}</div>
              {t('projectDetail.confirmUnassignDesc', 'Are you sure you want to remove {worker} from {project}? The worker will no longer be deployed at this site and their assignment record will be removed.')
                .replace('{worker}', selectedAssignmentToRemove.workerId?.name || '')
                .replace('{project}', project?.name || '')}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setRemoveModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button variant="danger" onClick={handleRemoveWorker}>{t('projectDetail.confirmRemoveWorkerBtn', 'Yes, Remove Worker')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
