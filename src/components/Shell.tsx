import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { roleColors, type Role } from '../data/mockData';
import { applyEntityTheme } from '../config/themes';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';

// ── SVG Icons (style SAP Fiori) ────────────────────────────────────────────────
const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/>
    </svg>
  ),
  campaigns: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h4m-4 4h8"/>
    </svg>
  ),
  employees: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.85"/>
    </svg>
  ),
  reporting: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
    </svg>
  ),
  audit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
    </svg>
  ),
  bsi: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
    </svg>
  ),
};

// BSI retiré du sidebar (accessible via Collaborateurs → "Générer BSI" ou URL directe)
const NAV_ITEMS: { path: string; label: string; icon: React.ReactNode; roles: Role[] }[] = [
  { path: '/',           label: 'Accueil',            icon: icons.home,      roles: ['Manager', 'Directeur', 'RRH', 'DRH', 'SIRH'] },
  { path: '/campaigns',  label: 'Campagnes',          icon: icons.campaigns, roles: ['Directeur', 'RRH', 'DRH', 'SIRH'] },
  { path: '/employees',  label: 'Collaborateurs',     icon: icons.employees, roles: ['Directeur', 'RRH', 'DRH', 'SIRH'] },
  { path: '/reporting',  label: 'Reporting & Équité', icon: icons.reporting, roles: ['RRH', 'DRH', 'SIRH'] },
  { path: '/audit',      label: "Journal d'audit",    icon: icons.audit,     roles: ['DRH', 'SIRH'] },
  { path: '/admin',      label: 'Administration',     icon: icons.admin,     roles: ['SIRH'] },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, allUsers, switchUser } = useUser();
  const navigate = useNavigate();
  const navItems = NAV_ITEMS.filter(item => item.roles.includes(user.role));
  const showSidebar = navItems.length > 1;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, panelOpen, openPanel, closePanel, markRead, markAllRead } = useNotifications();

  // Applique le thème couleur de l'entité connectée
  useEffect(() => {
    applyEntityTheme(user.entite);
  }, [user.entite]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="app-layout">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--primary)',
        color: '#fff',
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.25rem',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
        position: 'relative',
        zIndex: 100,
        gap: '1rem',
      }}>
        {/* Logo + Titre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.875rem', minWidth: 0 }}>
          <div style={{
            width: 28, height: 28,
            background: 'rgba(255,255,255,.18)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '.85rem', flexShrink: 0,
          }}>
            R€
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>
              Gestion des Rémunérations
            </span>
            <span className="app-top-subtitle" style={{ opacity: .45, fontSize: '1rem' }}>|</span>
            <span className="app-top-subtitle" style={{ fontWeight: 500, fontSize: '.82rem', opacity: .85, whiteSpace: 'nowrap' }}>
              {user.entite}
            </span>
          </div>
        </div>

        {/* Actions droite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem' }}>
          {/* Cloche notifications */}
          <button
            className="notif-bell-btn"
            onClick={panelOpen ? closePanel : openPanel}
            aria-label="Notifications"
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {/* Séparateur */}
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.25)', margin: '0 .1rem' }} />

          {/* User switcher */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '.5rem',
                background: 'rgba(255,255,255,.12)',
                border: '1px solid rgba(255,255,255,.25)',
                borderRadius: '.375rem',
                padding: '.2rem .65rem .2rem .35rem',
                cursor: 'pointer',
                color: '#fff',
                fontFamily: 'inherit',
                transition: 'background var(--transition)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
            >
              <div className="avatar" style={{ background: 'rgba(255,255,255,.25)', width: 26, height: 26, fontSize: '.68rem' }}>
                {user.prenom[0]}{user.nom[0]}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '.8rem', fontWeight: 600, lineHeight: 1.1 }}>{user.prenom} {user.nom}</div>
                <div style={{ fontSize: '.68rem', opacity: .75, lineHeight: 1.2 }}>{user.role} · {user.entite}</div>
              </div>
              <span style={{ fontSize: '.65rem', opacity: .6, marginLeft: '.1rem' }}>▾</span>
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: '#fff', color: 'var(--text-primary)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
                minWidth: 272,
                overflow: 'hidden',
                zIndex: 200,
              }}>
                <div style={{ padding: '.55rem .9rem', borderBottom: '1px solid var(--border)', fontSize: '.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>
                  Changer de profil (démo)
                </div>
                {allUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { switchUser(u.id); setDropdownOpen(false); navigate('/'); }}
                    style={{
                      width: '100%', textAlign: 'left', border: 'none',
                      background: u.id === user.id ? 'var(--primary-bg)' : 'transparent',
                      padding: '.5rem .9rem',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '.6rem',
                      fontFamily: 'inherit',
                      borderLeft: `3px solid ${u.id === user.id ? 'var(--primary)' : 'transparent'}`,
                      transition: 'background var(--transition)',
                    }}
                    onMouseEnter={e => { if (u.id !== user.id) (e.currentTarget as HTMLElement).style.background = 'var(--surface-raised)'; }}
                    onMouseLeave={e => { if (u.id !== user.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div className="avatar" style={{
                      width: 30, height: 30, fontSize: '.7rem',
                      background: roleColors[u.role] ?? 'var(--primary)',
                      color: '#fff', flexShrink: 0,
                    }}>
                      {u.prenom[0]}{u.nom[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: '.85rem', fontWeight: u.id === user.id ? 700 : 500 }}>
                        {u.prenom} {u.nom}
                      </div>
                      <div style={{ fontSize: '.73rem', color: 'var(--text-secondary)', marginTop: '.05rem' }}>
                        <span style={{
                          display: 'inline-block', padding: '.05rem .35rem',
                          background: (roleColors[u.role] ?? '#888') + '22',
                          color: roleColors[u.role] ?? 'var(--text-secondary)',
                          borderRadius: 'var(--radius-sm)', fontWeight: 600, marginRight: '.3rem',
                        }}>{u.role}</span>
                        {u.entite}
                      </div>
                    </div>
                    {u.id === user.id && (
                      <span style={{ marginLeft: 'auto', fontSize: '.85rem', color: 'var(--primary)' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-content">
        {/* ── Sidebar — masquée si un seul item de navigation (ex: Manager) ── */}
        {showSidebar && <nav className="sidebar">
          {/* Périmètre utilisateur */}
          <div style={{ padding: '.875rem 1.25rem .625rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '.68rem', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, marginBottom: '.25rem' }}>
              Périmètre
            </div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '.9rem' }}>{user.entite}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-secondary)', marginTop: '.15rem' }}>
              {user.perimetre.map(p => (
                <span key={p} className="chip" style={{ marginRight: '.2rem', marginBottom: '.2rem' }}>{p}</span>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div style={{ overflowY: 'auto', flex: 1, paddingTop: '.25rem' }}>
            <div className="nav-section-label">Navigation</div>
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Footer sidebar */}
          <div style={{
            padding: '.75rem 1.25rem',
            borderTop: '1px solid var(--border)',
            fontSize: '.7rem',
            color: 'var(--text-disabled)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>v1.0.0 — SAP BTP</span>
              <span style={{
                background: import.meta.env.DEV ? 'var(--warning-bg)' : 'var(--success-bg)',
                color: import.meta.env.DEV ? 'var(--warning)' : 'var(--success)',
                borderRadius: 'var(--radius-sm)', padding: '.1rem .35rem',
                fontSize: '.62rem', fontWeight: 700,
              }}>
                {import.meta.env.DEV ? 'DEV' : 'PROD'}
              </span>
            </div>
            <div style={{ marginTop: '.2rem' }}>© {new Date().getFullYear()} {user.entite}</div>
          </div>
        </nav>}

        {/* ── Main ─────────────────────────────────────────────────── */}
        <main className="main-content">
          {children}
        </main>
      </div>

      {/* ── Mobile nav ───────────────────────────────────────────────── */}
      <nav className="mobile-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
          >
            <span className="mobile-nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>{item.icon}</span>
            <span>{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Panneau notifications ─────────────────────────────────────── */}
      {panelOpen && (
        <NotificationPanel
          notifications={notifications}
          onClose={closePanel}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      )}
    </div>
  );
}
