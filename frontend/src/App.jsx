import React, { useState, createContext, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Activity, LayoutDashboard, BarChart2, LogOut, CheckCircle, XCircle, Info, X, Bell, ShieldAlert, MessageSquare, Target, BellRing, BellOff, Sun, Moon } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import GlobalSearch from './GlobalSearch';
import { API_BASE_URL, WS_BASE_URL } from './config';

// Role context so sub-pages know who is logged in
export const RoleContext = createContext();
// Toast context for global notifications
export const ToastContext = createContext();
// Sync context for WebSocket real-time updates
export const SyncContext = createContext();
// Theme context for Dark Mode
export const ThemeContext = createContext();

// ── Toast Component ──
function Toast({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    info: <Info size={18} />
  };

  return (
    <div className={`toast toast-${toast.type || 'success'}`}>
      <span className="toast-icon">{icons[toast.type || 'success']}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={() => onClose(toast.id)}>
        <X size={14} />
      </button>
      <div className="toast-progress" />
    </div>
  );
}

// ── Navigation with active detection ──
function NavLinks({ role }) {
  const location = useLocation();

  return (
    <nav className="header-nav">
      <Link
        to="/"
        className={`nav-link ${location.pathname === '/' || location.pathname.startsWith('/projects') ? 'active' : ''}`}
      >
        <LayoutDashboard size={18} /> Dashboard
      </Link>
      <Link
        to="/analytics"
        className={`nav-link ${location.pathname === '/analytics' ? 'active' : ''}`}
      >
        <BarChart2 size={18} /> Analytics
      </Link>
    </nav>
  );
}

// ── Notification Center ──
function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState(new Date(0).toISOString());
  const [displayReadTime, setDisplayReadTime] = useState(new Date(0).toISOString());
  const [clearedTimes, setClearedTimes] = useState({ All: new Date(0).toISOString(), Blockers: new Date(0).toISOString(), Mentions: new Date(0).toISOString(), System: new Date(0).toISOString() });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  
  const bellRef = useRef(null);
  const { syncKey } = React.useContext(SyncContext);
  const { role } = React.useContext(RoleContext);
  const { showToast } = React.useContext(ToastContext);
  const navigate = useNavigate();
  const knownIdsRef = useRef(new Set());

  useEffect(() => {
    if ("Notification" in window) {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    if (role) {
      const storedReadTime = localStorage.getItem(`tracker_last_read_${role}`) || new Date(0).toISOString();
      setLastReadTime(storedReadTime);
      setDisplayReadTime(storedReadTime);
      const storedCleared = localStorage.getItem(`tracker_cleared_times_${role}`);
      if (storedCleared) {
        setClearedTimes(JSON.parse(storedCleared));
      }
    }
  }, [role]);

  const togglePush = async () => {
    if (!("Notification" in window)) {
      showToast("Push notifications not supported in this browser.", "error");
      return;
    }
    if (Notification.permission === "granted") {
      showToast("Push notifications are already allowed in browser settings.", "info");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setPushEnabled(true);
      new Notification("Notifications Enabled", { body: "You will receive updates here." });
    } else {
      showToast("Permission denied for push notifications.", "error");
    }
  };

  const getCategory = (n) => {
    if (n.title.includes('Blocker')) return 'Blockers';
    if (n.title.includes('Mentioned') || n.title.includes('Comment')) return 'Mentions';
    return 'System';
  };

  const fetchNotifs = async () => {
    if (!role) return;
    try {
      const r = await fetch(`${API_BASE_URL}/api/notifications?role=${role}`);
      if (r.ok) {
        const newNotifs = await r.json();
        if (knownIdsRef.current.size > 0) {
          const freshNotifs = newNotifs.filter(n => {
            const cat = getCategory(n);
            return !knownIdsRef.current.has(n.id) && n.time > clearedTimes[cat] && n.time > clearedTimes.All;
          });
          freshNotifs.forEach(n => {
            showToast(`${n.title}: ${n.desc.substring(0, 40)}...`, n.title.includes('Blocker') ? 'error' : 'info');
            if (pushEnabled && document.visibilityState !== 'visible') {
              new Notification(n.title, { body: n.desc });
            }
          });
        }
        newNotifs.forEach(n => knownIdsRef.current.add(n.id));
        setNotifications(newNotifs);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [syncKey, role, pushEnabled, clearedTimes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOpen = () => {
    if (!isOpen && role) {
      const now = new Date().toISOString();
      setDisplayReadTime(lastReadTime);
      setLastReadTime(now);
      localStorage.setItem(`tracker_last_read_${role}`, now);
    }
    setIsOpen(!isOpen);
  };

  const handleClear = () => {
    if (role) {
      const now = new Date().toISOString();
      const updated = { ...clearedTimes, [activeTab]: now };
      if (activeTab === 'All') {
        updated.Blockers = now;
        updated.Mentions = now;
        updated.System = now;
      }
      setClearedTimes(updated);
      localStorage.setItem(`tracker_cleared_times_${role}`, JSON.stringify(updated));
    }
  };

  const handleNotificationClick = (n) => {
    setIsOpen(false);
    if (n.project_id) {
      if (n.request_id) {
        navigate(`/projects/${n.project_id}?request=${n.request_id}`);
      } else if (n.blocker_id) {
        navigate(`/projects/${n.project_id}?blocker=${n.blocker_id}`);
      } else {
        navigate(`/projects/${n.project_id}`);
      }
    }
  };

  // Compute visibilities
  const visibleForAll = notifications.filter(n => n.time > clearedTimes.All && n.time > clearedTimes[getCategory(n)]);
  
  const categorized = {
    All: visibleForAll,
    Blockers: visibleForAll.filter(n => getCategory(n) === 'Blockers'),
    Mentions: visibleForAll.filter(n => getCategory(n) === 'Mentions'),
    System: visibleForAll.filter(n => getCategory(n) === 'System')
  };

  const currentList = categorized[activeTab];
  const unreadCount = visibleForAll.filter(n => n.time > lastReadTime).length;

  return (
    <div ref={bellRef} style={{ position: 'relative', marginRight: '16px' }}>
      <button onClick={handleToggleOpen} className="btn-icon" style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
        <Bell size={20} />
        {unreadCount > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--status-danger)', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</span>}
      </button>
      
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '12px', width: '420px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', zIndex: 1000, overflow: 'hidden', animation: 'fadeSlideUp 0.2s ease-out' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Notifications</h4>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button onClick={togglePush} className="btn-icon" style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: pushEnabled ? 'var(--status-success)' : 'var(--text-muted)' }} title={pushEnabled ? "Push enabled" : "Enable Push"}>
                  {pushEnabled ? <BellRing size={16} /> : <BellOff size={16} />}
                </button>
                {currentList.length > 0 && (
                  <button onClick={handleClear} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    {activeTab === 'All' ? 'Clear All' : `Clear ${activeTab}`}
                  </button>
                )}
              </div>
            </div>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['All', 'Blockers', 'Mentions', 'System'].map(tab => {
                const count = categorized[tab].filter(n => n.time > lastReadTime).length;
                return (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    style={{ 
                      padding: '4px 12px', 
                      borderRadius: 'var(--radius-full)', 
                      border: 'none', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: activeTab === tab ? 'var(--text-main)' : 'var(--bg-hover)',
                      color: activeTab === tab ? 'var(--bg-main)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      transition: 'all 0.2s'
                    }}>
                    {tab}
                    {count > 0 && (
                      <span style={{ 
                        background: activeTab === tab ? 'var(--bg-main)' : 'var(--status-danger)', 
                        color: activeTab === tab ? 'var(--text-main)' : '#fff',
                        padding: '2px 6px', borderRadius: '10px', fontSize: '0.65rem' 
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {currentList.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>All caught up!</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>No new {activeTab !== 'All' ? activeTab.toLowerCase() : 'activity'} to show.</div>
              </div>
            ) : (
              currentList.map(n => {
                const isUnread = n.time > displayReadTime;
                const cat = getCategory(n);
                const isBlocker = cat === 'Blockers';
                const isComment = cat === 'Mentions';
                return (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    style={{ 
                      padding: '16px 20px', 
                      borderBottom: '1px solid var(--border-subtle)', 
                      background: isUnread ? 'var(--status-info-bg)' : 'var(--bg-main)',
                      display: 'flex',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isUnread ? 'var(--status-info-bg)' : 'var(--bg-main)'}
                  >
                    {isUnread && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--accent-primary)' }} />}
                    
                    <div style={{ 
                      flexShrink: 0, 
                      width: '32px', height: '32px', 
                      borderRadius: '50%', 
                      background: isBlocker ? 'var(--status-danger-bg)' : isComment ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
                      color: isBlocker ? 'var(--status-danger)' : isComment ? 'var(--status-success)' : 'var(--status-warning)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isBlocker ? <ShieldAlert size={16} /> : isComment ? <MessageSquare size={16} /> : <Target size={16} />}
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{n.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.desc}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '8px', fontWeight: 500 }}>{new Date(n.time).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Header ──
function AppHeader({ user, onLogout }) {
  const avatarClass = user.role === 'AAW' ? 'avatar-aaw' : user.role === 'Cozentus' ? 'avatar-cozentus' : 'avatar-manager';

  return (
    <header className="app-header">
      <div className="container header-inner">
        <div className="header-left">
          <Link to="/" className="header-brand">
            <div className="header-brand-icon">
              <Activity size={20} />
            </div>
            <span>TrackerPro</span>
          </Link>
          <NavLinks role={user.role} />
        </div>

        <div className="header-right">
          <GlobalSearch />
          <NotificationBell />
          <button 
            className="btn-ghost btn-icon" 
            onClick={() => {
              const newTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
              if (newTheme === 'dark') document.body.classList.add('dark-theme');
              else document.body.classList.remove('dark-theme');
              localStorage.setItem('tracker_theme', newTheme);
              // We rely on the DOM for immediate update, and dispatch an event to sync state if needed
              window.dispatchEvent(new Event('themechange'));
            }}
            title="Toggle Theme"
          >
            {document.body.classList.contains('dark-theme') ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="header-user">
            <div className="header-user-info">
              <div className="header-user-name">{user.name}</div>
              <div className="header-user-role">{user.role}</div>
            </div>
            <div className={`header-avatar ${avatarClass}`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <button onClick={onLogout} className="btn-logout" title="Log Out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [syncKey, setSyncKey] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('tracker_theme') || 'light');
  
  useEffect(() => {
    if (theme === 'dark') document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
    
    const listener = () => {
      setTheme(document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    };
    window.addEventListener('themechange', listener);
    return () => window.removeEventListener('themechange', listener);
  }, [theme]);
  // Check for saved session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('tracker_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('tracker_user');
      }
    }
    setLoading(false);
  }, []);

  const [typingUsers, setTypingUsers] = useState({});
  const wsRef = useRef(null);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!user) return;
    let ws;
    let reconnectTimeout;
    
    const connectWS = () => {
      ws = new WebSocket(`${WS_BASE_URL}/api/ws`);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'UPDATE') {
            setSyncKey(prev => prev + 1);
          } else if (data.type === 'TYPING') {
            const { user: typingUser, request_id } = data;
            if (typingUser !== user.name) {
               setTypingUsers(prev => ({ ...prev, [request_id]: typingUser }));
               setTimeout(() => {
                 setTypingUsers(prev => {
                   if (prev[request_id] === typingUser) {
                     return { ...prev, [request_id]: null };
                   }
                   return prev;
                 });
               }, 3000);
            }
          }
        } catch (e) {}
      };
      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWS, 3000);
      };
    };
    
    connectWS();
    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [user]);

  const sendTyping = useCallback((request_id) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'TYPING', user: user.name, request_id }));
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('tracker_user');
    setUser(null);
  };

  // Toast system
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-icon">
          <Activity size={28} />
        </div>
        <div className="app-loading-text">Loading TrackerPro...</div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
    <RoleContext.Provider value={{ role: user?.role, user }}>
      <ToastContext.Provider value={{ showToast }}>
        <SyncContext.Provider value={{ syncKey, typingUsers, sendTyping }}>
          <BrowserRouter>
            {user ? (
              <>
                <AppHeader user={user} onLogout={handleLogout} />
                <main className="container mt-8 pb-12" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/projects/:id" element={<ProjectDetails />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </>
            ) : (
              <Routes>
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            )}
          </BrowserRouter>
        </SyncContext.Provider>

        {/* Toast Container */}
        <div className="toast-container">
          {toasts.map(t => (
            <Toast key={t.id} toast={t} onClose={removeToast} />
          ))}
        </div>
      </ToastContext.Provider>
    </RoleContext.Provider>
    </ThemeContext.Provider>
  );
}
