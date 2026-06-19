import { campaigns, employees, propositions, auditLogs, budgetByEntity, campaignStatusLabels, campaignTypeLabels, workflowTasks } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${n.toFixed(1)} %`;

const statusBadgeClass: Record<string, string> = {
  ouverte: 'badge badge-success',
  brouillon: 'badge badge-neutral',
  en_validation: 'badge badge-warning',
  cloturee: 'badge badge-error',
};

const workflowBadge: Record<string, string> = {
  valide: 'badge badge-success',
  en_cours: 'badge badge-warning',
  en_attente: 'badge badge-neutral',
  rejete: 'badge badge-error',
};

const urgenceStyle: Record<string, { border: string; bg: string; dot: string; label: string }> = {
  critique: { border: '#fca5a5', bg: '#fff5f5', dot: '#dc2626', label: 'Critique' },
  urgente:  { border: '#fed7aa', bg: '#fffbf5', dot: '#ea580c', label: 'Urgent' },
  normale:  { border: '#bfdbfe', bg: '#f0f6ff', dot: '#2563eb', label: 'Normal' },
};

const typeIcon: Record<string, string> = {
  saisie: '✏️',
  validation: '✅',
  arbitrage: '⚖️',
  consolidation: '🗂️',
  admin: '⚙️',
  parametrage: '🔧',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();

  const totalEnveloppe = campaigns.reduce((s, c) => s + c.enveloppe, 0);
  const totalConsomme = campaigns.filter(c => c.statut !== 'brouillon').reduce((s, c) => s + c.consomme, 0);
  const openCampaigns = campaigns.filter(c => c.statut === 'ouverte').length;
  const pendingProps = propositions.filter(p => p.statut === 'en_attente' || p.statut === 'en_cours').length;
  const eligibleCount = employees.filter(e => e.eligible).length;

  // Filter tasks by current user role, sorted: critique → urgente → normale
  const myTasks = workflowTasks
    .filter(t => t.rolesEligibles.includes(user.role))
    .sort((a, b) => {
      const order = { critique: 0, urgente: 1, normale: 2 };
      return order[a.urgence] - order[b.urgence];
    });

  const critiqueCnt = myTasks.filter(t => t.urgence === 'critique').length;

  return (
    <>
      <div className="page-header">
        <h1>Tableau de bord</h1>
        <p>Vue d'ensemble des campagnes de rémunération – {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Campagnes actives</div>
          <div className="kpi-value">{openCampaigns}</div>
          <div className="kpi-sub">sur {campaigns.length} campagnes au total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Budget total alloué</div>
          <div className="kpi-value">{fmtEur(totalEnveloppe)}</div>
          <div className="kpi-sub">toutes campagnes confondues</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Budget consommé</div>
          <div className="kpi-value">{fmtEur(totalConsomme)}</div>
          <div className="kpi-sub">{fmtPct((totalConsomme / totalEnveloppe) * 100)} de l'enveloppe</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Collaborateurs éligibles</div>
          <div className="kpi-value">{eligibleCount.toLocaleString('fr-FR')}</div>
          <div className="kpi-sub">sur {employees.length} collaborateurs chargés</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Propositions en attente</div>
          <div className="kpi-value" style={{ color: pendingProps > 0 ? '#e9730c' : '#1b7e39' }}>
            {pendingProps}
          </div>
          <div className="kpi-sub">action requise</div>
        </div>
      </div>

      {/* Actions à réaliser */}
      <div className="section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
            <h2>Actions à réaliser</h2>
            {critiqueCnt > 0 && (
              <span style={{
                background: '#dc2626', color: '#fff', borderRadius: '1rem',
                padding: '.1rem .55rem', fontSize: '.72rem', fontWeight: 700,
              }}>
                {critiqueCnt} critique{critiqueCnt > 1 ? 's' : ''}
              </span>
            )}
            {myTasks.length > 0 && (
              <span style={{
                background: '#f0f0f0', color: '#6b6b6b', borderRadius: '1rem',
                padding: '.1rem .55rem', fontSize: '.72rem', fontWeight: 600,
              }}>
                {myTasks.length} tâche{myTasks.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span style={{ fontSize: '.8rem', color: '#6b6b6b' }}>
            Rôle : <strong>{user.role}</strong> · {user.prenom} {user.nom}
          </span>
        </div>

        {myTasks.length === 0 ? (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#a0a0a0', fontSize: '.9rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>✓</div>
            Aucune action en attente pour votre profil.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', padding: '1rem 1.25rem' }}>
            {myTasks.map(task => {
              const style = urgenceStyle[task.urgence];
              const daysLeft = Math.ceil((new Date(task.echeance).getTime() - Date.now()) / 86400000);
              return (
                <div
                  key={task.id}
                  onClick={() => navigate(task.lien)}
                  style={{
                    border: `1px solid ${style.border}`,
                    background: style.bg,
                    borderRadius: '.5rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'box-shadow .15s, transform .1s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,.10)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                    (e.currentTarget as HTMLDivElement).style.transform = '';
                  }}
                >
                  {/* Urgence dot */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                      <span style={{ fontSize: '1rem' }}>{typeIcon[task.type]}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '.3rem',
                        fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase',
                        color: style.dot,
                      }}>
                        <span style={{ width: 7, height: 7, background: style.dot, borderRadius: '50%', display: 'inline-block' }} />
                        {style.label}
                      </span>
                    </div>
                    {task.nbItems !== undefined && (
                      <span style={{
                        background: style.dot + '22', color: style.dot,
                        borderRadius: '1rem', padding: '.1rem .5rem',
                        fontSize: '.72rem', fontWeight: 700,
                      }}>
                        {task.nbItems} élém.
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#1a1a1a', marginBottom: '.3rem', lineHeight: 1.35 }}>
                    {task.titre}
                  </div>
                  <div style={{ fontSize: '.78rem', color: '#555', marginBottom: '.65rem', lineHeight: 1.45 }}>
                    {task.description}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontSize: '.72rem', color: '#6b6b6b' }}>
                      Échéance : <strong style={{ color: daysLeft < 5 ? '#dc2626' : daysLeft < 14 ? '#ea580c' : '#1a1a1a' }}>
                        {new Date(task.echeance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {daysLeft >= 0 ? ` (J-${daysLeft})` : ' (dépassée)'}
                      </strong>
                    </span>
                    <span style={{ fontSize: '.75rem', color: '#0a6ed1', fontWeight: 600 }}>Accéder →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* Campagnes */}
        <div className="section-card">
          <div className="section-card-header">
            <h2>Campagnes en cours</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/campaigns')}>Voir tout</button>
          </div>
          <div>
            {campaigns.map(c => {
              const pct = c.enveloppe > 0 ? (c.consomme / c.enveloppe) * 100 : 0;
              const fillClass = pct > 95 ? 'danger' : pct > 80 ? 'warning' : '';
              return (
                <div key={c.id} style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  transition: 'background .12s',
                }}
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.9rem', color: '#1a1a1a', marginBottom: '.2rem' }}>{c.nom}</div>
                      <span className="chip">{campaignTypeLabels[c.type]}</span>
                    </div>
                    <span className={statusBadgeClass[c.statut]}>{campaignStatusLabels[c.statut]}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: '#6b6b6b', marginBottom: '.35rem' }}>
                    <span>{fmtEur(c.consomme)} consommés</span>
                    <span>/ {fmtEur(c.enveloppe)} alloués ({fmtPct(pct)})</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className={`progress-bar-fill ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div style={{ fontSize: '.75rem', color: '#a0a0a0', marginTop: '.25rem' }}>
                    {new Date(c.dateDebut).toLocaleDateString('fr-FR')} → {new Date(c.dateFin).toLocaleDateString('fr-FR')} · {c.population.toLocaleString('fr-FR')} collaborateurs
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget par entité */}
        <div>
          <div className="section-card">
            <div className="section-card-header">
              <h2>Consommation budgétaire par entité</h2>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={budgetByEntity} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="entite" tick={{ fontSize: 12, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 11, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => fmtEur(Number(v))}
                    labelStyle={{ fontWeight: 600 }}
                    contentStyle={{ borderRadius: '.375rem', border: '1px solid #e5e5e5', fontSize: '.8rem' }}
                  />
                  <Bar dataKey="enveloppe" name="Enveloppe" fill="#cce0f5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consomme" name="Consommé" fill="#0a6ed1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '.75rem', fontSize: '.78rem', color: '#6b6b6b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                  <span style={{ width: 12, height: 12, background: '#cce0f5', borderRadius: 2, display: 'inline-block' }} /> Enveloppe allouée
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                  <span style={{ width: 12, height: 12, background: '#0a6ed1', borderRadius: 2, display: 'inline-block' }} /> Consommé
                </span>
              </div>
            </div>
          </div>

          {/* Propositions en attente */}
          <div className="section-card">
            <div className="section-card-header">
              <h2>Dernières propositions</h2>
              <span className="badge badge-warning">{pendingProps} en attente</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Collaborateur</th>
                  <th>%</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {propositions.slice(0, 5).map(p => {
                  const emp = employees.find(e => e.matricule === p.matricule);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{emp?.prenom} {emp?.nom}</td>
                      <td style={{ color: '#0a6ed1', fontWeight: 600 }}>+{p.pourcentage.toFixed(1)}%</td>
                      <td>{fmtEur(p.montant)}</td>
                      <td><span className={workflowBadge[p.statut] ?? 'badge badge-neutral'}>
                        {p.statut === 'valide' ? 'Validé' : p.statut === 'en_cours' ? 'En cours' : p.statut === 'en_attente' ? 'En attente' : 'Rejeté'}
                      </span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Journal d'audit récent */}
      <div className="section-card">
        <div className="section-card-header">
          <h2>Activité récente (audit)</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit')}>Journal complet</button>
        </div>
        <div style={{ padding: '1rem 1.25rem' }}>
          {auditLogs.slice(0, 4).map(log => (
            <div key={log.id} style={{ display: 'flex', gap: '1rem', padding: '.6rem 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0a6ed1', marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.875rem', color: '#1a1a1a' }}>
                  <strong>{log.utilisateur}</strong> <span style={{ color: '#6b6b6b' }}>({log.role})</span> — {log.action}
                </div>
                <div style={{ fontSize: '.78rem', color: '#6b6b6b', marginTop: '.1rem' }}>{log.details}</div>
              </div>
              <div style={{ fontSize: '.75rem', color: '#a0a0a0', flexShrink: 0 }}>
                {new Date(log.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
