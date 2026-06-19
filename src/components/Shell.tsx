import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { roleColors, type Role } from '../data/mockData';

const NAV_ITEMS: { path: string; label: string; icon: string; roles: Role[] }[] = [
  { path: '/',           label: 'Tableau de bord',   icon: '⊞', roles: ['Manager', 'Directeur', 'RRH', 'DRH', 'SIRH'] },
  { path: '/campaigns',  label: 'Campagnes',          icon: '📋', roles: ['Manager', 'Directeur', 'RRH', 'DRH', 'SIRH'] },
  { path: '/employees',  label: 'Collaborateurs',     icon: '👥', roles: ['Manager', 'Directeur', 'RRH', 'DRH', 'SIRH'] },
  { path: '/reporting',  label: 'Reporting & Équité', icon: '📊', roles: ['RRH', 'DRH', 'SIRH'] },
  { path: '/audit',      label: "Journal d'audit",    icon: '🔍', roles: ['DRH', 'SIRH'] },
  { path: '/admin',      label: 'Administration',     icon: '⚙️', roles: ['SIRH'] },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, allUsers, switchUser } = useUser();
  const navItems = NAV_ITEMS.filter(item => item.roles.includes(user.role));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      {/* Top Bar */}
      <header style={{
        background: '#0a6ed1',
        color: '#fff',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.25rem',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,.18)',
        position: 'relative',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-.01em' }}>
            SAP BTP
          </span>
          <span style={{ opacity: .4, fontSize: '1.1rem' }}>|</span>
          <span style={{ fontWeight: 600, fontSize: '.9rem', opacity: .95 }}>
            Gestion des Rémunérations
          </span>
        </div>

        {/* User / Role switcher */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: '.6rem',
              background: 'rgba(255,255,255,.12)',
              border: '1px solid rgba(255,255,255,.25)',
              borderRadius: '.375rem',
              padding: '.25rem .75rem .25rem .5rem',
              cursor: 'pointer',
              color: '#fff',
              fontFamily: 'inherit',
            }}
          >
            <div className="avatar" style={{ background: 'rgba(255,255,255,.2)', width: 28, height: 28, fontSize: '.7rem' }}>
              {user.prenom[0]}{user.nom[0]}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '.82rem', fontWeight: 600 }}>{user.prenom} {user.nom}</div>
              <div style={{ fontSize: '.7rem', opacity: .8 }}>{user.role} · {user.entite}</div>
            </div>
            <span style={{ fontSize: '.7rem', opacity: .7, marginLeft: '.2rem' }}>▾</span>
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#fff', color: '#1a1a1a',
              borderRadius: '.5rem',
              boxShadow: '0 8px 24px rgba(0,0,0,.18)',
              border: '1px solid #e5e5e5',
              minWidth: 260,
              overflow: 'hidden',
              zIndex: 200,
            }}>
              <div style={{ padding: '.6rem .9rem', borderBottom: '1px solid #e5e5e5', fontSize: '.72rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>
                Changer de profil (démo)
              </div>
              {allUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => { switchUser(u.id); setDropdownOpen(false); }}
                  style={{
                    width: '100%', textAlign: 'left', border: 'none',
                    background: u.id === user.id ? '#f0f6ff' : 'transparent',
                    padding: '.55rem .9rem',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '.65rem',
                    fontFamily: 'inherit',
                    borderLeft: `3px solid ${u.id === user.id ? '#0a6ed1' : 'transparent'}`,
                  }}
                >
                  <div className="avatar" style={{
                    width: 30, height: 30, fontSize: '.72rem',
                    background: roleColors[u.role] ?? '#888',
                    color: '#fff', flexShrink: 0,
                  }}>
                    {u.prenom[0]}{u.nom[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '.85rem', fontWeight: u.id === user.id ? 700 : 500, color: '#1a1a1a' }}>
                      {u.prenom} {u.nom}
                    </div>
                    <div style={{ fontSize: '.75rem', color: '#6b6b6b' }}>
                      <span style={{
                        display: 'inline-block', padding: '.05rem .4rem',
                        background: (roleColors[u.role] ?? '#888') + '22',
                        color: roleColors[u.role] ?? '#444',
                        borderRadius: '.25rem', fontWeight: 600, marginRight: '.35rem',
                      }}>{u.role}</span>
                      {u.entite}
                    </div>
                  </div>
                  {u.id === user.id && <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: '#0a6ed1' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="app-content">
        {/* Sidebar */}
        <nav className="sidebar">
          <div style={{ padding: '1rem 1.25rem .5rem', borderBottom: '1px solid #e5e5e5' }}>
            <div style={{ fontSize: '.75rem', color: '#a0a0a0', marginBottom: '.25rem' }}>Périmètre</div>
            <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: '.9rem' }}>{user.entite}</div>
            <div style={{ fontSize: '.72rem', color: '#6b6b6b', marginTop: '.15rem' }}>{user.perimetre.join(' · ')}</div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div className="nav-section-label">Navigation</div>
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div style={{
            padding: '.75rem 1.25rem',
            borderTop: '1px solid #e5e5e5',
            fontSize: '.72rem',
            color: '#a0a0a0',
          }}>
            <div>v1.0.0 – SAP BTP</div>
            <div style={{ marginTop: '.2rem' }}>© {new Date().getFullYear()} Groupe A</div>
          </div>
        </nav>

        {/* Main */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
