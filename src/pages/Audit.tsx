import { useState } from 'react';
import { auditLogs, auditParams, auditDroits, budgetEvents, type Role } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { exportAuditGeneralPdf, exportAuditParamsPdf, exportAuditDroitsPdf, exportAuditEnveloppesPdf } from '../utils/pdfExport';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const roleBadge: Record<Role, string> = {
  SIRH:      'badge badge-info',
  DRH:       'badge badge-info',
  RRH:       'badge badge-info',
  Directeur: 'badge badge-warning',
  Manager:   'badge badge-neutral',
};

const eventTypeConfig: Record<string, { color: string; icon: string; label: string }> = {
  allocation:   { color: '#0a6ed1', icon: '💰', label: 'Allocation' },
  consommation: { color: '#1b7e39', icon: '📤', label: 'Consommation' },
  arbitrage:    { color: '#a05000', icon: '⚖️', label: 'Arbitrage' },
  alerte:       { color: '#bb0000', icon: '⚠️', label: 'Alerte' },
};

// Budget chronologique pour chart
const budgetChartData = [
  { date: '01 Fév', cumulé: 450000, consommé: 0 },
  { date: '10 Fév', cumulé: 450000, consommé: 2600 },
  { date: '11 Fév', cumulé: 450000, consommé: 4280 },
  { date: '12 Fév', cumulé: 450000, consommé: 6600 },
  { date: '13 Fév', cumulé: 450000, consommé: 13510 },
  { date: '20 Fév', cumulé: 450000, consommé: 87500 },
  { date: '22 Fév', cumulé: 455000, consommé: 92500 },
];

export default function Audit() {
  const [activeTab, setActiveTab] = useState<'general' | 'parametres' | 'droits' | 'enveloppes'>('general');
  const [filterRole, setFilterRole] = useState('all');
  const [filterAction, setFilterAction] = useState('');
  const [filterCampagne, setFilterCampagne] = useState('all');
  const [filterEventType, setFilterEventType] = useState('all');

  const roles: Role[] = ['SIRH', 'DRH', 'RRH', 'Directeur', 'Manager'];
  const campagnes = [...new Set(auditParams.map(p => p.campagne))];

  const filteredGeneral = [...auditLogs]
    .filter(l => {
      const matchRole = filterRole === 'all' || l.role === filterRole;
      const matchSearch = !filterAction || l.action.toLowerCase().includes(filterAction.toLowerCase()) || l.details.toLowerCase().includes(filterAction.toLowerCase());
      return matchRole && matchSearch;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredParams = auditParams.filter(p =>
    filterCampagne === 'all' || p.campagne === filterCampagne
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredBudget = budgetEvents.filter(e =>
    filterEventType === 'all' || e.type === filterEventType
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <>
      <div className="page-header">
        <h1>Journal d'audit</h1>
        <p>Traçabilité complète · Qui, quand, quoi · Conforme RGPD</p>
      </div>

      {/* Bandeau conformité */}
      <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '.5rem', padding: '.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '.75rem', alignItems: 'center' }}>
        <span style={{ fontSize: '1.1rem' }}>🛡️</span>
        <div style={{ fontSize: '.85rem', color: '#1b5e20' }}>
          <strong>Journal d'audit activé</strong> – toutes les actions sont horodatées, non modifiables, conservées 5 ans (RGPD). Chiffrement AES-256 / TLS 1.3.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid #e5e5e5' }}>
        {([
          ['general',    '📋 Journal général'],
          ['parametres', '⚙️ Paramètres campagne'],
          ['droits',     '🔒 Droits & rôles'],
          ['enveloppes', '💰 Suivi enveloppes'],
        ] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '.65rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === tab ? 700 : 500,
            color: activeTab === tab ? '#0a6ed1' : '#6b6b6b',
            borderBottom: `2px solid ${activeTab === tab ? '#0a6ed1' : 'transparent'}`,
            marginBottom: -2, fontSize: '.875rem', fontFamily: 'inherit',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Journal général ── */}
      {activeTab === 'general' && (
        <div>
          <div className="toolbar">
            <input className="input-field" placeholder="Rechercher dans les actions…" value={filterAction}
              onChange={e => setFilterAction(e.target.value)} style={{ minWidth: 260 }} />
            <select className="input-field" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="all">Tous les rôles</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: '.85rem', color: '#6b6b6b' }}>{filteredGeneral.length} entrée(s)</span>
            <button className="btn btn-ghost btn-sm" onClick={() => exportAuditGeneralPdf(filteredGeneral, { role: filterRole, search: filterAction })}>⬇️ Export PDF</button>
          </div>
          <div className="section-card">
            <table className="data-table">
              <thead>
                <tr><th>Horodatage</th><th>Utilisateur</th><th>Rôle</th><th>Action</th><th>Entité</th><th>Détails</th></tr>
              </thead>
              <tbody>
                {filteredGeneral.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '.78rem' }}>
                      <div style={{ fontWeight: 500 }}>{new Date(log.timestamp).toLocaleDateString('fr-FR')}</div>
                      <div style={{ color: '#a0a0a0' }}>{new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                        <div className="avatar" style={{ width: 26, height: 26, fontSize: '.65rem', background: '#e5e5e5', color: '#1a1a1a' }}>
                          {log.utilisateur.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 500, fontSize: '.85rem' }}>{log.utilisateur}</span>
                      </div>
                    </td>
                    <td><span className={roleBadge[log.role] ?? 'badge badge-neutral'}>{log.role}</span></td>
                    <td style={{ fontWeight: 600, fontSize: '.875rem' }}>{log.action}</td>
                    <td><span className="chip">{log.entite}</span></td>
                    <td style={{ fontSize: '.8rem', color: '#6b6b6b', maxWidth: 280 }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Historique paramètres campagne ── */}
      {activeTab === 'parametres' && (
        <div>
          <div className="toolbar">
            <select className="input-field" value={filterCampagne} onChange={e => setFilterCampagne(e.target.value)}>
              <option value="all">Toutes les campagnes</option>
              {campagnes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: '.85rem', color: '#6b6b6b' }}>{filteredParams.length} modification(s)</span>
            <button className="btn btn-ghost btn-sm" onClick={() => exportAuditParamsPdf(filteredParams, filterCampagne)}>⬇️ Export PDF</button>
          </div>
          <div className="section-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Horodatage</th>
                  <th>Opérateur</th>
                  <th>Campagne</th>
                  <th>Champ modifié</th>
                  <th>Ancienne valeur</th>
                  <th>Nouvelle valeur</th>
                </tr>
              </thead>
              <tbody>
                {filteredParams.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontSize: '.78rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500 }}>{new Date(p.timestamp).toLocaleDateString('fr-FR')}</div>
                      <div style={{ color: '#a0a0a0' }}>{new Date(p.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.utilisateur}</td>
                    <td style={{ fontSize: '.8rem' }}><span className="chip">{p.campagne.split(' ').slice(0, 2).join(' ')}…</span></td>
                    <td style={{ fontWeight: 600 }}>{p.champ}</td>
                    <td>
                      <span style={{ textDecoration: 'line-through', color: '#bb0000', fontSize: '.85rem' }}>{p.ancienneValeur}</span>
                    </td>
                    <td>
                      <span style={{ color: '#1b7e39', fontWeight: 700, fontSize: '.85rem' }}>{p.nouvelleValeur}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Historique droits & rôles ── */}
      {activeTab === 'droits' && (
        <div>
          <div className="toolbar">
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: '.85rem', color: '#6b6b6b' }}>{auditDroits.length} changement(s)</span>
            <button className="btn btn-ghost btn-sm" onClick={() => exportAuditDroitsPdf([...auditDroits].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))}>⬇️ Export PDF</button>
          </div>
          <div className="section-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Horodatage</th>
                  <th>Opérateur</th>
                  <th>Utilisateur ciblé</th>
                  <th>Ancien rôle</th>
                  <th>Nouveau rôle</th>
                  <th>Ancien périmètre</th>
                  <th>Nouveau périmètre</th>
                </tr>
              </thead>
              <tbody>
                {[...auditDroits].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(d => (
                  <tr key={d.id}>
                    <td style={{ fontSize: '.78rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500 }}>{new Date(d.timestamp).toLocaleDateString('fr-FR')}</div>
                      <div style={{ color: '#a0a0a0' }}>{new Date(d.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{d.operateur}</td>
                    <td style={{ fontWeight: 600 }}>{d.utilisateurCible}</td>
                    <td>
                      <span style={{ textDecoration: d.ancienRole !== d.nouveauRole ? 'line-through' : 'none', color: d.ancienRole !== d.nouveauRole ? '#bb0000' : '#6b6b6b', fontSize: '.85rem' }}>
                        {d.ancienRole === '–' ? <span style={{ color: '#c0c0c0' }}>–</span> : d.ancienRole}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: d.ancienRole !== d.nouveauRole ? '#1b7e39' : '#6b6b6b', fontSize: '.85rem' }}>{d.nouveauRole}</span>
                    </td>
                    <td style={{ fontSize: '.8rem', color: '#6b6b6b' }}>{d.ancienPerimetre}</td>
                    <td style={{ fontSize: '.8rem', color: d.ancienPerimetre !== d.nouveauPerimetre ? '#1b7e39' : '#6b6b6b', fontWeight: d.ancienPerimetre !== d.nouveauPerimetre ? 600 : 400 }}>
                      {d.nouveauPerimetre}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Suivi enveloppes ── */}
      {activeTab === 'enveloppes' && (
        <div>
          {/* KPIs */}
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.5rem' }}>
            {Object.entries(eventTypeConfig).map(([type, cfg]) => {
              const count = budgetEvents.filter(e => e.type === type).length;
              const total = budgetEvents.filter(e => e.type === type).reduce((s, e) => s + e.montant, 0);
              return (
                <div key={type} className="kpi-card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                  <div className="kpi-label">{cfg.icon} {cfg.label}</div>
                  <div className="kpi-value" style={{ color: cfg.color }}>{count}</div>
                  <div className="kpi-sub">{fmtEur(total)}</div>
                </div>
              );
            })}
          </div>

          {/* Courbe évolution */}
          <div className="section-card" style={{ marginBottom: '1.5rem' }}>
            <div className="section-card-header"><h2>Évolution consommation – Augmentations 2026</h2></div>
            <div style={{ padding: '1.25rem' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={budgetChartData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 11, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => fmtEur(Number(v))} contentStyle={{ borderRadius: '.375rem', border: '1px solid #e5e5e5', fontSize: '.8rem' }} />
                  <Bar dataKey="cumulé" name="Enveloppe" fill="#cce0f5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consommé" name="Consommé" fill="#0a6ed1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tableau événements */}
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <select className="input-field" value={filterEventType} onChange={e => setFilterEventType(e.target.value)}>
              <option value="all">Tous types</option>
              {Object.entries(eventTypeConfig).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: '.85rem', color: '#6b6b6b' }}>{filteredBudget.length} événement(s)</span>
            <button className="btn btn-ghost btn-sm" onClick={() => exportAuditEnveloppesPdf(filteredBudget, filterEventType)}>⬇️ Export PDF</button>
          </div>
          <div className="section-card">
            <table className="data-table">
              <thead>
                <tr><th>Horodatage</th><th>Type</th><th>Campagne</th><th>Entité</th><th>Montant</th><th>Opérateur</th><th>Détails</th></tr>
              </thead>
              <tbody>
                {filteredBudget.map(e => {
                  const cfg = eventTypeConfig[e.type];
                  return (
                    <tr key={e.id}>
                      <td style={{ fontSize: '.78rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 500 }}>{new Date(e.timestamp).toLocaleDateString('fr-FR')}</div>
                        <div style={{ color: '#a0a0a0' }}>{new Date(e.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', padding: '.2rem .6rem', borderRadius: '1rem', background: `${cfg.color}15`, color: cfg.color, fontWeight: 700, fontSize: '.75rem' }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '.8rem' }}><span className="chip">{e.campagne.split(' ').slice(0, 2).join(' ')}…</span></td>
                      <td>{e.entite}</td>
                      <td style={{ fontWeight: 700, color: cfg.color }}>{fmtEur(e.montant)}</td>
                      <td style={{ fontSize: '.85rem' }}>{e.utilisateur}</td>
                      <td style={{ fontSize: '.8rem', color: '#6b6b6b', maxWidth: 240 }}>{e.details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
