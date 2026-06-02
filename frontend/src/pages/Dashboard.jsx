import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Calendar, ArrowRight, Trash2, Layers, AlertTriangle, CheckCircle2, Clock, X, Search, MessageSquare, Target, Flame, ShieldAlert, Zap, TrendingUp, Paperclip } from 'lucide-react';
import { RoleContext, ToastContext, SyncContext } from '../App';
import { API_BASE_URL } from '../config';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newProject, setNewProject] = useState({ title: '', description: '', complexity_client: 'Medium', estimated_days_client: '', attachments: [], client: '', developers: [] });
  const [users, setUsers] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const body = { filename: file.name, base64_data: reader.result };
        const r = await fetch(API_BASE_URL + '/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) {
          const { url } = await r.json();
          setNewProject(prev => ({ ...prev, attachments: [...(prev.attachments || []), url] }));
          showToast('File attached', 'success');
        }
      } catch (err) { showToast('Upload failed', 'error'); }
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { role, user } = useContext(RoleContext);
  const { showToast } = useContext(ToastContext);
  const { syncKey } = useContext(SyncContext);

  useEffect(() => {
    fetchProjects();
    fetchActivity();
    fetchUsers();
  }, [syncKey]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(API_BASE_URL + '/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(API_BASE_URL + '/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchActivity = async () => {
    try {
      const res = await fetch(API_BASE_URL + '/api/activity?limit=15');
      if (res.ok) setActivities(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newProject };
      if (role === 'AAW') payload.client = user.username;
      
      const res = await fetch(API_BASE_URL + '/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setProjects([created, ...projects]);
        setIsModalOpen(false);
        setNewProject({ title: '', description: '', complexity_client: 'Medium', estimated_days_client: '', attachments: [], client: '', developers: [] });
        showToast(`Project "${created.title}" created!`, 'success');
      }
    } catch (e) { showToast('Failed to create project.', 'error'); }
  };

  const handleDeleteProject = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
        setDeleteConfirm(null);
        showToast('Project deleted.', 'success');
      }
    } catch (e) { showToast('Failed to delete.', 'error'); }
  };

  // Computed KPIs
  const allRequests = projects.flatMap(p => p.change_requests || []);
  const totalProjects = projects.length;
  const openRequests = allRequests.filter(r => r.status !== 'Completed').length;
  const criticalItems = allRequests.filter(r => r.priority === 'Critical' && r.status !== 'Completed').length;
  const completedRequests = allRequests.filter(r => r.status === 'Completed').length;
  const completionRate = allRequests.length > 0 ? Math.round((completedRequests / allRequests.length) * 100) : 0;
  const blockedCount = allRequests.filter(r => r.is_blocked).length;
  const escalatedCount = allRequests.filter(r => r.escalated).length;
  const totalHours = allRequests.reduce((sum, r) => sum + (r.hours_spent || 0), 0);

  // Role-specific data
  const myAssigned = allRequests.filter(r => r.assigned_to && r.status !== 'Completed');
  const myBlocked = allRequests.filter(r => r.is_blocked && r.status !== 'Completed');
  const awaitingEstimate = allRequests.filter(r => r.estimated_days_client && !r.estimated_days_dev && r.status !== 'Completed');
  const pendingAgreement = allRequests.filter(r => r.estimated_days_client && r.estimated_days_dev && !r.agreed_days && r.status !== 'Completed');

  // Search filter
  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActivityIcon = (type) => {
    if (type === 'comment') return <MessageSquare size={14} />;
    if (type === 'completed') return <CheckCircle2 size={14} />;
    return <Zap size={14} />;
  };

  const getActivityColor = (type) => {
    if (type === 'comment') return 'var(--status-info)';
    if (type === 'completed') return 'var(--status-success)';
    return 'var(--accent-primary)';
  };

  const roleGreeting = role === 'AAW' ? 'Welcome back! Here\'s your project overview.' :
    role === 'Cozentus' ? 'Your development workspace — track assigned work and progress.' :
    'Team overview — monitor performance and project health.';

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center mb-6 flex-wrap" style={{ gap: '16px' }}>
        <div style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
          <h1 className="gradient-text" style={{ fontSize: '2.25rem', marginBottom: '4px' }}>
            {role === 'Manager' ? 'Team Dashboard' : role === 'Cozentus' ? 'Dev Workspace' : 'Projects Dashboard'}
          </h1>
          <p className="text-muted" style={{ fontSize: '0.95rem' }}>{roleGreeting}</p>
        </div>
        <div className="flex items-center gap-3" style={{ animation: 'fadeSlideUp 0.4s ease-out 0.1s both' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input
              type="text" placeholder="Search projects..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px', width: '220px', padding: '9px 14px 9px 36px', fontSize: '0.88rem' }}
            />
          </div>
          {(role === 'AAW' || role === 'Manager') && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} /> New Project
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Stats ── */}
      <div className="kpi-grid mb-6">
        <div className="kpi-card kpi-indigo">
          <div className="kpi-info">
            <span className="kpi-label">Projects</span>
            <span className="kpi-value">{totalProjects}</span>
            <span className="kpi-sub">Active initiatives</span>
          </div>
          <div className="kpi-icon-wrap"><Layers size={22} /></div>
        </div>
        <div className="kpi-card kpi-blue">
          <div className="kpi-info">
            <span className="kpi-label">Open Requests</span>
            <span className="kpi-value">{openRequests}</span>
            <span className="kpi-sub">Pending & in progress</span>
          </div>
          <div className="kpi-icon-wrap"><Clock size={22} /></div>
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-info">
            <span className="kpi-label">{blockedCount > 0 ? 'Blocked' : 'Critical'}</span>
            <span className="kpi-value">{blockedCount > 0 ? blockedCount : criticalItems}</span>
            <span className="kpi-sub">{blockedCount > 0 ? 'Items blocked' : 'Needs attention'}</span>
          </div>
          <div className="kpi-icon-wrap">{blockedCount > 0 ? <ShieldAlert size={22} /> : <AlertTriangle size={22} />}</div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-info">
            <span className="kpi-label">Completion</span>
            <span className="kpi-value">{completionRate}%</span>
            <span className="kpi-sub">{completedRequests} of {allRequests.length} resolved</span>
          </div>
          <div className="kpi-icon-wrap"><CheckCircle2 size={22} /></div>
        </div>
      </div>

      {/* ── Role-Specific Panels ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', marginBottom: '32px' }}>
        {/* Left: Projects */}
        <div>
          {/* Quick Action Panels */}
          {role === 'Cozentus' && myAssigned.length > 0 && (
            <div className="glass-panel mb-6" style={{ padding: '20px 24px', animation: 'fadeSlideUp 0.4s ease-out 0.1s both' }}>
              <h3 className="flex items-center gap-2" style={{ fontSize: '1rem', marginBottom: '14px' }}>
                <Target size={18} color="var(--accent-primary)" /> My Assigned Work
                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', background: 'var(--accent-primary-light)', padding: '2px 10px', borderRadius: 'var(--radius-full)' }}>{myAssigned.length}</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myAssigned.slice(0, 4).map(req => (
                  <div key={req.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onClick={() => navigate(`/projects/${req.project_id}`)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(79,70,229,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.title}</div>
                      <div className="flex items-center gap-3" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span className={`badge badge-${req.status.toLowerCase().replace(' ', '-')}`} style={{ padding: '1px 8px', fontSize: '0.65rem' }}>{req.status}</span>
                        {req.progress_percent > 0 && <span>{req.progress_percent}%</span>}
                        {req.is_blocked && <span style={{ color: 'var(--status-danger)', fontWeight: 700 }}>🚫 Blocked</span>}
                      </div>
                    </div>
                    <ArrowRight size={14} color="var(--text-faint)" />
                  </div>
                ))}
                {myAssigned.length > 4 && <div className="text-muted text-center" style={{ fontSize: '0.8rem', padding: '4px' }}>+{myAssigned.length - 4} more items</div>}
              </div>
            </div>
          )}

          {role === 'AAW' && pendingAgreement.length > 0 && (
            <div className="glass-panel mb-6" style={{ padding: '20px 24px', borderLeft: '4px solid var(--status-warning)', animation: 'fadeSlideUp 0.4s ease-out 0.1s both' }}>
              <h3 className="flex items-center gap-2" style={{ fontSize: '1rem', marginBottom: '14px' }}>
                <AlertTriangle size={18} color="var(--status-warning)" /> Pending Estimation Agreement
                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 700, color: 'var(--status-warning)', background: 'var(--status-warning-bg)', padding: '2px 10px', borderRadius: 'var(--radius-full)' }}>{pendingAgreement.length}</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingAgreement.slice(0, 3).map(req => (
                  <div key={req.id} onClick={() => navigate(`/projects/${req.project_id}`)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--status-warning)', marginTop: '2px' }}>
                        Client: {req.estimated_days_client}d · Dev: {req.estimated_days_dev}d — needs agreement
                      </div>
                    </div>
                    <ArrowRight size={14} color="var(--status-warning)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {role === 'Manager' && (
            <div className="glass-panel mb-6" style={{ padding: '20px 24px', animation: 'fadeSlideUp 0.4s ease-out 0.1s both' }}>
              <h3 className="flex items-center gap-2" style={{ fontSize: '1rem', marginBottom: '14px' }}>
                <TrendingUp size={18} color="var(--accent-primary)" /> Executive Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Escalated', value: escalatedCount, color: 'var(--status-danger)', bg: 'var(--status-danger-bg)' },
                  { label: 'Blocked', value: blockedCount, color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
                  { label: 'Hours Logged', value: `${Math.round(totalHours)}h`, color: 'var(--accent-primary)', bg: 'var(--accent-primary-light)' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: s.bg, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {awaitingEstimate.length > 0 && (
                <div style={{ marginTop: '14px', padding: '10px 14px', background: 'var(--status-info-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-info-border)', fontSize: '0.85rem', color: 'var(--status-info)', fontWeight: 600 }}>
                  📋 {awaitingEstimate.length} request{awaitingEstimate.length > 1 ? 's' : ''} awaiting dev estimation
                </div>
              )}
            </div>
          )}

          {/* Project Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredProjects.map(project => {
              const requests = project.change_requests || [];
              const totalReqs = requests.length;
              const completedReqs = requests.filter(r => r.status === 'Completed').length;
              const progressPct = totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0;
              const hasProjectBlockers = (project.blockers || []).some(b => b.status === 'Active');
              const hasBlocked = requests.some(r => r.is_blocked && r.status !== 'Completed') || hasProjectBlockers;
              const hasEscalated = requests.some(r => r.escalated && r.status !== 'Completed');

              let healthColor = '#059669', healthText = 'On Track (Green)', healthBg = 'var(--status-success-bg)', calendarHealth = 'Green';
              let daysRemaining = null;

              if (project.deadline) {
                const deadlineDate = new Date(project.deadline);
                const now = new Date();
                const diffTime = deadlineDate - now;
                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (daysRemaining <= 2) {
                  calendarHealth = 'Red';
                  healthColor = '#DC2626';
                  healthBg = 'var(--status-danger-bg)';
                  healthText = daysRemaining < 0 ? 'Overdue' : 'Critical (Red)';
                } else if (daysRemaining <= 4) {
                  calendarHealth = 'Amber';
                  healthColor = '#D97706';
                  healthBg = 'var(--status-warning-bg)';
                  healthText = 'Warning (Amber)';
                } else {
                  calendarHealth = 'Green';
                  healthColor = '#059669';
                  healthBg = 'var(--status-success-bg)';
                  healthText = 'On Track (Green)';
                }
              } else {
                if (requests.length > 0 || hasProjectBlockers) {
                  const incomplete = requests.filter(r => r.status !== 'Completed');
                  if (incomplete.length > 0 || hasProjectBlockers) {
                    if (hasBlocked || hasEscalated) {
                      healthColor = '#DC2626'; healthText = hasBlocked ? 'Blocked' : 'Escalated'; healthBg = 'var(--status-danger-bg)';
                      calendarHealth = 'Red';
                    } else if (incomplete.some(r => r.priority === 'Critical')) {
                      healthColor = '#DC2626'; healthText = 'Critical'; healthBg = 'var(--status-danger-bg)';
                      calendarHealth = 'Red';
                    } else {
                      healthColor = '#D97706'; healthText = 'In Progress'; healthBg = 'var(--status-warning-bg)';
                      calendarHealth = 'Amber';
                    }
                  } else {
                    healthText = 'All Done';
                    healthBg = 'var(--status-success-bg)';
                    healthColor = '#059669';
                    calendarHealth = 'Green';
                  }
                }
              }

              return (
                <div key={project.id} className="glass-card stagger-card" onClick={() => navigate(`/projects/${project.id}`)} style={{ 
                  borderTop: `4px solid ${healthColor}`, 
                  borderLeft: `1px solid ${calendarHealth === 'Red' ? 'rgba(220, 38, 38, 0.3)' : calendarHealth === 'Amber' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(5, 150, 105, 0.3)'}`,
                  borderRight: `1px solid ${calendarHealth === 'Red' ? 'rgba(220, 38, 38, 0.3)' : calendarHealth === 'Amber' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(5, 150, 105, 0.3)'}`,
                  borderBottom: `1px solid ${calendarHealth === 'Red' ? 'rgba(220, 38, 38, 0.3)' : calendarHealth === 'Amber' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(5, 150, 105, 0.3)'}`,
                  background: calendarHealth === 'Red' 
                    ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.7) 0%, var(--bg-secondary) 100%)' 
                    : calendarHealth === 'Amber' 
                    ? 'linear-gradient(135deg, rgba(255, 251, 235, 0.7) 0%, var(--bg-secondary) 100%)' 
                    : 'linear-gradient(135deg, rgba(240, 253, 250, 0.7) 0%, var(--bg-secondary) 100%)',
                  boxShadow: calendarHealth === 'Red' 
                    ? '0 8px 30px rgba(220, 38, 38, 0.05)' 
                    : calendarHealth === 'Amber' 
                    ? '0 8px 30px rgba(217, 119, 6, 0.03)' 
                    : '0 8px 30px rgba(5, 150, 105, 0.03)',
                  padding: '24px' 
                }}>
                  <div className="flex justify-between items-start mb-3">
                    <div style={{ background: 'var(--accent-primary-light)', padding: '10px', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)' }}>
                      <FolderOpen size={22} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: 'var(--radius-full)', background: healthBg, fontSize: '0.72rem', fontWeight: 700, color: healthColor }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: healthColor }} />
                        {healthText}
                      </div>
                      {role === 'AAW' && (
                        <button className="btn btn-danger btn-icon" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: project.id, title: project.title }); }} title="Delete" style={{ padding: '5px' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', letterSpacing: '-0.02em' }}>{project.title}</h3>
                  <p className="text-muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '14px' }}>{project.description}</p>
                  {totalReqs > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div className="flex justify-between items-center mb-1">
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Progress</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{completedReqs}/{totalReqs}</span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg, ${healthColor}, ${healthColor}dd)`, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-end" style={{ marginTop: '14px' }}>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted flex items-center gap-1.5" style={{ fontSize: '0.73rem', fontWeight: 500 }}>
                        <Calendar size={12} /> Created: {new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {project.deadline && (
                        <span className="flex items-center gap-1.5" style={{ fontSize: '0.75rem', fontWeight: 700, color: healthColor }}>
                          ⏱️ Deadline: {new Date(project.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {daysRemaining !== null && (
                            <span style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 500 }}>
                              ({daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 600 }} className="flex items-center gap-1">View <ArrowRight size={14} /></span>
                  </div>
                </div>
              );
            })}
            {filteredProjects.length === 0 && (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '56px 32px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  {searchQuery ? <Search size={28} color="var(--accent-primary)" /> : <FolderOpen size={28} color="var(--accent-primary)" />}
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{searchQuery ? 'No matching projects' : 'No projects yet'}</h3>
                <p className="text-muted" style={{ marginBottom: '20px', maxWidth: '340px', margin: '0 auto 20px' }}>
                  {searchQuery ? 'Try a different search term.' : 'Create your first project to get started.'}
                </p>
                {!searchQuery && role === 'AAW' && (
                  <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Create Project</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Activity Feed */}
        <div>
          <div className="glass-panel" style={{ padding: '20px', position: 'sticky', top: '84px', animation: 'fadeSlideUp 0.4s ease-out 0.2s both' }}>
            <h3 className="flex items-center gap-2" style={{ fontSize: '1rem', marginBottom: '16px' }}>
              <Zap size={18} color="var(--accent-primary)" /> Recent Activity
            </h3>
            {activities.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '32px 0', fontSize: '0.88rem' }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {activities.slice(0, 12).map((act, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '12px', padding: '10px 0',
                    borderBottom: i < activities.length - 1 && i < 11 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: act.type === 'completed' ? 'var(--status-success-bg)' : act.type === 'comment' ? 'var(--status-info-bg)' : 'var(--accent-primary-light)',
                      color: getActivityColor(act.type),
                    }}>
                      {getActivityIcon(act.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-main)', lineHeight: 1.4 }}>
                        {act.type === 'comment' && <span style={{ fontWeight: 700, color: getActivityColor(act.type) }}>{act.author}</span>}
                        {act.type === 'comment' ? ' commented on ' : act.type === 'completed' ? '✓ ' : '⚡ '}
                        <span style={{ fontWeight: 600 }}>{act.request_title}</span>
                      </div>
                      {act.type === 'comment' && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          "{act.detail}"
                        </div>
                      )}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '3px' }}>
                        {act.project} · {new Date(act.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Project Modal ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content huge">
            <div className="modal-header-bar" />
            <div className="modal-header-content">
              <div className="flex justify-between items-start">
                <div>
                  <h2 style={{ marginBottom: '4px', fontSize: '1.3rem' }}>Create New Project</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>Define the project scope and objectives.</p>
                </div>
                <button className="btn-ghost btn-icon" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
              </div>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="modal-body-content">
                <div className="form-group">
                  <label className="form-label">Project Title</label>
                  <input type="text" className="form-control" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} required placeholder="e.g. E-Commerce Redesign" style={{ fontSize: '1.05rem', padding: '14px 16px' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Detailed Requirement <span style={{fontSize:'0.75rem', fontWeight:'normal', color:'var(--text-faint)', marginLeft:'6px'}}>(Markdown supported)</span></label>
                  <textarea className="form-control outlook-style" value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} required placeholder="Describe the project goals, scope, deliverables, and any relevant context..." />
                </div>
                <div className="flex gap-4 mb-4">
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Complexity</label>
                    <select className="form-control" value={newProject.complexity_client} onChange={e => setNewProject({ ...newProject, complexity_client: e.target.value })}>
                      <option>Low</option><option>Medium</option><option>High</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Your Estimate (days)</label>
                    <input type="number" className="form-control" min="1" max="999" placeholder="e.g. 14" value={newProject.estimated_days_client} onChange={e => setNewProject({ ...newProject, estimated_days_client: e.target.value })} />
                  </div>
                </div>

                {role === 'Manager' && (
                  <div className="form-group mb-4">
                    <label className="form-label">Assign Client</label>
                    <select className="form-control" value={newProject.client} onChange={e => setNewProject({...newProject, client: e.target.value})}>
                      <option value="">-- Select Client --</option>
                      {users.filter(u => u.role === 'AAW').map(u => <option key={u.username} value={u.username}>{u.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="form-group mb-4">
                  <label className="form-label">Assign Developers</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {users.filter(u => u.role === 'Cozentus').map(u => (
                      <label key={u.username} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: newProject.developers.includes(u.username) ? 'var(--accent-primary-light)' : 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', cursor: 'pointer', border: `1px solid ${newProject.developers.includes(u.username) ? 'var(--accent-primary)' : 'var(--border-subtle)'}`, fontSize: '0.85rem' }}>
                        <input type="checkbox" style={{ display: 'none' }} checked={newProject.developers.includes(u.username)} onChange={e => {
                          if (e.target.checked) setNewProject({...newProject, developers: [...newProject.developers, u.username]});
                          else setNewProject({...newProject, developers: newProject.developers.filter(d => d !== u.username)});
                        }} />
                        {u.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label flex justify-between items-center">
                    <span>Attachments</span>
                    <label style={{ cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Paperclip size={14} /> Add File
                      <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,.xlsx" />
                    </label>
                  </label>
                  {newProject.attachments && newProject.attachments.length > 0 ? (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {newProject.attachments.map((a, i) => (
                        <a key={i} href={a} target="_blank" rel="noreferrer" className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                          <Paperclip size={12} /> Attachment {i + 1}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>No attachments yet.</div>
                  )}
                </div>
              </div>
              <div className="modal-footer-content flex justify-between">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={16} /> Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="confirm-dialog">
              <div className="confirm-icon confirm-icon-warning"><AlertTriangle size={28} /></div>
              <div className="confirm-title">Delete Project?</div>
              <div className="confirm-text">Permanently delete <strong>"{deleteConfirm.title}"</strong>? This cannot be undone.</div>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDeleteProject(deleteConfirm.id)} style={{ background: 'var(--status-danger)', color: '#FFF', borderColor: 'var(--status-danger)' }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
