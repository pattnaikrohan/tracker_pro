import React, { useState, useEffect, useRef } from 'react';
import { Search, FolderOpen, Target, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const search = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/projects?include_archived=true');
        if (!res.ok) return;
        const projects = await res.json();
        
        let found = [];
        const q = query.toLowerCase();

        projects.forEach(p => {
          if (p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) {
            found.push({ type: 'project', id: p.id, title: p.title, desc: p.description, link: `/projects/${p.id}` });
          }
          
          (p.change_requests || []).forEach(r => {
            if (r.title.toLowerCase().includes(q) || r.request_text.toLowerCase().includes(q)) {
               found.push({ type: 'request', id: r.id, title: r.title, desc: r.request_text, link: `/projects/${p.id}?req=${r.id}` });
            }
            (r.comments || []).forEach(c => {
               if (c.text.toLowerCase().includes(q)) {
                 found.push({ type: 'comment', id: c.id, title: `Comment in ${r.title}`, desc: c.text, link: `/projects/${p.id}?req=${r.id}` });
               }
            });
          });
        });

        setResults(found.slice(0, 8)); // limit to top 8
        setIsOpen(true);
      } catch(e) {}
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const getIcon = (type) => {
    if (type === 'project') return <FolderOpen size={14} color="var(--accent-primary)" />;
    if (type === 'request') return <Target size={14} color="var(--status-info)" />;
    return <MessageSquare size={14} color="var(--text-muted)" />;
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', marginLeft: '16px' }}>
      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
      <input
        type="text"
        placeholder="Global Search (Ctrl+K)..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
        className="form-control"
        style={{ paddingLeft: '36px', width: '260px', padding: '8px 14px 8px 36px', fontSize: '0.85rem', borderRadius: 'var(--radius-full)' }}
      />
      {isOpen && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', zIndex: 1000, maxHeight: '400px', overflowY: 'auto' }}>
          {results.map((r, i) => (
            <div key={`${r.type}-${r.id}-${i}`} onClick={() => { setQuery(''); setIsOpen(false); navigate(r.link); }} style={{ padding: '12px 16px', borderBottom: i < results.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer', display: 'flex', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ marginTop: '2px' }}>{getIcon(r.type)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isOpen && results.length === 0 && query.trim().length >= 2 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
