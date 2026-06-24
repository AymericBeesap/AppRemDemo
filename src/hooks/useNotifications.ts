import { useState, useCallback } from 'react';
import type { Role } from '../data/mockData';

export type NotifType = 'workflow' | 'budget' | 'directive' | 'deadline' | 'info';

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  lien?: string;
  date: string;
  read: boolean;
  role?: Role;
}

// Notifications mock — A FAIRE : remplacer par un appel CAP ou BPA MyInbox
function buildMockNotifications(): AppNotification[] {
  const now = new Date();
  const DIRECTIVE_DATE = new Date('2026-06-30');
  const daysLeft = Math.ceil((DIRECTIVE_DATE.getTime() - now.getTime()) / 86400000);

  return [
    {
      id: 'N001',
      type: 'directive',
      title: 'Directive EU Transparence Salariale',
      body: `Transposition obligatoire dans ${daysLeft} jours (30/06/2026). Vérifiez les indicateurs H/F.`,
      lien: '/reporting',
      date: now.toISOString(),
      read: false,
    },
    {
      id: 'N002',
      type: 'workflow',
      title: 'Validation en attente — Augmentations 2026',
      body: '12 propositions attendent votre validation (Directeur Finance).',
      lien: '/campaigns/C001',
      date: new Date(now.getTime() - 3600000).toISOString(),
      read: false,
    },
    {
      id: 'N003',
      type: 'budget',
      title: 'Seuil budgétaire atteint',
      body: 'Entité 3 France — enveloppe consommée à 92%. Arbitrage requis.',
      lien: '/campaigns',
      date: new Date(now.getTime() - 7200000).toISOString(),
      read: false,
    },
    {
      id: 'N004',
      type: 'deadline',
      title: 'Clôture campagne Bonus — J-3',
      body: 'La campagne "Bonus Performance 2025" se ferme le 27/06/2026.',
      lien: '/campaigns/C002',
      date: new Date(now.getTime() - 86400000).toISOString(),
      read: true,
    },
    {
      id: 'N005',
      type: 'info',
      title: 'Campagne GPEC publiée',
      body: 'La campagne "GPEC 2026" est maintenant visible par les managers.',
      lien: '/campaigns/C003',
      date: new Date(now.getTime() - 2 * 86400000).toISOString(),
      read: true,
    },
  ];
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(buildMockNotifications);
  const [panelOpen, setPanelOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const openPanel = useCallback(() => setPanelOpen(true),  []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return { notifications, unreadCount, panelOpen, openPanel, closePanel, markRead, markAllRead };
}
