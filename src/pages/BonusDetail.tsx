import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// A FAIRE — Connexion SAP/CAP : remplacer les imports mockData :
//   campaigns    → getCampaignById(id)            — CAP /Campaigns(id)?$expand=BonusEntites
//   employees    → getEmployees()                  — S/4HANA ou SuccessFactors
//   propositions → getPropositions(campaignId)    — CAP /Propositions?$filter=campaignId eq '${id}'
// A FAIRE — Connexion Workflow : completeTask() via WorkflowContext (déjà branché)
import { campaigns, employees, propositions, workflowStatusLabels, type WorkflowStatus } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const dotSymbol: Record<WorkflowStatus, string> = { valide: '✓', en_cours: '●', en_attente: '○', rejete: '✕' };

interface Props { campaignId: string; }

export default function BonusDetail({ campaignId }: Props) {
  const navigate = useNavigate();
  const campaign = campaigns.find(c => c.id === campaignId)!;
  const [activeTab, setActiveTab] = useState<'calendrier' | 'entites' | 'propositions'>('calendrier');

  const campProps = propositions.filter(p => p.campaignId === campaignId);
  const bonusEntites = campaign.bonusEntites ?? [];
  const calendrier = campaign.calendrierBonus ?? [];

  const pct = campaign.enveloppe > 0 ? (campaign.consomme / campaign.enveloppe) * 100 : 0;
  const chartData = bonusEntites.map(b => ({ entite: b.entite, Enveloppe: b.enveloppe, Consommé: b.consomme }));

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/campaigns')}>← Retour aux campagnes</button>
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>{campaign.nom}</h1>
            <p>Campagne Bonus · {campaign.entites.join(', ')}</p>
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <span className="badge badge-error">Clôturée</span>
            <button className="btn btn-ghost btn-sm" onClick={() => alert('Export consolidé multi-entités')}>⬇️ Export consolidé</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-label">Enveloppe totale</div>
          <div className="kpi-value">{fmtEur(campaign.enveloppe)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Distribué</div>
          <div className="kpi-value" style={{ color: '#1b7e39' }}>{fmtEur(campaign.consomme)}</div>
          <div className="kpi-sub">{pct.toFixed(1)}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Non distribué</div>
          <div className="kpi-value">{fmtEur(campaign.enveloppe - campaign.consomme)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Population</div>
          <div className="kpi-value">{campaign.population.toLocaleString('fr-FR')}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Entités</div>
          <div className="kpi-value">{bonusEntites.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid #e5e5e5' }}>
        {(['calendrier', 'entites', 'propositions'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '.65rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === tab ? 700 : 500,
            color: activeTab === tab ? '#0a6ed1' : '#6b6b6b',
            borderBottom: `2px solid ${activeTab === tab ? '#0a6ed1' : 'transparent'}`,
            marginBottom: -2, fontSize: '.875rem', fontFamily: 'inherit',
          }}>
            {tab === 'calendrier' ? '📅 Calendrier & Workflow' : tab === 'entites' ? '🏢 Multi-entités' : '💰 Propositions'}
          </button>
        ))}
      </div>

      {/* Calendrier */}
      {activeTab === 'calendrier' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="section-card">
            <div className="section-card-header"><h2>Calendrier de la campagne</h2></div>
            <div style={{ padding: '1rem 1.5rem' }}>
              {calendrier.map((etape, i) => {
                const isLast = i === calendrier.length - 1;
                return (
                  <div key={i} style={{ display: 'flex', gap: '1rem', paddingBottom: isLast ? 0 : '1.25rem', position: 'relative' }}>
                    {!isLast && (
                      <div style={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: 2, background: etape.statut === 'valide' ? '#a5d6a7' : '#e5e5e5' }} />
                    )}
                    <div className={`workflow-dot ${etape.statut}`} style={{ zIndex: 1 }}>
                      {dotSymbol[etape.statut]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{etape.etape}</div>
                        <span className={`badge ${etape.statut === 'valide' ? 'badge-success' : etape.statut === 'en_cours' ? 'badge-warning' : 'badge-neutral'}`}>
                          {workflowStatusLabels[etape.statut]}
                        </span>
                      </div>
                      <div style={{ fontSize: '.78rem', color: '#6b6b6b', marginTop: '.2rem' }}>
                        {new Date(etape.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        {' → '}
                        {new Date(etape.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}{etape.responsable}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header"><h2>Workflow de validation</h2></div>
            <div style={{ padding: '1.25rem' }}>
              {campaign.workflowEtapes.map((etape, i) => (
                <div key={i} className="workflow-step">
                  <div className={`workflow-dot ${etape.statut}`}>{dotSymbol[etape.statut]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{etape.libelle}</div>
                      <span className={`badge ${etape.statut === 'valide' ? 'badge-success' : 'badge-neutral'}`}>
                        {workflowStatusLabels[etape.statut]}
                      </span>
                    </div>
                    <div style={{ fontSize: '.75rem', color: '#6b6b6b' }}>
                      {etape.role} {etape.dateAction && `· ${new Date(etape.dateAction).toLocaleDateString('fr-FR')}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Multi-entités */}
      {activeTab === 'entites' && (
        <div>
          <div className="section-card">
            <div className="section-card-header">
              <h2>Consommation par entité</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => alert('Export multi-entités')}>⬇️ Export</button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="entite" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 11, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => fmtEur(Number(v))} contentStyle={{ borderRadius: '.375rem', border: '1px solid #e5e5e5', fontSize: '.8rem' }} />
                  <Legend wrapperStyle={{ fontSize: '.8rem' }} />
                  <Bar dataKey="Enveloppe" fill="#cce0f5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Consommé" fill="#0a6ed1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header"><h2>Détail par entité</h2></div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entité</th>
                  <th>RRH responsable</th>
                  <th>Population</th>
                  <th>Enveloppe</th>
                  <th>Distribué</th>
                  <th>Taux</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {bonusEntites.map(b => {
                  const p = b.enveloppe > 0 ? (b.consomme / b.enveloppe) * 100 : 0;
                  return (
                    <tr key={b.entite}>
                      <td style={{ fontWeight: 600 }}>{b.entite}</td>
                      <td>{b.responsableRRH}</td>
                      <td>{b.population.toLocaleString('fr-FR')}</td>
                      <td>{fmtEur(b.enveloppe)}</td>
                      <td style={{ fontWeight: 600 }}>{fmtEur(b.consomme)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          <div className="progress-bar-wrap" style={{ width: 60, margin: 0 }}>
                            <div className="progress-bar-fill" style={{ width: `${Math.min(p, 100)}%` }} />
                          </div>
                          <span style={{ fontSize: '.8rem', fontWeight: 600, color: p > 98 ? '#bb0000' : '#1a1a1a' }}>{p.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td><span className="badge badge-success">✓ {workflowStatusLabels[b.statut]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f5f6f7', fontWeight: 700 }}>
                  <td colSpan={2}>Total</td>
                  <td>{campaign.population.toLocaleString('fr-FR')}</td>
                  <td>{fmtEur(campaign.enveloppe)}</td>
                  <td>{fmtEur(campaign.consomme)}</td>
                  <td style={{ color: '#0a6ed1' }}>{pct.toFixed(1)}%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Propositions */}
      {activeTab === 'propositions' && (
        <div className="section-card">
          <div className="section-card-header">
            <h2>Propositions de bonus ({campProps.length})</h2>
            <div style={{ fontSize: '.85rem', color: '#6b6b6b' }}>
              Total distribué : {fmtEur(campProps.reduce((s, p) => s + p.montant, 0))}
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Collaborateur</th>
                <th>Entité</th>
                <th>Grade</th>
                <th>Bonus accordé</th>
                <th>Saisi par</th>
                <th>Statut</th>
                <th>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {campProps.map(p => {
                const emp = employees.find(e => e.matricule === p.matricule);
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: '.7rem', background: emp?.genre === 'F' ? '#9c27b0' : '#0a6ed1' }}>
                          {emp?.prenom?.[0]}{emp?.nom?.[0]}
                        </div>
                        <span style={{ fontWeight: 600 }}>{emp?.prenom} {emp?.nom}</span>
                      </div>
                    </td>
                    <td>{emp?.entite}</td>
                    <td><span className="chip">{emp?.grade}</span></td>
                    <td style={{ fontWeight: 700, color: '#0a6ed1', fontSize: '1rem' }}>{fmtEur(p.montant)}</td>
                    <td style={{ fontSize: '.8rem' }}>{p.auteur}</td>
                    <td><span className="badge badge-success">✓ Validé</span></td>
                    <td style={{ fontSize: '.78rem', color: '#6b6b6b' }}>{p.commentaire}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
