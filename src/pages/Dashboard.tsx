// A FAIRE — Connexion SAP/CAP : remplacer les imports mockData par des appels api.ts :
//   campaigns    → getCampaigns()      — CAP /Campaigns (OData V4)
//   employees    → getEmployees()      — S/4HANA API_EMPLOYEE_SRV ou SF Employee Central
//   propositions → getPropositions()  — CAP /Propositions (OData V4)
//   auditLogs    → getAuditLogs()     — CAP /AuditLogs (append-only)
//   budgetByEntity → getBudgetByEntity() — CAP /BudgetEvents (agrégé par entité)
//   workflowTasks → getPendingTasks() — BPA /task-instances?status=READY (via WorkflowContext)
// Utiliser React Query (useQuery) ou SWR pour la gestion du cache et du loading state.
import { campaigns, employees, propositions, auditLogs, budgetByEntity, campaignStatusLabels, campaignTypeLabels, workflowTasks } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import type { SessionUser } from '../context/UserContext';
import type { Employee, Proposition } from '../data/mockData';

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
  saisie: '✏️', validation: '✅', arbitrage: '⚖️',
  consolidation: '🗂️', admin: '⚙️', parametrage: '🔧',
};

function getMyTeam(user: SessionUser): Employee[] {
  if (user.matricule) {
    return employees.filter(e => e.manager === user.matricule && e.eligible);
  }
  return [];
}

// ── Vue Manager ───────────────────────────────────────────────────────────────

function ManagerDashboard({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const myTeam = getMyTeam(user);

  const openCampaign = campaigns.find(
    c => c.statut === 'ouverte' && c.entites.some(ent => myTeam.some(e => e.entite === ent))
  ) ?? null;

  const myProps: Proposition[] = openCampaign
    ? propositions.filter(p => p.campaignId === openCampaign.id && myTeam.some(e => e.matricule === p.matricule))
    : [];

  const nbSaisis = myTeam.filter(e => myProps.some(p => p.matricule === e.matricule)).length;
  const allDone = myTeam.length > 0 && nbSaisis === myTeam.length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Bonjour, {user.prenom}</h1>
          <p>
            {myTeam.length > 0
              ? `${myTeam.length} collaborateur${myTeam.length > 1 ? 's' : ''} dans votre équipe · ${user.perimetre.join(', ')}`
              : `Aucun collaborateur rattaché · ${user.perimetre.join(', ')}`}
          </p>
        </div>
        {allDone && (
          <span className="badge badge-success" style={{ fontSize: '.85rem', padding: '.3rem .75rem' }}>
            ✓ Toutes vos propositions sont saisies
          </span>
        )}
      </div>

      {openCampaign ? (
        <div className="section-card">
          {/* En-tête campagne */}
          <div style={{
            background: '#f0f6ff', borderRadius: '.5rem .5rem 0 0',
            padding: '1rem 1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid #dce8f7',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0a6ed1' }}>{openCampaign.nom}</div>
              <div style={{ fontSize: '.78rem', color: '#6b6b6b', marginTop: '.2rem' }}>
                Clôture le{' '}
                <strong style={{ color: '#1a1a1a' }}>
                  {new Date(openCampaign.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '.82rem', color: '#6b6b6b' }}>{nbSaisis}/{myTeam.length} saisis</span>
              <span className="badge badge-success">Ouverte</span>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/campaigns/${openCampaign.id}`)}>
                Saisir mes propositions →
              </button>
            </div>
          </div>

          {/* Liste équipe */}
          <div>
            {myTeam.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#a0a0a0' }}>
                Aucun collaborateur éligible dans votre périmètre.
              </div>
            ) : (
              myTeam.map(emp => {
                const prop = myProps.find(p => p.matricule === emp.matricule);
                return (
                  <div
                    key={emp.matricule}
                    onClick={() => navigate(`/campaigns/${openCampaign.id}`)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '1rem 1.25rem', borderBottom: '1px solid #f5f5f5',
                      cursor: 'pointer', transition: 'background .12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <div className="avatar" style={{ width: 38, height: 38, fontSize: '.75rem', background: emp.genre === 'F' ? '#9c27b0' : '#0a6ed1' }}>
                        {emp.prenom[0]}{emp.nom[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{emp.prenom} {emp.nom}</div>
                        <div style={{ fontSize: '.75rem', color: '#6b6b6b' }}>
                          {emp.grade} Éch.{emp.echelon} · {emp.division} · {fmtEur(emp.salaireActuel)}
                        </div>
                      </div>
                    </div>

                    {prop ? (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#0a6ed1', fontSize: '1rem' }}>
                          +{prop.pourcentage.toFixed(1)}%
                          <span style={{ fontWeight: 400, fontSize: '.85rem', color: '#6b6b6b', marginLeft: '.4rem' }}>
                            ({fmtEur(prop.montant)})
                          </span>
                        </div>
                        <span className={workflowBadge[prop.statut]} style={{ fontSize: '.7rem', marginTop: '.2rem', display: 'inline-block' }}>
                          {prop.statut === 'valide' ? '✓ Validé' : prop.statut === 'en_cours' ? 'En cours' : 'En attente'}
                        </span>
                      </div>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: '.78rem' }}>À saisir</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {!allDone && myTeam.length > 0 && (
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/campaigns/${openCampaign.id}`)}>
                Saisir mes propositions →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: '#fff', border: '1px dashed #c9c9c9', borderRadius: '.5rem',
          padding: '3rem', textAlign: 'center', color: '#a0a0a0', fontSize: '.9rem',
        }}>
          Aucune campagne ouverte pour votre périmètre actuellement.
        </div>
      )}
    </>
  );
}

// ── Vue Directeur ─────────────────────────────────────────────────────────────

function DirecteurDashboard({ user }: { user: SessionUser }) {
  const navigate = useNavigate();

  const myTasks = workflowTasks
    .filter(t => t.rolesEligibles.includes(user.role))
    .sort((a, b) => ({ critique: 0, urgente: 1, normale: 2 }[a.urgence] - { critique: 0, urgente: 1, normale: 2 }[b.urgence]));

  const openCampaigns = campaigns.filter(c => c.statut === 'ouverte');

  // Propositions à valider dans son périmètre
  const myPeriEmp = employees.filter(e =>
    user.perimetre.some(p => {
      const parts = p.split(' – ');
      return parts.length === 2 ? e.division === parts[0] && e.entite === parts[1] : e.entite === p;
    })
  );
  const pendingValidation = propositions.filter(p =>
    myPeriEmp.some(e => e.matricule === p.matricule) && (p.statut === 'en_attente' || p.statut === 'en_cours')
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Bonjour, {user.prenom}</h1>
          <p>Directeur · {user.perimetre.join(', ')}</p>
        </div>
        {pendingValidation.length > 0 && (
          <span style={{ background: '#ea580c22', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '.375rem', padding: '.3rem .75rem', fontSize: '.85rem', fontWeight: 600 }}>
            {pendingValidation.length} proposition{pendingValidation.length > 1 ? 's' : ''} à valider
          </span>
        )}
      </div>

      {/* Tâches */}
      {myTasks.length > 0 && (
        <div className="section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-card-header"><h2>Actions à réaliser</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', padding: '1rem 1.25rem' }}>
            {myTasks.map(task => {
              const s = urgenceStyle[task.urgence];
              const daysLeft = Math.ceil((new Date(task.echeance).getTime() - Date.now()) / 86400000);
              return (
                <div key={task.id} onClick={() => navigate(task.lien)}
                  style={{ border: `1px solid ${s.border}`, background: s.bg, borderRadius: '.5rem', padding: '1rem', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.4rem' }}>
                    <span>{typeIcon[task.type]}</span>
                    <span style={{ fontSize: '.68rem', fontWeight: 700, color: s.dot, textTransform: 'uppercase' }}>{s.label}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.3rem' }}>{task.titre}</div>
                  <div style={{ fontSize: '.78rem', color: '#555', marginBottom: '.5rem' }}>{task.description}</div>
                  <div style={{ fontSize: '.72rem', color: '#6b6b6b' }}>
                    Échéance : <strong style={{ color: daysLeft < 5 ? '#dc2626' : '#1a1a1a' }}>
                      {new Date(task.echeance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} (J-{daysLeft})
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Propositions en attente de validation */}
      {pendingValidation.length > 0 && (
        <div className="section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-card-header">
            <h2>Propositions à valider</h2>
            <span className="badge badge-warning">{pendingValidation.length} en attente</span>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Collaborateur</th><th>%</th><th>Montant</th><th>Saisi par</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {pendingValidation.map(p => {
                const emp = employees.find(e => e.matricule === p.matricule);
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/campaigns/${p.campaignId}`)}>
                    <td style={{ fontWeight: 600 }}>{emp?.prenom} {emp?.nom}</td>
                    <td style={{ color: '#0a6ed1', fontWeight: 700 }}>+{p.pourcentage.toFixed(1)}%</td>
                    <td>{fmtEur(p.montant)}</td>
                    <td style={{ fontSize: '.8rem', color: '#6b6b6b' }}>{p.auteur}</td>
                    <td><span className={workflowBadge[p.statut]}>
                      {p.statut === 'en_attente' ? 'En attente' : 'En cours'}
                    </span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Campagnes */}
      <div className="section-card">
        <div className="section-card-header">
          <h2>Campagnes actives</h2>
          <span style={{ fontSize: '.82rem', color: '#6b6b6b' }}>{openCampaigns.length} ouverte{openCampaigns.length > 1 ? 's' : ''}</span>
        </div>
        {openCampaigns.map(c => {
          const pct = c.enveloppe > 0 ? (c.consomme / c.enveloppe) * 100 : 0;
          return (
            <div key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)}
              style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                <div style={{ fontWeight: 600 }}>{c.nom}</div>
                <span className={statusBadgeClass[c.statut]}>{campaignStatusLabels[c.statut]}</span>
              </div>
              <div style={{ fontSize: '.78rem', color: '#6b6b6b', marginBottom: '.35rem' }}>
                {fmtEur(c.consomme)} / {fmtEur(c.enveloppe)} ({fmtPct(pct)})
              </div>
              <div className="progress-bar-wrap">
                <div className={`progress-bar-fill ${pct > 80 ? 'warning' : ''}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Vue DRH / RRH / SIRH ─────────────────────────────────────────────────────

function AdminDashboard({ user }: { user: SessionUser }) {
  const navigate = useNavigate();

  const totalEnveloppe = campaigns.reduce((s, c) => s + c.enveloppe, 0);
  const totalConsomme = campaigns.filter(c => c.statut !== 'brouillon').reduce((s, c) => s + c.consomme, 0);
  const openCampaigns = campaigns.filter(c => c.statut === 'ouverte').length;
  const pendingProps = propositions.filter(p => p.statut === 'en_attente' || p.statut === 'en_cours').length;
  const eligibleCount = employees.filter(e => e.eligible).length;

  const myTasks = workflowTasks
    .filter(t => t.rolesEligibles.includes(user.role))
    .sort((a, b) => ({ critique: 0, urgente: 1, normale: 2 }[a.urgence] - { critique: 0, urgente: 1, normale: 2 }[b.urgence]));
  const critiqueCnt = myTasks.filter(t => t.urgence === 'critique').length;

  return (
    <>
      <div className="page-header">
        <h1>Tableau de bord</h1>
        <p>Vue d'ensemble des campagnes de rémunération – {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Campagnes actives</div>
          <div className="kpi-value">{openCampaigns}</div>
          <div className="kpi-sub">sur {campaigns.length} campagnes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Budget total alloué</div>
          <div className="kpi-value">{fmtEur(totalEnveloppe)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Budget consommé</div>
          <div className="kpi-value">{fmtEur(totalConsomme)}</div>
          <div className="kpi-sub">{fmtPct((totalConsomme / totalEnveloppe) * 100)} de l'enveloppe</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Collaborateurs éligibles</div>
          <div className="kpi-value">{eligibleCount.toLocaleString('fr-FR')}</div>
          <div className="kpi-sub">sur {employees.length} chargés</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Propositions en attente</div>
          <div className="kpi-value" style={{ color: pendingProps > 0 ? '#e9730c' : '#1b7e39' }}>{pendingProps}</div>
          <div className="kpi-sub">action requise</div>
        </div>
      </div>

      {/* Actions */}
      <div className="section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
            <h2>Actions à réaliser</h2>
            {critiqueCnt > 0 && (
              <span style={{ background: '#dc2626', color: '#fff', borderRadius: '1rem', padding: '.1rem .55rem', fontSize: '.72rem', fontWeight: 700 }}>
                {critiqueCnt} critique{critiqueCnt > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span style={{ fontSize: '.8rem', color: '#6b6b6b' }}>{user.role} · {user.prenom} {user.nom}</span>
        </div>
        {myTasks.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#a0a0a0' }}>✓ Aucune action en attente.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', padding: '1rem 1.25rem' }}>
            {myTasks.map(task => {
              const s = urgenceStyle[task.urgence];
              const daysLeft = Math.ceil((new Date(task.echeance).getTime() - Date.now()) / 86400000);
              return (
                <div key={task.id} onClick={() => navigate(task.lien)}
                  style={{ border: `1px solid ${s.border}`, background: s.bg, borderRadius: '.5rem', padding: '1rem', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,.10)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                      <span>{typeIcon[task.type]}</span>
                      <span style={{ fontSize: '.68rem', fontWeight: 700, color: s.dot, textTransform: 'uppercase' }}>{s.label}</span>
                    </div>
                    {task.nbItems !== undefined && (
                      <span style={{ background: s.dot + '22', color: s.dot, borderRadius: '1rem', padding: '.1rem .5rem', fontSize: '.72rem', fontWeight: 700 }}>
                        {task.nbItems}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.3rem' }}>{task.titre}</div>
                  <div style={{ fontSize: '.78rem', color: '#555', marginBottom: '.65rem' }}>{task.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '.72rem', color: '#6b6b6b' }}>
                      <strong style={{ color: daysLeft < 5 ? '#dc2626' : daysLeft < 14 ? '#ea580c' : '#1a1a1a' }}>
                        {new Date(task.echeance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} (J-{daysLeft})
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
        <div className="section-card">
          <div className="section-card-header">
            <h2>Campagnes en cours</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/campaigns')}>Voir tout</button>
          </div>
          {campaigns.map(c => {
            const pct = c.enveloppe > 0 ? (c.consomme / c.enveloppe) * 100 : 0;
            return (
              <div key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)}
                style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background .12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.2rem' }}>{c.nom}</div>
                    <span className="chip">{campaignTypeLabels[c.type]}</span>
                  </div>
                  <span className={statusBadgeClass[c.statut]}>{campaignStatusLabels[c.statut]}</span>
                </div>
                <div style={{ fontSize: '.78rem', color: '#6b6b6b', marginBottom: '.35rem' }}>
                  {fmtEur(c.consomme)} / {fmtEur(c.enveloppe)} ({fmtPct(pct)})
                </div>
                <div className="progress-bar-wrap">
                  <div className={`progress-bar-fill ${pct > 95 ? 'danger' : pct > 80 ? 'warning' : ''}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div style={{ fontSize: '.75rem', color: '#a0a0a0', marginTop: '.25rem' }}>
                  {new Date(c.dateDebut).toLocaleDateString('fr-FR')} → {new Date(c.dateFin).toLocaleDateString('fr-FR')} · {c.population.toLocaleString('fr-FR')} collab.
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="section-card">
            <div className="section-card-header"><h2>Consommation budgétaire par entité</h2></div>
            <div style={{ padding: '1rem 1.25rem' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={budgetByEntity} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="entite" tick={{ fontSize: 12, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 11, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => fmtEur(Number(v))} labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: '.375rem', border: '1px solid #e5e5e5', fontSize: '.8rem' }} />
                  <Bar dataKey="enveloppe" name="Enveloppe" fill="#cce0f5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consomme" name="Consommé" fill="#0a6ed1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header">
              <h2>Dernières propositions</h2>
              <span className="badge badge-warning">{propositions.filter(p => p.statut !== 'valide').length} en attente</span>
            </div>
            <table className="data-table">
              <thead><tr><th>Collaborateur</th><th>%</th><th>Montant</th><th>Statut</th></tr></thead>
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
                <div style={{ fontSize: '.875rem' }}><strong>{log.utilisateur}</strong> <span style={{ color: '#6b6b6b' }}>({log.role})</span> — {log.action}</div>
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

// ── Composant principal ───────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useUser();

  if (user.role === 'Manager')   return <ManagerDashboard   user={user} />;
  if (user.role === 'Directeur') return <DirecteurDashboard user={user} />;
  return <AdminDashboard user={user} />;
}
