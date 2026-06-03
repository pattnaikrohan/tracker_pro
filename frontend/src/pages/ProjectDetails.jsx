import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, CheckCircle2, AlertCircle, AlertTriangle, MessageSquare, X, Flame, ArrowUp, Minus, ArrowDown, Send, Calendar, User, Target, TrendingUp, FileText, Handshake, ShieldAlert, Zap, Timer, Tag, ThumbsUp, ThumbsDown, Paperclip, Plus, Trash2, Activity } from 'lucide-react';
import { RoleContext, ToastContext, SyncContext } from '../App';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE_URL } from '../config';

const PRIORITY_CONFIG = {
  Critical: { icon: <Flame size={13} />, class: 'priority-critical', color: '#DC2626' },
  High: { icon: <ArrowUp size={13} />, class: 'priority-high', color: '#EA580C' },
  Medium: { icon: <Minus size={13} />, class: 'priority-medium', color: '#D97706' },
  Low: { icon: <ArrowDown size={13} />, class: 'priority-low', color: '#059669' },
};

const STATUS_COLORS = {
  Pending: { border: 'var(--text-faint)', bg: 'var(--bg-subtle)' },
  'In Progress': { border: 'var(--status-info)', bg: 'var(--status-info-bg)' },
  Completed: { border: 'var(--status-success)', bg: 'var(--status-success-bg)' },
};

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useContext(RoleContext);
  const { showToast } = useContext(ToastContext);

  const [project, setProject] = useState(null);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('kanban'); // 'list' | 'kanban'
  const [draggedItem, setDraggedItem] = useState(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({ title: '', request_text: '', priority: 'Medium', type: 'Enhancement', deadline: '', estimated_days_client: '', complexity_client: 'Medium', attachments: [] });

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updateData, setUpdateData] = useState({});
  const [newComment, setNewComment] = useState('');
  const [resolveConfirm, setResolveConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [newSubtask, setNewSubtask] = useState('');
  
  // Advanced filters
  const [advAssignee, setAdvAssignee] = useState('');
  const [advPriority, setAdvPriority] = useState('');
  const [advTags, setAdvTags] = useState('');

  const [isRejectingDays, setIsRejectingDays] = useState(false);
  const [isRejectingComplexity, setIsRejectingComplexity] = useState(false);
  const [suggestedDays, setSuggestedDays] = useState('');
  const [suggestedComplexity, setSuggestedComplexity] = useState('');

  const [blockers, setBlockers] = useState([]);
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [newBlocker, setNewBlocker] = useState({ title: '', description: '', severity: 'High', related_request_title: '' });
  
  const [selectedBlocker, setSelectedBlocker] = useState(null);
  const [isBlockerDiscussionModalOpen, setIsBlockerDiscussionModalOpen] = useState(false);
  const [newBlockerComment, setNewBlockerComment] = useState('');
  const [activeBlockerTab, setActiveBlockerTab] = useState('details');

  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editProjectData, setEditProjectData] = useState({ description: '', manual_health: 'Auto' });

  const { syncKey, typingUsers, sendTyping } = useContext(SyncContext);
  const location = useLocation();

  useEffect(() => { fetchProjectDetails(); fetchRequests(); fetchBlockers(); }, [id, syncKey]);

  // Deep linking for notifications
  useEffect(() => {
    if (requests.length > 0 || blockers.length > 0) {
      const searchParams = new URLSearchParams(location.search);
      const reqIdParam = searchParams.get('request');
      const blockerIdParam = searchParams.get('blocker');
      
      if (reqIdParam) {
        const found = requests.find(r => r.id.toString() === reqIdParam);
        if (found && (!selectedRequest || selectedRequest.id !== found.id)) {
          openUpdateModal(found);
          navigate(`/projects/${id}`, { replace: true });
        }
      } else if (blockerIdParam) {
        const found = blockers.find(b => b.id.toString() === blockerIdParam);
        if (found && (!selectedBlocker || selectedBlocker.id !== found.id)) {
          handleOpenBlockerDiscussion(found);
          navigate(`/projects/${id}`, { replace: true });
        }
      }
    }
  }, [requests, blockers, location.search]);

  const fetchProjectDetails = async () => {
    try { const r = await fetch(`${API_BASE_URL}/api/projects/${id}`); if (r.ok) setProject(await r.json()); else if (r.status === 404) navigate('/'); } catch (e) { console.error(e); }
  };
  const fetchRequests = async () => {
    try { const r = await fetch(`${API_BASE_URL}/api/projects/${id}/requests`); if (r.ok) setRequests(await r.json()); } catch (e) { console.error(e); }
  };
  const fetchBlockers = async () => {
    try { const r = await fetch(`${API_BASE_URL}/api/projects/${id}/blockers`); if (r.ok) setBlockers(await r.json()); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedRequest) {
      const updatedReq = requests.find(r => r.id === selectedRequest.id);
      if (updatedReq && JSON.stringify(updatedReq) !== JSON.stringify(selectedRequest)) {
        setSelectedRequest(updatedReq);
      }
    }
  }, [requests, selectedRequest]);

  useEffect(() => {
    if (selectedBlocker) {
      const updatedBlocker = blockers.find(b => b.id === selectedBlocker.id);
      if (updatedBlocker && JSON.stringify(updatedBlocker) !== JSON.stringify(selectedBlocker)) {
        setSelectedBlocker(updatedBlocker);
      }
    }
  }, [blockers, selectedBlocker]);

  const handleSubmitBlocker = async (e) => {
    e.preventDefault();
    try {
      const r = await fetch(`${API_BASE_URL}/api/projects/${id}/blockers?role=${role}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBlocker) });
      if (r.ok) { setIsBlockerModalOpen(false); setNewBlocker({ title: '', description: '', severity: 'High', related_request_title: '' }); fetchBlockers(); fetchRequests(); showToast('Blocker reported!', 'error'); }
    } catch (e) { showToast('Failed to report blocker.', 'error'); }
  };

  const handleResolveBlocker = async (blockerId) => {
    try {
      if (selectedBlocker?.is_request || blockerId.toString().startsWith('req-')) {
        const reqId = selectedBlocker?.request_id || blockerId.replace('req-', '');
        const r = await fetch(`${API_BASE_URL}/api/requests/${reqId}?role=${role}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_blocked: false }) });
        if (r.ok) {
           if (selectedBlocker && selectedBlocker.id === blockerId) {
             setSelectedBlocker(prev => ({...prev, status: 'Resolved'}));
           }
           fetchRequests(); fetchBlockers(); showToast('Blocker resolved!', 'success');
        }
        return;
      }

      const r = await fetch(`${API_BASE_URL}/api/blockers/${blockerId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Resolved' }) });
      if (r.ok) { 
        const u = await r.json();
        if (selectedBlocker && selectedBlocker.id === blockerId) { setSelectedBlocker(u); }
        fetchBlockers(); fetchRequests(); showToast('Blocker resolved!', 'success'); 
      }
    } catch (e) { showToast('Failed to resolve blocker.', 'error'); }
  };

  const handleOpenBlockerDiscussion = (blocker) => {
    setSelectedBlocker(blocker);
    setIsBlockerDiscussionModalOpen(true);
    setActiveBlockerTab('details');
  };

  const handleArchiveProject = async () => {
    if (!window.confirm("Are you sure you want to archive this project? It will be removed from the active dashboard.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Archived' })
      });
      if (res.ok) {
        showToast('Project archived successfully', 'success');
        navigate('/');
      }
    } catch (e) {
      showToast('Failed to archive project', 'error');
    }
  };

  const handlePostBlockerComment = async () => {
    if (!newBlockerComment.trim()) return;
    try {
      let r;
      if (selectedBlocker.is_request) {
        r = await fetch(`${API_BASE_URL}/api/requests/${selectedBlocker.request_id}/blocker_comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_role: role, text: newBlockerComment }) });
      } else {
        r = await fetch(`${API_BASE_URL}/api/blockers/${selectedBlocker.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_role: role, text: newBlockerComment }) });
      }
      if (r.ok) { 
        const c = await r.json(); 
        setSelectedBlocker({ ...selectedBlocker, comments: [...(selectedBlocker.comments || []), c] }); 
        setNewBlockerComment(''); 
        fetchBlockers(); fetchRequests();
        showToast('Reply posted!', 'success'); 
      }
    } catch (e) { showToast('Failed.', 'error'); }
  };

  const getResolutionDays = (req) => {
    if (req.status !== 'Completed' || !req.completed_at || !req.created_at) return null;
    const diffTime = Math.abs(new Date(req.completed_at) - new Date(req.created_at));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    return diffDays;
  };

  const handleUpdateProject = async (updateData) => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/projects/${id}?role=${role}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData) });
      if (r.ok) {
         setProject(await r.json());
         showToast('Project updated!', 'success');
      }
    } catch(e) { showToast('Update failed.', 'error'); }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      const body = { title: newRequest.title, request_text: newRequest.request_text, priority: newRequest.priority, type: newRequest.type, deadline: newRequest.deadline || null, estimated_days_client: newRequest.estimated_days_client ? parseInt(newRequest.estimated_days_client) : null, complexity_client: newRequest.complexity_client, attachments: newRequest.attachments };
      const r = await fetch(`${API_BASE_URL}/api/projects/${id}/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { setIsSubmitModalOpen(false); setNewRequest({ title: '', request_text: '', priority: 'Medium', type: 'Enhancement', deadline: '', estimated_days_client: '', complexity_client: 'Medium', attachments: [] }); fetchRequests(); showToast('Request submitted!', 'success'); }
    } catch (e) { showToast('Failed to submit.', 'error'); }
  };

  const handleNewRequestFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const body = { filename: file.name, base64_data: reader.result };
        const r = await fetch(API_BASE_URL + '/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) {
          const { url } = await r.json();
          setNewRequest(prev => ({ ...prev, attachments: [...prev.attachments, url] }));
          showToast('File attached', 'success');
        }
      } catch (err) { showToast('Upload failed', 'error'); }
    };
    reader.readAsDataURL(file);
    e.target.value = null; // reset input
  };

  const handleUpdateRequest = async (e) => {
    e.preventDefault();
    
    if (updateData.status === 'Completed' && role !== 'AAW') {
      // Time tracking scrubbed
    }

    try {
      const body = {};
      if (updateData.status) body.status = updateData.status;
      if (updateData.complexity_client !== undefined) body.complexity_client = updateData.complexity_client;
      if (updateData.complexity_dev !== undefined) body.complexity_dev = updateData.complexity_dev;
      if (updateData.agreed_complexity !== undefined) body.agreed_complexity = updateData.agreed_complexity;
      if (updateData.complexity) body.complexity = updateData.complexity;
      if (updateData.estimated_days_dev !== undefined && updateData.estimated_days_dev !== '') body.estimated_days_dev = parseInt(updateData.estimated_days_dev);
      if (updateData.estimated_days_client !== undefined && updateData.estimated_days_client !== '') body.estimated_days_client = parseInt(updateData.estimated_days_client);
      if (updateData.agreed_days !== undefined && updateData.agreed_days !== '') body.agreed_days = parseInt(updateData.agreed_days);
      if (updateData.progress_percent !== undefined) body.progress_percent = parseInt(updateData.progress_percent);
      if (updateData.deadline) body.deadline = updateData.deadline;
      if (updateData.assigned_to !== undefined) body.assigned_to = updateData.assigned_to;
      if (updateData.dev_notes !== undefined) body.dev_notes = updateData.dev_notes;
      if (updateData.hours_spent !== undefined && updateData.hours_spent !== '') body.hours_spent = parseFloat(updateData.hours_spent);
      if (updateData.is_blocked !== undefined) body.is_blocked = updateData.is_blocked;
      if (updateData.blocker_reason !== undefined) body.blocker_reason = updateData.blocker_reason;
      if (updateData.client_approved_estimate !== undefined) body.client_approved_estimate = updateData.client_approved_estimate;
      if (updateData.escalated !== undefined) body.escalated = updateData.escalated;
      if (updateData.tags !== undefined) body.tags = updateData.tags;
      if (updateData.priority) body.priority = updateData.priority;

      const r = await fetch(`${API_BASE_URL}/api/requests/${selectedRequest.id}?role=${role}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { const u = await r.json(); setSelectedRequest(u); populateUpdateData(u); fetchRequests(); showToast('Updated!', 'success'); }
    } catch (e) { showToast('Failed.', 'error'); }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      const r = await fetch(`${API_BASE_URL}/api/requests/${selectedRequest.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_role: role, text: newComment }) });
      if (r.ok) { const c = await r.json(); setSelectedRequest({ ...selectedRequest, comments: [...(selectedRequest.comments || []), c] }); setNewComment(''); fetchRequests(); showToast('Reply posted!', 'success'); }
    } catch (e) { showToast('Failed.', 'error'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const body = { filename: file.name, base64_data: reader.result };
        const r = await fetch(API_BASE_URL + '/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) {
          const { url } = await r.json();
          const markdownLink = file.type.startsWith('image/') ? `\n![${file.name}](${url})\n` : `\n[📄 ${file.name}](${url})\n`;
          setNewComment(prev => prev + markdownLink);
          showToast('Attached to comment', 'success');
        }
      } catch (err) { showToast('Upload failed', 'error'); }
    };
    reader.readAsDataURL(file);
    e.target.value = null; // reset input
  };

  const handleCloseRequest = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/requests/${selectedRequest.id}?role=${role}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Completed' }) });
      if (r.ok) { const u = await r.json(); setSelectedRequest(u); populateUpdateData(u); fetchRequests(); setResolveConfirm(false); showToast('Resolved!', 'success'); }
    } catch (e) { showToast('Failed.', 'error'); }
  };

  const quickAction = async (field, value, reqId = selectedRequest?.id) => {
    if (!reqId) return;
    try {
      const body = { [field]: value };
      const r = await fetch(`${API_BASE_URL}/api/requests/${reqId}?role=${role}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { 
        const u = await r.json(); 
        if (selectedRequest && selectedRequest.id === reqId) { setSelectedRequest(u); populateUpdateData(u); }
        fetchRequests(); showToast(`Updated!`, 'success'); 
      }
    } catch (e) { showToast('Failed.', 'error'); }
  };

  const updateSubtasksAndProgress = async (newSubtasks) => {
    let progress_percent = selectedRequest.progress_percent || 0;
    if (newSubtasks.length > 0) {
      const completedCount = newSubtasks.filter(st => st.completed).length;
      progress_percent = Math.round((completedCount / newSubtasks.length) * 100);
    }
    try {
      const body = { subtasks: newSubtasks, progress_percent };
      const r = await fetch(`${API_BASE_URL}/api/requests/${selectedRequest.id}?role=${role}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { 
        const u = await r.json(); 
        setSelectedRequest(u); populateUpdateData(u);
        fetchRequests(); showToast(`Subtasks updated!`, 'success'); 
      }
    } catch (e) { showToast('Failed.', 'error'); }
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    const st = { id: Date.now().toString(), title: newSubtask, completed: false };
    const newArr = [...(selectedRequest.subtasks || []), st];
    updateSubtasksAndProgress(newArr);
    setNewSubtask('');
  };

  const handleToggleSubtask = (id) => {
    const newArr = (selectedRequest.subtasks || []).map(st => st.id === id ? { ...st, completed: !st.completed } : st);
    updateSubtasksAndProgress(newArr);
  };

  const handleDeleteSubtask = (id) => {
    const newArr = (selectedRequest.subtasks || []).filter(st => st.id !== id);
    updateSubtasksAndProgress(newArr);
  };

  const handleClientReject = async (type) => {
    if (type === 'days') {
      if (!suggestedDays) return showToast('Please enter suggested days', 'error');
      try {
        const body = { estimated_days_client: parseInt(suggestedDays), client_approved_estimate: false };
        const r = await fetch(`${API_BASE_URL}/api/requests/${selectedRequest.id}?role=${role}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        if (r.ok) {
          const u = await r.json();
          setSelectedRequest(u); populateUpdateData(u); fetchRequests();
          setIsRejectingDays(false);
          setSuggestedDays('');
          showToast('Suggestion sent to developer', 'info');
        }
      } catch (e) {}
    } else {
      if (!suggestedComplexity) return showToast('Please enter suggested complexity', 'error');
      try {
        const body = { complexity_client: suggestedComplexity, client_approved_estimate: false };
        const r = await fetch(`${API_BASE_URL}/api/requests/${selectedRequest.id}?role=${role}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        if (r.ok) {
          const u = await r.json();
          setSelectedRequest(u); populateUpdateData(u); fetchRequests();
          setIsRejectingComplexity(false);
          setSuggestedComplexity('');
          showToast('Suggestion sent to developer', 'info');
        }
      } catch (e) {}
    }
  };

  const handleClientForce = async (type) => {
    if (type === 'days') {
      if (!suggestedDays) return showToast('Please enter suggested days', 'error');
      try {
        const body = { agreed_days: parseInt(suggestedDays), client_approved_estimate: true };
        const r = await fetch(`${API_BASE_URL}/api/requests/${selectedRequest.id}?role=${role}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        await fetch(`${API_BASE_URL}/api/requests/${selectedRequest.id}/comments`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author_role: role, text: `@Developer The client has forcefully overridden the timeline to ${suggestedDays} days.` })
        });
        if (r.ok) {
          const u = await r.json();
          setSelectedRequest(u); populateUpdateData(u); fetchRequests();
          setIsRejectingDays(false);
          setSuggestedDays('');
          showToast('Timeline forcefully overridden!', 'success');
        }
      } catch (e) {}
    } else {
      if (!suggestedComplexity) return showToast('Please enter suggested complexity', 'error');
      try {
        const body = { agreed_complexity: suggestedComplexity, client_approved_estimate: true };
        const r = await fetch(`${API_BASE_URL}/api/requests/${selectedRequest.id}?role=${role}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        await fetch(`${API_BASE_URL}/api/requests/${selectedRequest.id}/comments`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author_role: role, text: `@Developer The client has forcefully overridden the complexity to ${suggestedComplexity}.` })
        });
        if (r.ok) {
          const u = await r.json();
          setSelectedRequest(u); populateUpdateData(u); fetchRequests();
          setIsRejectingComplexity(false);
          setSuggestedComplexity('');
          showToast('Complexity forcefully overridden!', 'success');
        }
      } catch (e) {}
    }
  };

  const handleDragStart = (e, req) => {
    setDraggedItem(req);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', req.id);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.status === newStatus) return;
    // Only Dev or Manager should move freely
    if (role === 'AAW') { showToast('Clients cannot update status.', 'error'); return; }

    if (newStatus === 'Completed' && role !== 'AAW') {
      // validation removed
    }

    quickAction('status', newStatus, draggedItem.id);
    setDraggedItem(null);
  };

  const populateUpdateData = (req) => {
    setUpdateData({
      status: req.status, priority: req.priority,
      complexity_client: req.complexity_client ?? '',
      complexity_dev: req.complexity_dev ?? '',
      agreed_complexity: req.agreed_complexity ?? '',
      estimated_days_client: req.estimated_days_client ?? '', estimated_days_dev: req.estimated_days_dev ?? '',
      agreed_days: req.agreed_days ?? '', progress_percent: req.progress_percent ?? 0,
      deadline: req.deadline || '', assigned_to: req.assigned_to || '', dev_notes: req.dev_notes || '',
      hours_spent: req.hours_spent ?? '', is_blocked: req.is_blocked || false, blocker_reason: req.blocker_reason || '',
      client_approved_estimate: req.client_approved_estimate ?? false, escalated: req.escalated || false, tags: req.tags || '',
    });
  };

  const openUpdateModal = (req) => { setSelectedRequest(req); populateUpdateData(req); setResolveConfirm(false); setNewComment(''); setActiveTab('details'); };
  const getPriorityBadge = (p) => { const c = PRIORITY_CONFIG[p] || PRIORITY_CONFIG.Medium; return <span className={`priority-indicator ${c.class}`}>{c.icon} {p}</span>; };
  const isOverdue = (req) => req.deadline && req.status !== 'Completed' && req.deadline < new Date().toISOString().split('T')[0];

  const getRequestShading = (req) => {
    const isCompleted = req.status === 'Completed';
    if (isCompleted) {
      return {
        borderLeftColor: 'var(--status-success)',
        background: '#FFFFFF',
        borderLeftWidth: '4px',
        shadow: 'var(--shadow-sm)',
        badgeColor: 'var(--status-success)',
        badgeText: 'Completed',
        badgeBg: 'var(--status-success-bg)'
      };
    }
    if (req.is_blocked) {
      return {
        borderLeftColor: 'var(--status-danger)',
        borderLeftWidth: '4px',
        background: 'linear-gradient(135deg, rgba(254, 242, 242, 0.7) 0%, #FFFFFF 100%)',
        shadow: '0 4px 15px rgba(220, 38, 38, 0.05)',
        badgeColor: 'var(--status-danger)',
        badgeText: '🚫 Blocked',
        badgeBg: 'var(--status-danger-bg)'
      };
    }
    if (!req.deadline) {
      return {
        borderLeftColor: 'var(--border-subtle)',
        borderLeftWidth: '4px',
        background: '#FFFFFF',
        shadow: 'var(--shadow-sm)',
        badgeColor: 'var(--text-muted)',
        badgeText: 'Pending Info',
        badgeBg: 'var(--bg-hover)'
      };
    }
    const deadlineDate = new Date(req.deadline);
    const now = new Date();
    const diffTime = deadlineDate - now;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 2) {
      return {
        borderLeftColor: 'var(--status-danger)',
        borderLeftWidth: '4px',
        background: 'linear-gradient(135deg, rgba(254, 242, 242, 0.7) 0%, #FFFFFF 100%)',
        shadow: '0 4px 15px rgba(220, 38, 38, 0.05)',
        daysRemaining,
        badgeColor: '#DC2626',
        badgeText: daysRemaining < 0 ? 'Overdue' : 'Critical (Red)',
        badgeBg: 'var(--status-danger-bg)'
      };
    } else if (daysRemaining <= 4) {
      return {
        borderLeftColor: 'var(--status-warning)',
        borderLeftWidth: '4px',
        background: 'linear-gradient(135deg, rgba(255, 251, 235, 0.7) 0%, #FFFFFF 100%)',
        shadow: '0 4px 15px rgba(217, 119, 6, 0.03)',
        daysRemaining,
        badgeColor: '#D97706',
        badgeText: 'Warning (Amber)',
        badgeBg: 'var(--status-warning-bg)'
      };
    } else {
      return {
        borderLeftColor: 'var(--status-success)',
        borderLeftWidth: '4px',
        background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.7) 0%, #FFFFFF 100%)',
        shadow: '0 4px 15px rgba(5, 150, 105, 0.03)',
        daysRemaining,
        badgeColor: '#059669',
        badgeText: 'On Track (Green)',
        badgeBg: 'var(--status-success-bg)'
      };
    }
  };


  if (!project) return <div className="app-loading" style={{ height: '60vh' }}><div className="spinner-dark" style={{ width: '32px', height: '32px', borderWidth: '3px' }} /><div style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Loading...</div></div>;

  const totalReqs = requests.length;
  const completedReqs = requests.filter(r => r.status === 'Completed').length;
  const inProgressReqs = requests.filter(r => r.status === 'In Progress').length;
  const pendingReqs = requests.filter(r => r.status === 'Pending').length;
  const blockedReqs = requests.filter(r => r.is_blocked && r.status !== 'Completed').length;
  const totalHours = requests.reduce((s, r) => s + (r.hours_spent || 0), 0);

  let filteredRequests = filter === 'All' ? requests : filter === 'Blocked' ? requests.filter(r => r.is_blocked) : filter === 'Escalated' ? requests.filter(r => r.escalated) : requests.filter(r => r.status === filter);
  
  if (advAssignee) filteredRequests = filteredRequests.filter(r => r.assigned_to === advAssignee);
  if (advPriority) filteredRequests = filteredRequests.filter(r => r.priority === advPriority);
  if (advTags) filteredRequests = filteredRequests.filter(r => r.tags && r.tags.toLowerCase().includes(advTags.toLowerCase()));

  if (sortBy === 'newest') filteredRequests = [...filteredRequests].sort((a, b) => b.created_at.localeCompare(a.created_at));
  else if (sortBy === 'priority') { const pOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }; filteredRequests = [...filteredRequests].sort((a, b) => (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2)); }
  else if (sortBy === 'deadline') filteredRequests = [...filteredRequests].sort((a, b) => (a.deadline || 'z').localeCompare(b.deadline || 'z'));

  const allBlockers = [
    ...blockers,
    ...requests
      .filter(r => r.is_blocked && r.status !== 'Completed')
      .map(r => ({
        id: `req-${r.id}`,
        is_request: true,
        request_id: r.id,
        title: 'Blocker Active',
        description: r.blocker_description || 'No description provided.',
        status: 'Active',
        reported_by: r.assigned_to || 'Dev Team',
        created_at: r.updated_at || r.created_at || new Date().toISOString(),
        related_request_title: r.title,
        comments: r.blocker_comments || []
      }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-4">
        <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ padding: '8px 4px', color: 'var(--text-muted)', fontSize: '0.9rem' }}><ArrowLeft size={16} /> Back</button>
        {role === 'Manager' && (
          <button className="btn btn-secondary" onClick={handleArchiveProject} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Archive Project</button>
        )}
      </div>

      {/* Hero */}
      <div className="glass-panel" style={{ padding: '36px 40px', marginBottom: '32px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(79, 70, 229, 0.2)', background: 'linear-gradient(135deg, #FFFFFF 0%, #EEF2FF 100%)', boxShadow: 'var(--shadow-md)', animation: 'fadeSlideUp 0.4s ease-out' }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
        <div className="flex justify-between items-start mb-4" style={{ position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '2.4rem', margin: 0, letterSpacing: '-0.04em', color: 'var(--text-main)', fontWeight: 800 }}>{project.title}</h1>
          <div className="flex items-center gap-3">
            <div className="badge badge-active" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Active Project</div>
            <button className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={() => {
              setEditProjectData({ description: project.description || '', manual_health: project.manual_health || 'Auto' });
              setIsEditProjectModalOpen(true);
            }}>
              <FileText size={16} style={{ marginRight: '6px' }} />
              Edit Project
            </button>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '800px', whiteSpace: 'pre-wrap' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{project.description}</ReactMarkdown>
        </div>
        
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Total', value: totalReqs, color: 'var(--accent-primary)', bg: '#EEF2FF' },
            { label: 'Done', value: completedReqs, color: 'var(--status-success)', bg: 'var(--status-success-bg)' },
            { label: 'Active', value: inProgressReqs, color: 'var(--status-info)', bg: 'var(--status-info-bg)' },
            { label: 'Pending', value: pendingReqs, color: 'var(--text-muted)', bg: 'var(--bg-subtle)' },
            { label: 'Blocked', value: blockedReqs, color: 'var(--status-danger)', bg: 'var(--status-danger-bg)' },
            { label: 'Hours', value: `${Math.round(totalHours)}h`, color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
          ].map(k => (
            <div key={k.label} style={{ padding: '16px', borderRadius: 'var(--radius-lg)', background: '#FFFFFF', border: `1px solid ${k.bg}`, boxShadow: 'var(--shadow-sm)', textAlign: 'center', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '8px' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Scope & Negotiations */}
      {project && (project.estimated_days_client || project.complexity_client || (project.attachments && project.attachments.length > 0)) && (
        <div className="mb-8" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
          <h2 className="flex items-center gap-2 mb-4" style={{ fontSize: '1.5rem', margin: '0 0 20px', color: 'var(--text-main)' }}>
            <div style={{ padding: '8px', background: 'var(--accent-primary-light)', borderRadius: '10px', color: 'var(--accent-primary)', display: 'flex' }}><Target size={22} /></div>
            Project Scope & Negotiations
          </h2>
          
          {project.attachments && project.attachments.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {project.attachments.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="badge badge-info hover:opacity-80" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-xs)', transition: 'all 0.2s' }}>
                  <Paperclip size={16} /> Attachment {i + 1}
                </a>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid var(--status-info)', background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)', position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: 0, right: 0, padding: '24px', color: 'rgba(37,99,235,0.05)' }}><User size={80} /></div>
               <h4 className="flex items-center gap-2 mb-4" style={{ fontSize: '1.1rem', color: 'var(--status-info)', position: 'relative' }}><User size={18} /> Client Request</h4>
               <div className="flex gap-8" style={{ position: 'relative' }}>
                 <div>
                   <div className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Est. Days</div>
                   <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>{project.estimated_days_client || '—'}</div>
                 </div>
                 <div>
                   <div className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Complexity</div>
                   <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>{project.complexity_client || '—'}</div>
                 </div>
               </div>
            </div>
            
            <div className="glass-panel" style={{ padding: '24px', borderTop: `4px solid ${project.agreed_days ? 'var(--status-success)' : 'var(--status-warning)'}`, background: project.agreed_days ? 'linear-gradient(180deg, #FFFFFF 0%, var(--status-success-bg) 100%)' : 'linear-gradient(180deg, #FFFFFF 0%, var(--status-warning-bg) 100%)', position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: 0, right: 0, padding: '24px', color: project.agreed_days ? 'rgba(5,150,105,0.05)' : 'rgba(217,119,6,0.05)' }}><Clock size={80} /></div>
               <h4 className="flex items-center gap-2 mb-4" style={{ fontSize: '1.1rem', color: project.agreed_days ? 'var(--status-success)' : 'var(--status-warning)', position: 'relative' }}><Clock size={18} /> Dev Estimate & Negotiation</h4>
               
               {role === 'Cozentus' && !project.agreed_days ? (
                 <div className="flex gap-3" style={{ position: 'relative' }}>
                   <input type="number" id="proj_dev_est" className="form-control" placeholder="Days" defaultValue={project.estimated_days_dev || ''} style={{ width: '100px', fontSize: '1.1rem', fontWeight: 600 }} />
                   <select id="proj_dev_comp" className="form-control" defaultValue={project.complexity_dev || ''} style={{ width: '140px', fontSize: '1.1rem', fontWeight: 600 }}>
                     <option value="">Complexity</option><option>Low</option><option>Medium</option><option>High</option>
                   </select>
                   <button className="btn btn-primary" style={{ padding: '12px 20px' }} onClick={() => {
                     const est = document.getElementById('proj_dev_est').value;
                     const comp = document.getElementById('proj_dev_comp').value;
                     handleUpdateProject({ estimated_days_dev: est ? parseInt(est) : null, complexity_dev: comp });
                   }}>Submit</button>
                 </div>
               ) : (
                 <div className="flex gap-8 items-center" style={{ position: 'relative' }}>
                   <div>
                     <div className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Dev Est. Days</div>
                     <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>{project.estimated_days_dev || '—'}</div>
                   </div>
                   <div>
                     <div className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Dev Complexity</div>
                     <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>{project.complexity_dev || '—'}</div>
                   </div>
                   
                   {role === 'AAW' && project.estimated_days_dev && !project.agreed_days && (
                     <div className="flex gap-2 ml-auto">
                       <button className="btn btn-primary" style={{ background: 'var(--status-success)', borderColor: 'var(--status-success)', padding: '8px 16px' }} onClick={() => handleUpdateProject({ agreed_days: project.estimated_days_dev, agreed_complexity: project.complexity_dev, client_approved_estimate: true })}><CheckCircle size={16} /> Approve</button>
                       <button className="btn btn-danger" style={{ padding: '8px 16px' }} onClick={() => handleUpdateProject({ client_approved_estimate: false })}><X size={16} /> Reject</button>
                     </div>
                   )}
                   {project.agreed_days && (
                     <div className="ml-auto badge badge-completed" style={{ padding: '8px 16px', fontSize: '0.9rem' }}><Handshake size={16} /> Agreed</div>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Blockers Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="flex items-center gap-2" style={{ fontSize: '1.4rem', margin: 0, color: 'var(--status-danger)' }}><ShieldAlert size={20} /> Project Blockers</h2>
          {role === 'Cozentus' && (
              <button className="btn btn-danger" onClick={() => setIsBlockerModalOpen(true)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}><ShieldAlert size={15} /> Report Blocker</button>
            )}
          </div>
          {allBlockers.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', border: '2px dashed var(--border-medium)', background: 'transparent' }}>
              <div style={{ display: 'inline-flex', padding: '16px', background: 'var(--bg-subtle)', borderRadius: '50%', color: 'var(--text-faint)', marginBottom: '16px' }}>
                 <CheckCircle2 size={32} />
              </div>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', margin: '0 0 8px' }}>All Clear!</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.95rem' }}>There are no active blockers reported for this project.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {allBlockers.map(b => (
                <div key={b.id} style={{ background: b.status === 'Resolved' ? 'var(--bg-subtle)' : 'var(--status-danger-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: `1px solid ${b.status === 'Resolved' ? 'var(--border-subtle)' : 'var(--status-danger-border)'}`, cursor: 'pointer' }} onClick={(e) => { if (e.target.closest('button') || e.target.closest('a')) return; if (b.is_request) { const req = requests.find(r => r.id === b.request_id); if(req) openUpdateModal(req); } else { handleOpenBlockerDiscussion(b); } }}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: b.status === 'Resolved' ? 'var(--text-muted)' : 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {b.status === 'Resolved' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {b.title}
                    </h4>
                    <span className="badge" style={{ background: b.status === 'Resolved' ? 'var(--bg-hover)' : 'var(--status-danger)', color: b.status === 'Resolved' ? 'var(--text-muted)' : '#FFF' }}>{b.status}</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', margin: '0 0 12px', color: b.status === 'Resolved' ? 'var(--text-muted)' : 'var(--text-main)', lineHeight: 1.5 }}>{b.description}</p>
                  <div className="flex justify-between items-end">
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div>Reported by <strong>{b.reported_by}</strong></div>
                      <div>{new Date(b.created_at).toLocaleDateString()}</div>
                      {b.related_request_title && <div className="mt-1 flex items-center gap-1" style={{ cursor: b.is_request ? 'pointer' : 'default', textDecoration: b.is_request ? 'underline' : 'none', color: b.is_request ? 'var(--accent-primary)' : 'inherit' }} onClick={() => { if (b.is_request) { const req = requests.find(r => r.id === b.request_id); if(req) openUpdateModal(req); } }}><Target size={12} /> {b.related_request_title}</div>}
                    </div>
                    {role === 'Cozentus' && b.status === 'Active' && (
                      <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); handleResolveBlocker(b.id); }} style={{ padding: '5px 12px', fontSize: '0.75rem' }}><CheckCircle size={14} /> Resolve</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      {/* Filters */}
      <div className="flex justify-between items-center mb-6" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-full)', padding: '3px' }}>
            {['All', 'Pending', 'In Progress', 'Completed', ...(blockedReqs > 0 ? ['Blocked'] : [])].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)', background: filter === f ? 'var(--bg-secondary)' : 'transparent', color: filter === f ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: filter === f ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s' }}>{f}</button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <option value="newest">Newest First</option>
            <option value="priority">By Priority</option>
            <option value="deadline">By Deadline</option>
          </select>
          <select value={advAssignee} onChange={e => setAdvAssignee(e.target.value)} style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <option value="">Any Assignee</option>
            {[...new Set(requests.map(r => r.assigned_to).filter(Boolean))].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={advPriority} onChange={e => setAdvPriority(e.target.value)} style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <option value="">Any Priority</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <input type="text" value={advTags} onChange={e => setAdvTags(e.target.value)} placeholder="Filter by tags..." style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem', width: '120px', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontFamily: 'var(--font-body)' }} />
          <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '5px 10px', border: 'none', background: viewMode === 'list' ? 'var(--bg-hover)' : 'var(--bg-secondary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: viewMode === 'list' ? 'var(--text-main)' : 'var(--text-muted)' }}>List</button>
            <button onClick={() => setViewMode('kanban')} style={{ padding: '5px 10px', border: 'none', background: viewMode === 'kanban' ? 'var(--bg-hover)' : 'var(--bg-secondary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: viewMode === 'kanban' ? 'var(--text-main)' : 'var(--text-muted)', borderLeft: '1px solid var(--border-subtle)' }}>Kanban</button>
          </div>
        </div>
        {role === 'AAW' && <button className="btn btn-primary" onClick={() => setIsSubmitModalOpen(true)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}><MessageSquare size={15} /> New Request</button>}
      </div>

      {/* Content Area */}
      {viewMode === 'list' ? (
        <div className="flex-col gap-4">
          {filteredRequests.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px 32px', textAlign: 'center', borderStyle: requests.length === 0 ? 'dashed' : 'solid' }}>
              <AlertCircle size={32} color="var(--accent-primary)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{requests.length === 0 ? 'No requests yet' : `No ${filter} requests`}</h3>
              <p className="text-muted" style={{ fontSize: '0.88rem' }}>{requests.length === 0 ? 'Submit a change request to get started.' : 'Try a different filter.'}</p>
            </div>
          ) : (
            filteredRequests.map(req => {
              const sc = STATUS_COLORS[req.status] || STATUS_COLORS.Pending;
              const over = isOverdue(req);
              const shading = getRequestShading(req);
              return (
                <div key={req.id} className="glass-panel stagger-card" onClick={() => openUpdateModal(req)} style={{ 
                  padding: '20px 24px', 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '14px', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  borderLeft: `${shading.borderLeftWidth} solid ${shading.borderLeftColor}`, 
                  background: shading.background,
                  boxShadow: shading.shadow,
                  cursor: 'pointer' 
                }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <div className="flex items-center gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{req.title}</h3>
                      <span className={`badge badge-${req.status.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{req.status}</span>
                      {getPriorityBadge(req.priority)}
                      {req.is_blocked && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--status-danger)', background: 'var(--status-danger-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '3px' }}><ShieldAlert size={11} /> Blocked</span>}
                      {req.escalated && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7C3AED', background: '#F3E8FF', padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '3px' }}><Zap size={11} /> Escalated</span>}
                      {req.deadline && req.status !== 'Completed' && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 700, 
                          color: shading.badgeColor, 
                          background: shading.badgeBg, 
                          padding: '2px 8px', 
                          borderRadius: 'var(--radius-full)' 
                        }}>
                          {shading.badgeText}
                          {shading.daysRemaining !== undefined && ` (${shading.daysRemaining < 0 ? `${Math.abs(shading.daysRemaining)}d overdue` : `${shading.daysRemaining}d left`})`}
                        </span>
                      )}
                    </div>
                    <p className="text-muted" style={{ marginBottom: '8px', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{req.request_text}</p>
                    <div className="flex flex-wrap gap-3 text-muted" style={{ fontSize: '0.75rem' }}>
                      <span className="flex items-center gap-1"><Clock size={11} /> {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      {req.assigned_to && <span className="flex items-center gap-1"><User size={11} /> {req.assigned_to}</span>}
                      {req.deadline && <span className="flex items-center gap-1" style={{ color: shading.badgeColor }}><Calendar size={11} /> {req.deadline}</span>}
                      {req.agreed_days && <span className="flex items-center gap-1" style={{ color: 'var(--status-success)' }}><Handshake size={11} /> {req.agreed_days}d</span>}
                      {getResolutionDays(req) && <span className="flex items-center gap-1" style={{ color: 'var(--status-success)' }}><CheckCircle2 size={11} /> Resolved in {getResolutionDays(req)}d</span>}
                      {req.comments?.length > 0 && <span className="flex items-center gap-1"><MessageSquare size={11} /> {req.comments.length}</span>}
                      {req.tags && <span className="flex items-center gap-1"><Tag size={11} /> {req.tags}</span>}
                    </div>
                    {req.status === 'In Progress' && req.progress_percent > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', background: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden', maxWidth: '160px' }}>
                          <div style={{ height: '100%', width: `${req.progress_percent}%`, background: 'var(--accent-primary)', borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{req.progress_percent}%</span>
                      </div>
                    )}
                  </div>
                  <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); openUpdateModal(req); }} style={{ padding: '7px 14px', fontSize: '0.82rem' }}><MessageSquare size={13} /> Open</button>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* KANBAN BOARD */
        <div className="flex gap-6 overflow-x-auto pb-4" style={{ minHeight: '600px', display: 'flex' }}>
          {['Pending', 'In Progress', 'Completed'].map(col => {
            const colReqs = filteredRequests.filter(r => r.status === col);
            
            return (
              <div 
                key={col} 
                className="glass-panel" 
                style={{ flex: 1, minWidth: '320px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', padding: 0, overflow: 'hidden' }}
                onDragOver={handleDragOver} 
                onDrop={(e) => handleDrop(e, col)}
              >
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF' }}>
                  <h3 className="flex items-center gap-2" style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {col === 'Pending' && <Clock size={18} color="var(--text-muted)" />}
                    {col === 'In Progress' && <Activity size={18} color="var(--status-info)" />}
                    {col === 'Completed' && <CheckCircle2 size={18} color="var(--status-success)" />}
                    {col}
                  </h3>
                  <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-muted)' }}>{colReqs.length}</span>
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
                  {colReqs.map(req => {
                    const over = isOverdue(req);
                    const shading = getRequestShading(req);
                    return (
                      <div 
                        key={req.id} 
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, req)}
                        onClick={() => openUpdateModal(req)}
                        style={{ 
                          background: shading.background, 
                          padding: '18px', 
                          borderRadius: 'var(--radius-md)', 
                          border: `1.5px solid ${shading.borderLeftColor}`, 
                          boxShadow: shading.shadow, 
                          cursor: 'grab', 
                          transition: 'transform 0.2s, box-shadow 0.2s' 
                        }}
                        className="stagger-card kanban-card"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className={`badge ${PRIORITY_CONFIG[req.priority]?.class || ''}`} style={{ fontSize: '0.7rem' }}>{PRIORITY_CONFIG[req.priority]?.icon} {req.priority}</span>
                          {req.is_blocked && <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}><AlertTriangle size={12}/> Blocked</span>}
                        </div>
                        <h4 style={{ fontSize: '1.05rem', margin: '0 0 8px', lineHeight: 1.4 }}>{req.title}</h4>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {req.escalated && <span style={{ fontSize: '0.65rem', color: '#FFF', background: '#7C3AED', padding: '2px 6px', borderRadius: '4px' }}>Escalated</span>}
                          {req.deadline && req.status !== 'Completed' && (
                            <span style={{ 
                              fontSize: '0.65rem', 
                              color: shading.badgeColor, 
                              background: shading.badgeBg, 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              fontWeight: 700
                            }}>
                              {shading.badgeText.split(' ')[0]} {shading.daysRemaining !== undefined ? `(${shading.daysRemaining}d)` : ''}
                            </span>
                          )}
                        </div>
                        {req.status === 'In Progress' && req.progress_percent > 0 && (
                          <div style={{ height: '4px', background: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
                            <div style={{ height: '100%', width: `${req.progress_percent}%`, background: 'var(--accent-primary)', borderRadius: '2px' }} />
                          </div>
                        )}
                        <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.8rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '12px' }}>
                          <span className="flex items-center gap-1" style={{ color: shading.badgeColor }}><Calendar size={13} /> {req.deadline ? req.deadline.substring(5, 10) : '—'}</span>
                          {req.assigned_to && <span className="flex items-center gap-1"><User size={13} /> {req.assigned_to.split(' ')[0]}</span>}
                        </div>
                      </div>
                    )
                  })}
                  {colReqs.length === 0 && <div className="text-center text-muted" style={{ padding: '32px 20px', fontSize: '0.9rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>Drop items here</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ SUBMIT MODAL ═══ */}
      {isSubmitModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsSubmitModalOpen(false); }}>
          <div className="modal-content huge">
            <div className="modal-header-bar" />
            <div className="modal-header-content">
              <div className="flex justify-between items-start">
                <div><h2 style={{ marginBottom: '4px', fontSize: '1.3rem' }}>Submit Change Request</h2><p className="text-muted" style={{ fontSize: '0.88rem', margin: 0 }}>Provide details about the needed change.</p></div>
                <button className="btn-ghost btn-icon" onClick={() => setIsSubmitModalOpen(false)}><X size={20} /></button>
              </div>
            </div>
            <form onSubmit={handleSubmitRequest}>
              <div className="modal-body-content">
                <div className="form-group"><label className="form-label">Title</label><input type="text" className="form-control" required value={newRequest.title} onChange={e => setNewRequest({ ...newRequest, title: e.target.value })} placeholder="Brief summary" style={{ fontSize: '1.05rem', padding: '14px 16px' }} /></div>
                <div className="form-group"><label className="form-label">Detailed Requirement <span style={{fontSize:'0.75rem', fontWeight:'normal', color:'var(--text-faint)', marginLeft:'6px'}}>(Markdown supported)</span></label><textarea className="form-control outlook-style" required value={newRequest.request_text} onChange={e => setNewRequest({ ...newRequest, request_text: e.target.value })} placeholder="Describe the requirement in detail..." /></div>
                <div className="flex gap-4">
                  <div className="form-group" style={{ flex: 1 }}><label className="form-label">Type</label><select className="form-control" value={newRequest.type} onChange={e => setNewRequest({ ...newRequest, type: e.target.value })}><option>Enhancement</option><option>Bug Fix</option><option>New Feature</option></select></div>
                  <div className="form-group" style={{ flex: 1 }}><label className="form-label">Priority</label><select className="form-control" value={newRequest.priority} onChange={e => setNewRequest({ ...newRequest, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
                  <div className="form-group" style={{ flex: 1 }}><label className="form-label">Complexity</label><select className="form-control" value={newRequest.complexity_client} onChange={e => setNewRequest({ ...newRequest, complexity_client: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></div>
                </div>
                <div className="flex gap-4">
                  <div className="form-group" style={{ flex: 1 }}><label className="form-label"><span className="flex items-center gap-2"><Clock size={14} /> Your Estimate (days)</span></label><input type="number" className="form-control" min="1" max="365" placeholder="e.g. 5" value={newRequest.estimated_days_client} onChange={e => {
                    const days = e.target.value;
                    let d = newRequest.deadline;
                    if (days && !isNaN(days)) {
                      const date = new Date();
                      date.setDate(date.getDate() + parseInt(days, 10));
                      d = date.toISOString().split('T')[0];
                    }
                    setNewRequest({ ...newRequest, estimated_days_client: days, deadline: d });
                  }} /></div>
                  <div className="form-group" style={{ flex: 1 }}><label className="form-label"><span className="flex items-center gap-2"><Calendar size={14} /> Deadline</span></label><input type="date" className="form-control" value={newRequest.deadline} onChange={e => setNewRequest({ ...newRequest, deadline: e.target.value })} /></div>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label"><span className="flex items-center gap-2"><Paperclip size={14} /> Attachments (Optional)</span></label>
                  <input type="file" className="form-control" onChange={handleNewRequestFileUpload} />
                  {newRequest.attachments?.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {newRequest.attachments.length} file(s) attached
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer-content flex justify-between"><button type="button" className="btn btn-secondary" onClick={() => setIsSubmitModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary"><Send size={16} /> Submit</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ DETAILS MODAL ═══ */}
      {selectedRequest && !resolveConfirm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedRequest(null); }}>
          <div className="modal-content huge" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)' }}>
            {/* Header */}
            <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
              <div className="flex justify-between items-start">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                    <span className={`badge badge-${selectedRequest.status.toLowerCase().replace(' ', '-')}`}>{selectedRequest.status}</span>
                    {getPriorityBadge(selectedRequest.priority)}
                    <span className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>{selectedRequest.type}</span>
                    {selectedRequest.is_blocked && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--status-danger)', background: 'var(--status-danger-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>🚫 Blocked</span>}
                    {selectedRequest.escalated && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7C3AED', background: '#F3E8FF', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>⚡ Escalated</span>}
                  </div>
                  <h2 style={{ fontSize: '1.3rem', margin: 0, lineHeight: 1.3 }}>{selectedRequest.title}</h2>
                  {selectedRequest.tags && <div className="flex items-center gap-1 mt-2" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}><Tag size={12} /> {selectedRequest.tags}</div>}
                  {selectedRequest.status === 'Completed' && selectedRequest.completed_at && (
                    <div className="flex items-center gap-2 mt-3" style={{ padding: '8px 12px', background: 'var(--status-success-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-success-border)' }}>
                      <CheckCircle2 size={16} color="var(--status-success)" />
                      <span style={{ fontSize: '0.85rem', color: 'var(--status-success)', fontWeight: 600 }}>
                        Resolved on {new Date(selectedRequest.completed_at).toLocaleDateString()} 
                        {getResolutionDays(selectedRequest) ? ` (Total time: ${getResolutionDays(selectedRequest)} days)` : ''}
                      </span>
                    </div>
                  )}
                </div>
                <button className="btn-ghost btn-icon" onClick={() => setSelectedRequest(null)} style={{ marginLeft: '12px' }}><X size={20} /></button>
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0', marginTop: '16px', borderBottom: 'none' }}>
                {['details', 'discussion'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 18px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font-body)', borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent', color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)', background: 'transparent', transition: 'all 0.2s', textTransform: 'capitalize' }}>{tab}</button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '22px 28px', overflowY: 'auto', flex: 1, background: 'var(--bg-main)' }}>
              {activeTab === 'details' && (
                <>
                  {/* Status Stepper */}
                  <div className="status-stepper mb-6">
                    {['Pending', 'In Progress', 'Completed'].map((step, idx, arr) => {
                      const so = { Pending: 0, 'In Progress': 1, Completed: 2 };
                      const co = so[selectedRequest.status] ?? 0, to = so[step];
                      return (<div key={step} style={{ display: 'flex', alignItems: 'center' }}><div className={`status-step ${to < co ? 'completed' : ''} ${to === co ? 'active' : ''}`}>{to < co ? <CheckCircle2 size={14} /> : null}{step}</div>{idx < arr.length - 1 && <div className={`status-step-connector ${to < co ? 'completed' : ''}`} />}</div>);
                    })}
                  </div>

                  {/* Attachments Section */}
                  {selectedRequest.attachments?.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 className="flex items-center gap-2 mb-3" style={{ fontSize: '0.92rem' }}><Paperclip size={17} color="var(--accent-primary)" /> Initial Attachments</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.attachments.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                            <FileText size={14} /> Attachment {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subtasks Section */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 className="flex items-center gap-2 mb-3" style={{ fontSize: '0.92rem' }}><CheckCircle size={17} color="var(--accent-primary)" /> Subtasks</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(selectedRequest.subtasks || []).map(st => (
                        <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                          <input type="checkbox" checked={st.completed} onChange={() => handleToggleSubtask(st.id)} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px', cursor: 'pointer' }} disabled={role === 'AAW'} />
                          <span style={{ textDecoration: st.completed ? 'line-through' : 'none', color: st.completed ? 'var(--text-faint)' : 'var(--text-main)', fontSize: '0.9rem' }}>{st.title}</span>
                          {role !== 'AAW' && (
                            <button onClick={() => handleDeleteSubtask(st.id)} className="btn-icon" style={{ marginLeft: 'auto', padding: '4px', color: 'var(--status-danger)' }}><Trash2 size={14} /></button>
                          )}
                        </div>
                      ))}
                      {role !== 'AAW' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <input type="text" className="form-control" placeholder="New subtask..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubtask()} style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }} />
                          <button onClick={handleAddSubtask} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}><Plus size={16} /> Add</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Complexity & Timeline Negotiation */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '22px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
                    <h4 className="flex items-center gap-2" style={{ margin: '0 0 14px', fontSize: '0.92rem' }}><Handshake size={17} color="var(--accent-primary)" /> Negotiations & Timeline</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      {/* Timeline Block */}
                      <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: '#EEF2FF', border: '1px solid rgba(79,70,229,0.1)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Client Days</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: selectedRequest.estimated_days_client ? 'var(--accent-primary)' : 'var(--text-faint)' }}>{selectedRequest.estimated_days_client ? `${selectedRequest.estimated_days_client}d` : '—'}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: '#EFF6FF', border: '1px solid rgba(37,99,235,0.1)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--status-info)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Dev Days</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: selectedRequest.estimated_days_dev ? 'var(--status-info)' : 'var(--text-faint)' }}>{selectedRequest.estimated_days_dev ? `${selectedRequest.estimated_days_dev}d` : '—'}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center', background: selectedRequest.agreed_days ? 'var(--status-success-bg)' : 'var(--bg-subtle)', border: `1px solid ${selectedRequest.agreed_days ? 'var(--status-success-border)' : 'var(--border-subtle)'}` }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: selectedRequest.agreed_days ? 'var(--status-success)' : 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{selectedRequest.agreed_days ? '✓ Agreed Days' : 'Agreed Days'}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: selectedRequest.agreed_days ? 'var(--status-success)' : 'var(--text-faint)' }}>{selectedRequest.agreed_days ? `${selectedRequest.agreed_days}d` : '—'}</div>
                      </div>
                      
                      {/* Complexity Block */}
                      <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: '#FDF4FF', border: '1px solid rgba(192,38,211,0.1)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#C026D3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Client Complexity</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: selectedRequest.complexity_client ? '#C026D3' : 'var(--text-faint)' }}>{selectedRequest.complexity_client || '—'}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: '#F0FDF4', border: '1px solid rgba(22,163,74,0.1)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Dev Complexity</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: selectedRequest.complexity_dev ? '#16A34A' : 'var(--text-faint)' }}>{selectedRequest.complexity_dev || '—'}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center', background: selectedRequest.agreed_complexity ? 'var(--status-success-bg)' : 'var(--bg-subtle)', border: `1px solid ${selectedRequest.agreed_complexity ? 'var(--status-success-border)' : 'var(--border-subtle)'}` }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: selectedRequest.agreed_complexity ? 'var(--status-success)' : 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{selectedRequest.agreed_complexity ? '✓ Agreed Comp.' : 'Agreed Comp.'}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: selectedRequest.agreed_complexity ? 'var(--status-success)' : 'var(--text-faint)' }}>{selectedRequest.agreed_complexity || '—'}</div>
                      </div>
                    </div>
                    
                    {/* Discrepancy Warnings */}
                    {selectedRequest.estimated_days_client && selectedRequest.estimated_days_dev && !selectedRequest.agreed_days && selectedRequest.estimated_days_client !== selectedRequest.estimated_days_dev && (
                      <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', fontSize: '0.82rem', color: 'var(--status-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <AlertTriangle size={15} /> Time Mismatch: Client {selectedRequest.estimated_days_client}d vs Dev {selectedRequest.estimated_days_dev}d — please agree on a timeline.
                      </div>
                    )}
                    {selectedRequest.complexity_client && selectedRequest.complexity_dev && !selectedRequest.agreed_complexity && selectedRequest.complexity_client !== selectedRequest.complexity_dev && (
                      <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', fontSize: '0.82rem', color: 'var(--status-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <AlertTriangle size={15} /> Complexity Mismatch: Client {selectedRequest.complexity_client} vs Dev {selectedRequest.complexity_dev} — please discuss.
                      </div>
                    )}
                    
                    {/* Client Approval Logic */}
                    {role === 'AAW' && selectedRequest.estimated_days_dev && !selectedRequest.agreed_days && selectedRequest.status !== 'Completed' && (
                      <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--status-info)', fontWeight: 600 }}>Dev estimates {selectedRequest.estimated_days_dev} days. Do you approve?</span>
                          {!isRejectingDays && (
                            <div className="flex gap-2">
                              <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => quickAction('agreed_days', selectedRequest.estimated_days_dev)}><ThumbsUp size={13} /> Approve</button>
                              <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setIsRejectingDays(true)}><ThumbsDown size={13} /> Reject</button>
                            </div>
                          )}
                        </div>
                        {isRejectingDays && (
                          <div style={{ marginTop: '8px', padding: '12px', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Suggest New Days:</label>
                            <input type="number" className="form-control" value={suggestedDays} onChange={e => setSuggestedDays(e.target.value)} placeholder="e.g. 5" style={{ padding: '6px 10px', fontSize: '0.8rem' }} />
                            <div className="flex gap-2" style={{ marginTop: '4px' }}>
                              <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem', flex: 1 }} onClick={() => handleClientReject('days')}>Submit Suggestion</button>
                              <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem', flex: 1 }} onClick={() => handleClientForce('days')} title="Force this value immediately">Force My Values</button>
                              <button className="btn btn-ghost" style={{ padding: '6px 8px' }} onClick={() => setIsRejectingDays(false)}><X size={14} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {role === 'AAW' && selectedRequest.complexity_dev && !selectedRequest.agreed_complexity && selectedRequest.status !== 'Completed' && (
                      <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: '#F0FDF4', border: '1px solid rgba(22,163,74,0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', color: '#16A34A', fontWeight: 600 }}>Dev estimates {selectedRequest.complexity_dev} complexity. Do you approve?</span>
                          {!isRejectingComplexity && (
                            <div className="flex gap-2">
                              <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#16A34A' }} onClick={() => quickAction('agreed_complexity', selectedRequest.complexity_dev)}><ThumbsUp size={13} /> Approve</button>
                              <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setIsRejectingComplexity(true)}><ThumbsDown size={13} /> Reject</button>
                            </div>
                          )}
                        </div>
                        {isRejectingComplexity && (
                          <div style={{ marginTop: '8px', padding: '12px', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Suggest New Complexity:</label>
                            <input type="text" className="form-control" value={suggestedComplexity} onChange={e => setSuggestedComplexity(e.target.value)} placeholder="e.g. Low" style={{ padding: '6px 10px', fontSize: '0.8rem' }} />
                            <div className="flex gap-2" style={{ marginTop: '4px' }}>
                              <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem', flex: 1 }} onClick={() => handleClientReject('complexity')}>Submit Suggestion</button>
                              <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem', flex: 1 }} onClick={() => handleClientForce('complexity')} title="Force this value immediately">Force My Values</button>
                              <button className="btn btn-ghost" style={{ padding: '6px 8px' }} onClick={() => setIsRejectingComplexity(false)}><X size={14} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  {selectedRequest.status === 'In Progress' && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '18px 22px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
                      <h4 className="flex items-center gap-2" style={{ margin: '0 0 10px', fontSize: '0.92rem' }}><TrendingUp size={17} color="var(--accent-primary)" /> Progress</h4>
                      <div className="flex items-center gap-4">
                        <div style={{ flex: 1, height: '10px', background: 'var(--bg-hover)', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${selectedRequest.progress_percent || 0}%`, background: 'linear-gradient(90deg, #4F46E5, #7C3AED)', borderRadius: '5px', transition: 'width 0.6s' }} />
                        </div>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-primary)', minWidth: '44px' }}>{selectedRequest.progress_percent || 0}%</span>
                      </div>
                      {selectedRequest.assigned_to && <div className="flex items-center gap-2 mt-3" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}><User size={13} /> {selectedRequest.assigned_to}</div>}
                    </div>
                  )}

                  {/* Blocker Alert */}
                  {selectedRequest.is_blocked && (
                    <div style={{ background: 'var(--status-danger-bg)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--status-danger-border)', marginBottom: '18px' }}>
                      <h4 className="flex items-center gap-2" style={{ margin: '0 0 6px', fontSize: '0.92rem', color: 'var(--status-danger)' }}><ShieldAlert size={17} /> Blocker Active</h4>
                      <p style={{ fontSize: '0.88rem', color: 'var(--status-danger)', margin: 0, lineHeight: 1.5 }}>{selectedRequest.blocker_reason || 'No details provided.'}</p>
                    </div>
                  )}

                  {/* Original Request */}
                  <div className="mb-5">
                    <h4 className="text-muted mb-2" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Original Request</h4>
                    <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.9rem', lineHeight: 1.7 }} className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedRequest.request_text}</ReactMarkdown>
                    </div>
                  </div>

                  {/* ═══ AAW CLIENT ACTIONS ═══ */}
                  {role === 'AAW' && selectedRequest.status !== 'Completed' && (
                    <form onSubmit={handleUpdateRequest} className="mb-5" style={{ background: 'var(--bg-secondary)', padding: '22px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79,70,229,0.12)' }}>
                      <h4 className="flex items-center gap-2" style={{ margin: '0 0 16px', fontSize: '0.92rem' }}><Target size={17} color="var(--accent-primary)" /> Client Actions</h4>
                      <div className="flex gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Your Estimate (days)</label><input type="number" className="form-control" min="1" value={updateData.estimated_days_client ?? ''} onChange={e => setUpdateData({ ...updateData, estimated_days_client: e.target.value })} placeholder="e.g. 5" /></div>
                        <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Deadline</label><input type="date" className="form-control" value={updateData.deadline ?? ''} onChange={e => setUpdateData({ ...updateData, deadline: e.target.value })} /></div>
                        <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Update Priority</label><select className="form-control" value={updateData.priority} onChange={e => setUpdateData({ ...updateData, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
                      </div>
                      <div className="flex gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
                        {selectedRequest.estimated_days_dev && <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Agree on Days</label><input type="number" className="form-control" min="1" value={updateData.agreed_days ?? ''} onChange={e => setUpdateData({ ...updateData, agreed_days: e.target.value })} placeholder="Final agreed" /></div>}
                        <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                          <label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Escalate?</label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: updateData.escalated ? '#F3E8FF' : 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: `1px solid ${updateData.escalated ? '#C084FC' : 'var(--border-subtle)'}`, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: updateData.escalated ? '#7C3AED' : 'var(--text-muted)' }}>
                            <input type="checkbox" checked={updateData.escalated} onChange={e => setUpdateData({ ...updateData, escalated: e.target.checked })} style={{ accentColor: '#7C3AED' }} /> <Zap size={14} /> {updateData.escalated ? 'Escalated' : 'Not Escalated'}
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button type="submit" className="btn btn-primary" style={{ padding: '9px 20px' }}>Save Updates</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setResolveConfirm(true)} style={{ padding: '9px 20px' }}><CheckCircle size={14} /> Mark Resolved</button>
                      </div>
                    </form>
                  )}

                  {/* ═══ COZENTUS DEV ACTIONS ═══ */}
                  {role === 'Cozentus' && selectedRequest.status !== 'Completed' && (
                    <form onSubmit={handleUpdateRequest} className="mb-5" style={{ background: 'var(--bg-secondary)', padding: '22px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(37,99,235,0.12)' }}>
                      <h4 className="flex items-center gap-2" style={{ margin: '0 0 16px', fontSize: '0.92rem' }}><FileText size={17} color="var(--status-info)" /> Developer Actions</h4>
                      <div className="flex gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Status</label><select className="form-control" value={updateData.status} onChange={e => setUpdateData({ ...updateData, status: e.target.value })}><option>Pending</option><option>In Progress</option><option>Completed</option></select></div>
                        <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Complexity</label><select className="form-control" value={updateData.complexity_dev} onChange={e => setUpdateData({ ...updateData, complexity_dev: e.target.value })}><option value="">--</option><option>Low</option><option>Medium</option><option>High</option></select></div>
                        <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Dev Estimate (d)</label><input type="number" className="form-control" min="1" value={updateData.estimated_days_dev ?? ''} onChange={e => setUpdateData({ ...updateData, estimated_days_dev: e.target.value })} placeholder="e.g. 7" /></div>
                      </div>
                      <div className="flex gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Progress %</label><input type="number" className="form-control" min="0" max="100" value={updateData.progress_percent ?? 0} onChange={e => setUpdateData({ ...updateData, progress_percent: e.target.value })} /></div>
                        <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Assigned To</label><input type="text" className="form-control" value={updateData.assigned_to ?? ''} onChange={e => setUpdateData({ ...updateData, assigned_to: e.target.value })} placeholder="Name" /></div>
                      </div>
                      <div className="flex gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
                        {selectedRequest.estimated_days_client && <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Agree on Days</label><input type="number" className="form-control" min="1" value={updateData.agreed_days ?? ''} onChange={e => setUpdateData({ ...updateData, agreed_days: e.target.value })} /></div>}
                        <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Tags</label><input type="text" className="form-control" value={updateData.tags ?? ''} onChange={e => setUpdateData({ ...updateData, tags: e.target.value })} placeholder="e.g. frontend, api" /></div>
                        <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                          <label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Blocker?</label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: updateData.is_blocked ? 'var(--status-danger-bg)' : 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: `1px solid ${updateData.is_blocked ? 'var(--status-danger-border)' : 'var(--border-subtle)'}`, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: updateData.is_blocked ? 'var(--status-danger)' : 'var(--text-muted)' }}>
                            <input type="checkbox" checked={updateData.is_blocked} onChange={e => setUpdateData({ ...updateData, is_blocked: e.target.checked })} style={{ accentColor: '#DC2626' }} /> <ShieldAlert size={14} /> Blocked
                          </label>
                        </div>
                      </div>
                      {updateData.is_blocked && (
                        <div className="form-group mb-4"><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Blocker Details</label><input type="text" className="form-control" value={updateData.blocker_reason ?? ''} onChange={e => setUpdateData({ ...updateData, blocker_reason: e.target.value })} placeholder="What's blocking this work?" /></div>
                      )}
                      <div className="form-group mb-4"><label className="form-label text-muted" style={{ fontSize: '0.75rem' }}>Dev Notes <span style={{fontWeight:'normal', color:'var(--text-faint)', marginLeft:'4px'}}>(Markdown)</span></label><textarea className="form-control" rows={2} value={updateData.dev_notes ?? ''} onChange={e => setUpdateData({ ...updateData, dev_notes: e.target.value })} placeholder="Implementation approach, technical details, blockers..." style={{ minHeight: '72px' }} /></div>
                      <button type="submit" className="btn btn-primary" style={{ padding: '9px 20px' }}>Save All Changes</button>
                    </form>
                  )}



                  {/* ═══ MANAGER VIEW ═══ */}
                  {role === 'Manager' && (
                    <div className="mb-5" style={{ background: 'var(--bg-secondary)', padding: '22px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(5,150,105,0.12)' }}>
                      <h4 className="flex items-center gap-2" style={{ margin: '0 0 14px', fontSize: '0.92rem' }}><Target size={17} color="var(--status-success)" /> Full Metadata</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '0.85rem' }}>
                        {[
                          { l: 'Status', v: selectedRequest.status }, { l: 'Priority', v: selectedRequest.priority },
                          { l: 'Type', v: selectedRequest.type }, { l: 'Client Comp.', v: selectedRequest.complexity_client || '—' },
                          { l: 'Dev Comp.', v: selectedRequest.complexity_dev || '—' }, { l: 'Agreed Comp.', v: selectedRequest.agreed_complexity || '—' },
                          { l: 'Client Est.', v: selectedRequest.estimated_days_client ? `${selectedRequest.estimated_days_client}d` : '—' },
                          { l: 'Dev Est.', v: selectedRequest.estimated_days_dev ? `${selectedRequest.estimated_days_dev}d` : '—' },
                          { l: 'Agreed', v: selectedRequest.agreed_days ? `${selectedRequest.agreed_days}d` : '—' },
                          { l: 'Progress', v: `${selectedRequest.progress_percent || 0}%` },
                          { l: 'Assigned', v: selectedRequest.assigned_to || '—' },
                          { l: 'Hours', v: `${selectedRequest.hours_spent || 0}h` },
                          { l: 'Deadline', v: selectedRequest.deadline || '—' },
                          { l: 'Blocked', v: selectedRequest.is_blocked ? 'Yes' : 'No' },
                          { l: 'Escalated', v: selectedRequest.escalated ? 'Yes' : 'No' },
                          { l: 'Client Approved', v: selectedRequest.client_approved_estimate === null ? 'Pending' : selectedRequest.client_approved_estimate ? 'Yes' : 'Rejected' },
                          { l: 'Resolution Time', v: getResolutionDays(selectedRequest) ? `${getResolutionDays(selectedRequest)} days` : '—' },
                        ].map(m => (
                          <div key={m.l} style={{ padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{m.l}</div>
                            <div style={{ fontWeight: 600 }}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                      {selectedRequest.dev_notes && (
                        <div style={{ marginTop: '14px', padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--status-info)' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Dev Notes</div>
                          <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selectedRequest.dev_notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'discussion' && (
                <div>
                  <div className="flex-col gap-3 mb-6">
                    {(!selectedRequest.comments || selectedRequest.comments.length === 0) ? (
                      <div className="text-center" style={{ padding: '32px 0' }}><MessageSquare size={28} color="var(--border-medium)" style={{ margin: '0 auto 10px', display: 'block' }} /><p className="text-muted" style={{ fontSize: '0.88rem', margin: 0 }}>No comments yet.</p></div>
                    ) : (
                      selectedRequest.comments.map(c => {
                        const ac = c.author_role === 'AAW' ? 'avatar-aaw' : c.author_role === 'Manager' ? 'avatar-manager' : 'avatar-cozentus';
                        const lb = c.author_role === 'AAW' ? 'AAW' : c.author_role === 'Manager' ? 'MGR' : 'COZ';
                        return (
                          <div key={c.id} className="flex gap-3" style={{ marginBottom: '12px' }}>
                            <div className={`header-avatar ${ac}`} style={{ width: '30px', height: '30px', fontSize: '0.6rem', flexShrink: 0 }}>{lb}</div>
                            <div style={{ flex: 1, background: 'var(--bg-secondary)', padding: '11px 15px', borderRadius: '2px var(--radius-md) var(--radius-md) var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                              <div className="flex justify-between items-center mb-1">
                                <strong style={{ fontSize: '0.8rem' }}>{c.author_role}</strong>
                                <span className="text-muted" style={{ fontSize: '0.7rem' }}>{new Date(c.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                              </div>
                              <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }} className="markdown-body">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    strong: ({node, ...props}) => {
                                      if (typeof props.children === 'string' && props.children.startsWith('@')) {
                                        return <span style={{ background: 'var(--accent-primary)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}>{props.children}</span>;
                                      }
                                      return <strong {...props} />;
                                    }
                                  }}
                                >
                                  {c.text.replace(/@(Manager|Developer|AAW|Cozentus|Client)\b/gi, '**$&**')}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div style={{ position: 'relative', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                    <textarea placeholder="Write a reply (Markdown supported)..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={() => { if(sendTyping && selectedRequest) sendTyping(selectedRequest.id); }} style={{ width: '100%', minHeight: '100px', background: 'transparent', border: 'none', padding: '14px 16px 46px', fontSize: '0.85rem', lineHeight: 1.6, outline: 'none', resize: 'none', fontFamily: 'inherit', color: 'var(--text-main)' }} />
                    <div style={{ position: 'absolute', bottom: '8px', right: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>{newComment.length > 0 ? `${newComment.length}` : ''}</span>
                      
                      <label className="btn btn-secondary btn-icon" style={{ cursor: 'pointer', padding: '6px' }} title="Attach File">
                        <Paperclip size={14} />
                        <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                      </label>

                      <button className="btn btn-primary" onClick={handlePostComment} disabled={!newComment.trim()} style={{ padding: '6px 14px', fontSize: '0.8rem' }}><Send size={12} /> Send</button>
                    </div>
                  </div>
                  {typingUsers && typingUsers[selectedRequest.id] && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic', animation: 'fadeIn 0.3s ease-in-out' }}>
                      {typingUsers[selectedRequest.id]} is typing...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolve Confirmation */}
      {resolveConfirm && selectedRequest && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setResolveConfirm(false); }}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="confirm-dialog">
              <div className="confirm-icon confirm-icon-success"><CheckCircle size={28} /></div>
              <div className="confirm-title">Mark as Resolved?</div>
              <div className="confirm-text">Set <strong>"{selectedRequest.title}"</strong> to Completed?</div>
              <div className="confirm-actions"><button className="btn btn-secondary" onClick={() => setResolveConfirm(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCloseRequest}><CheckCircle size={16} /> Confirm</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Blocker Modal */}
      {isBlockerModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsBlockerModalOpen(false); }}>
          <div className="modal-content">
            <div className="modal-header-bar" style={{ background: 'var(--status-danger)' }} />
            <div className="modal-header-content">
              <div className="flex justify-between items-start">
                <div>
                  <h2 style={{ marginBottom: '4px', fontSize: '1.3rem', color: 'var(--status-danger)' }}>Report Blocker</h2>
                  <p className="text-muted" style={{ fontSize: '0.88rem', margin: 0 }}>Notify the team about a project blocker.</p>
                </div>
                <button className="btn-ghost btn-icon" onClick={() => setIsBlockerModalOpen(false)}><X size={20} /></button>
              </div>
            </div>
            <form onSubmit={handleSubmitBlocker}>
              <div className="modal-body-content">
                <div className="form-group"><label className="form-label">Blocker Title</label><input type="text" className="form-control" required value={newBlocker.title} onChange={e => setNewBlocker({ ...newBlocker, title: e.target.value })} placeholder="e.g. Missing API keys" /></div>
                <div className="form-group"><label className="form-label">Description & Impact <span style={{fontSize:'0.75rem', fontWeight:'normal', color:'var(--text-faint)', marginLeft:'6px'}}>(Markdown supported)</span></label><textarea className="form-control outlook-style" required value={newBlocker.description} onChange={e => setNewBlocker({ ...newBlocker, description: e.target.value })} placeholder="What's blocked? What's needed to unblock?" /></div>
                <div className="form-group"><label className="form-label">Related Request (Optional)</label><select className="form-control" value={newBlocker.related_request_title} onChange={e => setNewBlocker({ ...newBlocker, related_request_title: e.target.value })}><option value="">-- None --</option>{requests.map(r => <option key={r.id} value={r.title}>{r.title}</option>)}</select></div>
              </div>
              <div className="modal-footer-content flex justify-between"><button type="button" className="btn btn-secondary" onClick={() => setIsBlockerModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-danger" style={{ background: 'var(--status-danger)', color: '#FFF' }}><ShieldAlert size={16} /> Report</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Blocker Discussion Modal */}
      {isBlockerDiscussionModalOpen && selectedBlocker && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsBlockerDiscussionModalOpen(false); }}>
          <div className="modal-content huge" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header-bar" style={{ background: 'var(--status-danger)' }} />
            <div className="modal-header-content" style={{ paddingBottom: 0 }}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="badge" style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger)', fontSize: '0.8rem', padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}><AlertTriangle size={14} style={{ marginRight: '4px' }} /> BLOCKER</span>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 800 }}>{selectedBlocker.title}</h2>
                </div>
                <button className="btn-ghost btn-icon" onClick={() => setIsBlockerDiscussionModalOpen(false)}><X size={20} /></button>
              </div>

              {/* Tabs */}
              <div className="flex gap-6 border-b" style={{ borderColor: 'var(--border-subtle)', marginBottom: '-1px' }}>
                <button className={`tab-button ${activeBlockerTab === 'details' ? 'active' : ''}`} onClick={() => setActiveBlockerTab('details')}>Details</button>
                <button className={`tab-button ${activeBlockerTab === 'discussion' ? 'active' : ''}`} onClick={() => setActiveBlockerTab('discussion')}>Discussion {(selectedBlocker.comments?.length > 0) && <span className="badge badge-primary ml-1" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{selectedBlocker.comments.length}</span>}</button>
              </div>
            </div>

            <div className="modal-body-content" style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-main)', padding: '24px 32px' }}>
              {activeBlockerTab === 'details' ? (
                <div className="flex-col gap-6">
                  {selectedBlocker.status === 'Resolved' && (
                    <div style={{ background: 'var(--status-success-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--status-success)', color: 'var(--status-success)' }}>
                      <strong className="flex items-center gap-2 mb-2"><CheckCircle2 size={18} /> Blocker Resolved</strong>
                      <div style={{ fontSize: '0.9rem' }}>This blocker was resolved on {new Date(selectedBlocker.resolved_at || selectedBlocker.created_at).toLocaleString()}.</div>
                    </div>
                  )}
                  
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="text-muted mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DESCRIPTION</div>
                    <div className="markdown-body" style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedBlocker.description}</ReactMarkdown>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                     <div className="glass-panel" style={{ padding: '16px' }}>
                       <div className="text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>REPORTED BY</div>
                       <div style={{ fontWeight: 600 }}>{selectedBlocker.reported_by}</div>
                     </div>
                     <div className="glass-panel" style={{ padding: '16px' }}>
                       <div className="text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>REPORTED ON</div>
                       <div style={{ fontWeight: 600 }}>{new Date(selectedBlocker.created_at).toLocaleDateString()}</div>
                     </div>
                  </div>

                  {role === 'Cozentus' && selectedBlocker.status !== 'Resolved' && (
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
                      <button className="btn btn-primary" style={{ background: 'var(--status-success)', borderColor: 'var(--status-success)', padding: '10px 20px', fontSize: '1rem' }} onClick={() => handleResolveBlocker(selectedBlocker.id)}><CheckCircle size={18} /> Mark as Resolved</button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', marginBottom: '16px' }}>
                    {(!selectedBlocker.comments || selectedBlocker.comments.length === 0) ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <p style={{ margin: 0 }}>No comments yet. Start the discussion!</p>
                      </div>
                    ) : (
                      selectedBlocker.comments.map(c => {
                        const isMe = c.author_role === role;
                        return (
                          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', padding: '0 4px' }}>
                              {!isMe && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>{c.author_role.charAt(0)}</div>}
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{isMe ? 'You' : c.author_role}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>{new Date(c.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="markdown-body chat-bubble" style={{ 
                              background: isMe ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                              color: isMe ? '#FFF' : 'var(--text-main)', 
                              padding: '10px 14px', 
                              borderRadius: '12px', 
                              borderTopRightRadius: isMe ? '2px' : '12px', 
                              borderTopLeftRadius: isMe ? '12px' : '2px', 
                              maxWidth: '85%', 
                              fontSize: '0.9rem', 
                              boxShadow: 'var(--shadow-sm)' 
                            }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.text}</ReactMarkdown>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div style={{ position: 'relative', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                    <textarea placeholder="Write a reply (Markdown supported)..." value={newBlockerComment} onChange={e => setNewBlockerComment(e.target.value)} onKeyDown={() => { if(sendTyping && selectedBlocker) sendTyping(selectedBlocker.id); }} style={{ width: '100%', minHeight: '100px', background: 'transparent', border: 'none', padding: '14px 16px 46px', fontSize: '0.85rem', lineHeight: 1.6, outline: 'none', resize: 'none', fontFamily: 'inherit', color: 'var(--text-main)' }} />
                    <div style={{ position: 'absolute', bottom: '8px', right: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="btn btn-primary" onClick={handlePostBlockerComment} disabled={!newBlockerComment.trim()} style={{ padding: '6px 14px', fontSize: '0.8rem' }}><Send size={12} /> Send</button>
                    </div>
                  </div>
                  {typingUsers && typingUsers[selectedBlocker.id] && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic', animation: 'fadeIn 0.3s ease-in-out' }}>
                      {typingUsers[selectedBlocker.id]} is typing...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditProjectModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEditProjectModalOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Project Details</h2>
              <button className="icon-btn" onClick={() => setIsEditProjectModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Manual RAG Status (Overrides automatic calculation)</label>
                <select className="form-control" value={editProjectData.manual_health} onChange={(e) => setEditProjectData({ ...editProjectData, manual_health: e.target.value })}>
                  <option value="Auto">Auto (Dynamic Calculation)</option>
                  <option value="Green">Green (On Track)</option>
                  <option value="Amber">Amber (Warning)</option>
                  <option value="Red">Red (Critical/Blocked)</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>
              <div className="form-group">
                <label>Detailed Description</label>
                <textarea 
                  className="form-control" 
                  rows="12"
                  value={editProjectData.description} 
                  onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
                  placeholder="Enter detailed project description (Markdown supported)..."
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setIsEditProjectModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                await handleUpdateProject({
                  description: editProjectData.description,
                  manual_health: editProjectData.manual_health === 'Auto' ? null : editProjectData.manual_health
                });
                setIsEditProjectModalOpen(false);
                showToast("Project details updated successfully");
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
