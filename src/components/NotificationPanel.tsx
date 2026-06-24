import { useNavigate } from 'react-router-dom';
import type { AppNotification, NotifType } from '../hooks/useNotifications';

const TYPE_ICON: Record<NotifType, string> = {
  workflow:  '⚡',
  budget:    '💰',
  directive: '🇪🇺',
  deadline:  '⏰',
  info:      'ℹ️',
};

const TYPE_BG: Record<NotifType, string> = {
  workflow:  'var(--warning-bg)',
  budget:    'var(--error-bg)',
  directive: 'var(--info-bg)',
  deadline:  'var(--warning-bg)',
  info:      'var(--surface-raised)',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000)  return `il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)} h`;
  return `il y a ${Math.floor(diff / 86400000)} j`;
}

interface Props {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export default function NotificationPanel({ notifications, onClose, onMarkRead, onMarkAllRead }: Props) {
  const navigate = useNavigate();
  const unread = notifications.filter(n => !n.read).length;

  function handleClick(n: AppNotification) {
    onMarkRead(n.id);
    if (n.lien) { navigate(n.lien); onClose(); }
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="notif-panel">
        <div className="notif-panel-header">
          <span>Notifications {unread > 0 && <span style={{ color: 'var(--error)', marginLeft: '.3rem' }}>({unread})</span>}</span>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            {unread > 0 && (
              <button className="btn btn-sm btn-ghost" onClick={onMarkAllRead} style={{ fontSize: '.75rem', padding: '.25rem .6rem' }}>
                Tout marquer lu
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, color: 'var(--text-secondary)', padding: '.2rem .4rem' }}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">🔕</div>
              <p>Aucune notification.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item${n.read ? '' : ' unread'}`}
                onClick={() => handleClick(n)}
              >
                <div className="notif-item-icon" style={{ background: TYPE_BG[n.type] }}>
                  {TYPE_ICON[n.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.read ? 500 : 700, fontSize: '.875rem', marginBottom: '.15rem' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-disabled)', marginTop: '.3rem' }}>
                    {timeAgo(n.date)}
                  </div>
                </div>
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-light)', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
