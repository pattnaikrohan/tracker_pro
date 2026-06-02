import { useState, useEffect, useContext } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, LineChart, Line
} from 'recharts';
import { Download, TrendingUp, Clock, CheckCircle2, AlertTriangle, Layers, MessageSquare, Target, Handshake, CalendarClock, Users, ShieldAlert } from 'lucide-react';
import { RoleContext, SyncContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const PIE_COLORS = ['#059669', '#2563EB', '#94A3B8', '#DC2626'];
const PRIORITY_COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid var(--border-subtle)',
      borderRadius: '10px', padding: '12px 16px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', fontSize: '0.85rem',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: p.color || 'var(--text-muted)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color || p.fill }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const { role } = useContext(RoleContext);
  const { syncKey } = useContext(SyncContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMetrics();
  }, [role, navigate, syncKey]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics/metrics`);
      if (res.ok) setMetrics(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleExportCSV = () => {
    if (!metrics) return;
    let csv = "data:text/csv;charset=utf-8,Metric,Value\n";
    csv += `Total Projects,${metrics.total_projects}\n`;
    csv += `Total Requests,${metrics.total}\n`;
    csv += `Completed,${metrics.completed}\n`;
    csv += `In Progress,${metrics.in_progress}\n`;
    csv += `Pending,${metrics.pending}\n`;
    csv += `Overdue,${metrics.overdue}\n`;
    csv += `Avg Resolution Days,${metrics.avg_resolution_days}\n`;
    csv += `Avg Active Progress,${metrics.avg_active_progress}%\n`;
    csv += `Total Comments,${metrics.total_comments}\n`;
    csv += `Requests With Estimates,${metrics.with_estimates}\n`;
    csv += `Agreed Estimates,${metrics.agreed_count}\n`;
    csv += `Avg Estimation Variance,${metrics.avg_estimation_variance} days\n`;

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", "tracker_analytics.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportPDF = () => {
    const element = document.getElementById('analytics-report-content');
    if (!element) return;
    
    // Add a quick class to hide export buttons if we wanted
    const opt = {
      margin: 10,
      filename: 'AAW_Analytics_Report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    import('html2pdf.js').then((html2pdf) => {
      html2pdf.default().set(opt).from(element).save();
    });
  };

  if (!metrics) {
    return (
      <div className="app-loading" style={{ height: '60vh' }}>
        <div className="spinner-dark" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
        <div style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Loading analytics...</div>
      </div>
    );
  }

  const statusData = [
    { name: 'Completed', value: metrics.completed },
    { name: 'In Progress', value: metrics.in_progress },
    { name: 'Pending', value: metrics.pending },
  ];

  const complexityData = Object.entries(metrics.complexity_distribution || {}).map(([k, v]) => ({ name: k, value: v })).filter(d => d.value > 0);
  const priorityData = Object.entries(metrics.priority_distribution || {}).map(([k, v]) => ({ name: k, value: v })).filter(d => d.value > 0);
  const typeData = Object.entries(metrics.type_distribution || {}).map(([k, v]) => ({ name: k, value: v })).filter(d => d.value > 0);
  const perProjectStats = metrics.per_project_stats || [];
  const estimationData = metrics.estimation_data || [];

  const projectHealthData = metrics.project_health_counts ? [
    { name: 'Green (On Track)', value: metrics.project_health_counts.Green || 0, color: '#059669' },
    { name: 'Amber (Warning)', value: metrics.project_health_counts.Amber || 0, color: '#D97706' },
    { name: 'Red (Critical)', value: metrics.project_health_counts.Red || 0, color: '#DC2626' },
  ].filter(d => d.value > 0) : [];

  const completionRate = metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0;

  // Radial bar data for completion
  const radialData = [{ name: 'Rate', value: completionRate, fill: '#4F46E5' }];

  const subtitle = role === 'Manager' ? 'Team performance, appraisal metrics, and comprehensive project insights.' : 'Project health overview and change request analytics.';

  return (
    <div id="analytics-report-content" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap" style={{ gap: '16px' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.25rem', marginBottom: '4px' }}>
            {role === 'Manager' ? 'Manager Analytics' : 'Project Analytics'}
          </h1>
          <p className="text-muted" style={{ fontSize: '1rem' }}>{subtitle}</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={handleExportPDF}><Download size={18} /> Export PDF</button>
          <button className="btn btn-primary" onClick={handleExportCSV}><Download size={18} /> Export CSV</button>
        </div>
      </div>

      {/* ── Primary KPI Row ── */}
      <div className="kpi-grid mb-6">
        <div className="kpi-card kpi-indigo">
          <div className="kpi-info">
            <span className="kpi-label">Total Requests</span>
            <span className="kpi-value">{metrics.total}</span>
            <span className="kpi-sub">across {metrics.total_projects} projects</span>
          </div>
          <div className="kpi-icon-wrap"><Layers size={22} /></div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-info">
            <span className="kpi-label">Completion Rate</span>
            <span className="kpi-value">{completionRate}%</span>
            <span className="kpi-sub">{metrics.completed} resolved</span>
          </div>
          <div className="kpi-icon-wrap"><CheckCircle2 size={22} /></div>
        </div>
        <div className="kpi-card kpi-amber">
          <div className="kpi-info">
            <span className="kpi-label">Avg Resolution</span>
            <span className="kpi-value">{metrics.avg_resolution_days}<span style={{ fontSize: '0.9rem', fontWeight: 500 }}>d</span></span>
            <span className="kpi-sub">average time to close</span>
          </div>
          <div className="kpi-icon-wrap"><Clock size={22} /></div>
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-info">
            <span className="kpi-label">Overdue</span>
            <span className="kpi-value">{metrics.overdue}</span>
            <span className="kpi-sub">past deadline</span>
          </div>
          <div className="kpi-icon-wrap"><AlertTriangle size={22} /></div>
        </div>
      </div>

      {/* ── Secondary KPI Row ── */}
      <div className="kpi-grid mb-8">
        <div className="kpi-card kpi-blue">
          <div className="kpi-info">
            <span className="kpi-label">Active Pipeline</span>
            <span className="kpi-value">{metrics.in_progress + metrics.pending}</span>
            <span className="kpi-sub">{metrics.in_progress} active, {metrics.pending} queued</span>
          </div>
          <div className="kpi-icon-wrap"><TrendingUp size={22} /></div>
        </div>
        <div className="kpi-card kpi-indigo">
          <div className="kpi-info">
            <span className="kpi-label">Avg Progress</span>
            <span className="kpi-value">{metrics.avg_active_progress}%</span>
            <span className="kpi-sub">active requests</span>
          </div>
          <div className="kpi-icon-wrap"><Target size={22} /></div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-info">
            <span className="kpi-label">Engagement</span>
            <span className="kpi-value">{metrics.total_comments}</span>
            <span className="kpi-sub">{metrics.avg_comments_per_request} per request avg</span>
          </div>
          <div className="kpi-icon-wrap"><MessageSquare size={22} /></div>
        </div>
        <div className="kpi-card kpi-amber">
          <div className="kpi-info">
            <span className="kpi-label">Est. Variance</span>
            <span className="kpi-value">{metrics.avg_estimation_variance}<span style={{ fontSize: '0.9rem', fontWeight: 500 }}>d</span></span>
            <span className="kpi-sub">{metrics.agreed_count} agreed of {metrics.with_estimates} estimated</span>
          </div>
          <div className="kpi-icon-wrap"><Handshake size={22} /></div>
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-info">
            <span className="kpi-label">Active Blockers</span>
            <span className="kpi-value">{metrics.active_blockers}</span>
            <span className="kpi-sub">{metrics.total_blockers} total reported</span>
          </div>
          <div className="kpi-icon-wrap"><ShieldAlert size={22} /></div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        


        {/* Status Distribution */}
        <div className="chart-card" style={{ height: '400px' }}>
          <h3>Status Distribution</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} fontWeight={500} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Complexity Breakdown */}
        <div className="chart-card" style={{ height: '400px' }}>
          <h3>Complexity Breakdown</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={complexityData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#FFF">
                {complexityData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={v => <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        {priorityData.length > 0 && (
          <div className="chart-card" style={{ height: '400px' }}>
            <h3>Priority Distribution</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} fontWeight={500} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {priorityData.map((_, i) => <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Project Health Distribution */}
        {projectHealthData.length > 0 && (
          <div className="chart-card" style={{ height: '400px' }}>
            <h3>Project Health Distribution (Calendar Deadlines)</h3>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={projectHealthData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#FFF">
                  {projectHealthData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Request Types */}
        {typeData.length > 0 && (
          <div className="chart-card" style={{ height: '400px' }}>
            <h3>Request Types</h3>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#FFF">
                  {typeData.map((_, i) => <Cell key={i} fill={['#4F46E5', '#F59E0B', '#10B981', '#EF4444'][i % 4]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>



      {/* ── Estimation Comparison Table ── */}
      {estimationData.length > 0 && (
        <div className="chart-card mb-6">
          <h3 className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
            <Handshake size={20} color="var(--accent-primary)" /> Estimation Negotiation Overview
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                  {['Request', 'Client Est.', 'Dev Est.', 'Variance', 'Agreed'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: h === 'Request' ? 'left' : 'center',
                      fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estimationData.map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 600 }}>{e.client}d</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--status-info)', fontWeight: 600 }}>{e.dev}d</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 700,
                        background: e.variance === 0 ? 'var(--status-success-bg)' : e.variance <= 2 ? 'var(--status-warning-bg)' : 'var(--status-danger-bg)',
                        color: e.variance === 0 ? 'var(--status-success)' : e.variance <= 2 ? 'var(--status-warning)' : 'var(--status-danger)',
                      }}>
                        {e.variance === 0 ? 'Aligned' : `${e.variance}d off`}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {e.agreed ? (
                        <span style={{ color: 'var(--status-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <CheckCircle2 size={14} /> {e.agreed}d
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Per-Project Stats ── */}
      {perProjectStats.length > 0 && (
        <div className="chart-card mb-8">
          <h3 style={{ marginBottom: '16px' }}>Project-Level Breakdown</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                  {['Project', 'Health', 'Total', 'Done', 'Active', 'Pending', 'Critical', 'Avg Progress', 'Completion'].map(h => (
                    <th key={h} style={{
                      padding: '12px 14px', textAlign: h === 'Project' ? 'left' : 'center',
                      fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perProjectStats.map((p, i) => {
                  const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{p.project_title}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: p.health === 'Red' ? 'var(--status-danger-bg)' : p.health === 'Amber' ? 'var(--status-warning-bg)' : 'var(--status-success-bg)',
                          color: p.health === 'Red' ? 'var(--status-danger)' : p.health === 'Amber' ? 'var(--status-warning)' : 'var(--status-success)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: p.health === 'Red' ? 'var(--status-danger)' : p.health === 'Amber' ? 'var(--status-warning)' : 'var(--status-success)'
                          }} />
                          {p.health || 'Green'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>{p.total}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--status-success)', fontWeight: 600 }}>{p.completed}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--status-info)', fontWeight: 600 }}>{p.in_progress}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{p.pending}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: p.critical > 0 ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 700 }}>{p.critical}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div className="flex items-center gap-2 justify-center">
                          <div style={{ width: '50px', height: '5px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${p.avg_progress}%`, background: 'var(--accent-primary)', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{p.avg_progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div className="flex items-center gap-2 justify-center">
                          <div style={{ width: '50px', height: '5px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--status-success)' : 'var(--accent-primary)', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: pct === 100 ? 'var(--status-success)' : 'var(--text-main)' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
