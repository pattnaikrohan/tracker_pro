import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Activity, ArrowRight, Shield, MessageSquare, BarChart2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

const DEMO_ACCOUNTS = [
  { username: 'steve@aaw.com', password: 'Steve@123', label: 'Steve', role: 'AAW', desc: 'Submit requests & track projects', color: 'linear-gradient(135deg, #4F46E5, #7C3AED)', icon: <Shield size={20} /> },
  { username: 'claire@aaw.com', password: 'Claire@123', label: 'Claire', role: 'AAW', desc: 'Submit requests & track projects', color: 'linear-gradient(135deg, #4F46E5, #7C3AED)', icon: <Shield size={20} /> },
  { username: 'rohan@cozentus.com', password: 'Rohan@123', label: 'Rohan', role: 'Cozentus', desc: 'Update status & respond to requests', color: 'linear-gradient(135deg, #2563EB, #3B82F6)', icon: <MessageSquare size={20} /> },
  { username: 'abhishek@cozentus.com', password: 'Abhishek@123', label: 'Abhishek', role: 'Cozentus', desc: 'Update status & respond to requests', color: 'linear-gradient(135deg, #2563EB, #3B82F6)', icon: <MessageSquare size={20} /> },
  { username: 'sandeep@cozentus.com', password: 'Sandeep@123', label: 'Sandeep', role: 'Manager', desc: 'View analytics & team performance', color: 'linear-gradient(135deg, #059669, #10B981)', icon: <BarChart2 size={20} /> },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(API_BASE_URL + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('tracker_user', JSON.stringify(data));
        onLogin(data);
        navigate('/');
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Invalid credentials');
      }
    } catch (err) {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setError('');
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-main)',
    }}>
      {/* ── Left Hero Panel ── */}
      <div style={{
        flex: '0 0 45%',
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 30%, #4338CA 60%, #4F46E5 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top Left Logo */}
        <div style={{ position: 'absolute', top: '48px', left: '64px', zIndex: 10, animation: 'fadeIn 0.6s ease-out' }}>
          <img src="/aaw.png" alt="AAW Logo" style={{ height: '48px', objectFit: 'contain' }} />
        </div>

        {/* Decorative elements */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%',
          width: '400px', height: '400px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.03)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-5%',
          width: '300px', height: '300px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.04)',
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '10%',
          width: '150px', height: '150px',
          borderRadius: '50%',
          background: 'rgba(139, 92, 246, 0.15)',
          filter: 'blur(40px)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, animation: 'fadeSlideUp 0.6s ease-out' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            marginBottom: '48px'
          }}>
            <div style={{
              width: '48px', height: '48px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <Activity size={26} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
            }}>TrackerPro</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '3rem',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
          }}>
            Project Tracking,<br />
            <span style={{ color: 'rgba(196, 181, 253, 0.9)' }}>Simplified.</span>
          </h1>

          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(196, 181, 253, 0.7)',
            lineHeight: 1.7,
            marginBottom: '40px',
            maxWidth: '420px',
          }}>
            Manage change requests, track project health, and keep your team aligned — all in one place.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              'Real-time project status tracking',
              'Collaborative discussion threads',
              'Manager analytics & appraisal metrics'
            ].map((feat, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                color: 'rgba(196, 181, 253, 0.8)',
                fontSize: '0.95rem',
                animation: 'fadeSlideUp 0.5s ease-out both',
                animationDelay: `${0.3 + i * 0.1}s`,
              }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'rgba(167, 139, 250, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ArrowRight size={12} color="rgba(196, 181, 253, 0.9)" />
                </div>
                {feat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Login Panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        animation: 'fadeSlideUp 0.5s ease-out 0.2s both',
      }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          {/* Title */}
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              marginBottom: '8px',
              letterSpacing: '-0.03em',
            }}>Welcome back</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Sign in to continue to TrackerPro.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              color: 'var(--status-danger)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '24px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'fadeSlideDown 0.3s ease-out',
            }}>
              <Lock size={16} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}>Username</label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '16px',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-faint)',
                  display: 'flex', alignItems: 'center',
                }}>
                  <User size={18} />
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ paddingLeft: '44px', padding: '14px 16px 14px 44px' }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '16px',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-faint)',
                  display: 'flex', alignItems: 'center',
                }}>
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: '44px', padding: '14px 16px 14px 44px' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: 'var(--radius-sm)' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div style={{ marginTop: '40px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              marginBottom: '16px',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>Quick Login</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEMO_ACCOUNTS.map((acc, i) => (
                <button
                  key={acc.username}
                  onClick={() => fillDemo(acc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    width: '100%',
                    animation: 'fadeSlideUp 0.4s ease-out both',
                    animationDelay: `${0.4 + i * 0.08}s`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.2)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.08)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px',
                    borderRadius: '10px',
                    background: acc.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    {acc.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--text-main)',
                      marginBottom: '2px',
                    }}>{acc.label}</div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                    }}>{acc.desc}</div>
                  </div>
                  <ArrowRight size={16} color="var(--text-faint)" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
