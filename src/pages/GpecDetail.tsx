import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaigns, workflowStatusLabels, type WorkflowStatus } from '../data/mockData';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const dotSymbol: Record<WorkflowStatus, string> = { valide: '✓', en_cours: '●', en_attente: '○', rejete: '✕' };

interface Props { campaignId: string; }

const niveauxCalendrier = [
  { niveau: 'N-2 Manager', role: 'Manager', dateDebut: '2026-06-01', dateFin: '2026-06-14', statut: 'en_attente' as WorkflowStatus },
  { niveau: 'N-1 Directeur', role: 'Directeur', dateDebut: '2026-06-15', dateFin: '2026-06-30', statut: 'en_attente' as WorkflowStatus },
  { niveau: 'RRH – Consolidation', role: 'RRH', dateDebut: '2026-07-01', dateFin: '2026-07-15', statut: 'en_attente' as WorkflowStatus },
  { niveau: 'DRH – Arbitrage final', role: 'DRH', dateDebut: '2026-07-16', dateFin: '2026-07-31', statut: 'en_attente' as WorkflowStatus },
];

export default function GpecDetail({ campaignId }: Props) {
  const navigate = useNavigate();
  const campaign = campaigns.find(c => c.id === campaignId)!;
  const regles = campaign.reglesGpec ?? [];
  const [activeTab, setActiveTab] = useState<'regles' | 'calendrier' | 'propositions'>('regles');
  const [filterGrade, setFilterGrade] = useState('all');

  const grades = [...new Set(regles.map(r => r.grade))].sort();
  const filtered = filterGrade === 'all' ? regles : regles.filter(r => r.grade === filterGrade);

  const totalEligibles = regles.reduce((s, r) => s + r.nbEligibles, 0);
  const totalAuto = regles.filter(r => r.avancementAuto).reduce((s, r) => s + r.nbEligibles, 0);
  const totalAccel = regles.filter(r => r.accelerationPossible).reduce((s, r) => s + r.nbEligibles, 0);

  // Simulation budget auto
  const budgetAutoEstime = regles
    .filter(r => r.avancementAuto)
    .reduce((s, r) => s + r.nbEligibles * 45000 * r.tauxAvancement / 100, 0);

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/campaigns')}>← Retour aux campagnes</button>
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>{campaign.nom}</h1>
            <p>GPEC par grade & échelon · {campaign.entites.join(', ')}</p>
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <span className="badge badge-neutral">Brouillon</span>
            <button className="btn btn-primary btn-sm" onClick={() => alert('Ouvrir la campagne GPEC')}>▶ Ouvrir la campagne</button>
          </div>
        </div>
      </div>

      {/* Alerte brouillon */}
      <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: '.5rem', padding: '.875rem 1.25rem', marginBottom: '1.5rem', fontSize: '.85rem', color: '#92400e' }}>
        📋 Cette campagne est en phase de paramétrage. Vérifiez les règles par grade avant ouverture aux managers.
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-label">Enveloppe</div>
          <div className="kpi-value">{fmtEur(campaign.enveloppe)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Éligibles</div>
          <div className="kpi-value">{totalEligibles.toLocaleString('fr-FR')}</div>
          <div className="kpi-sub">collaborateurs concernés</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avancement auto</div>
          <div className="kpi-value" style={{ color: '#1b7e39' }}>{totalAuto.toLocaleString('fr-FR')}</div>
          <div className="kpi-sub">sans proposition manager</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Accélération possible</div>
          <div className="kpi-value" style={{ color: '#a05000' }}>{totalAccel.toLocaleString('fr-FR')}</div>
          <div className="kpi-sub">sur proposition manager</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Budget auto estimé</div>
          <div className="kpi-value">{fmtEur(budgetAutoEstime)}</div>
          <div className="kpi-sub">base salaire moyen 45k€</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid #e5e5e5' }}>
        {(['regles', 'calendrier', 'propositions'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '.65rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === tab ? 700 : 500,
            color: activeTab === tab ? '#0a6ed1' : '#6b6b6b',
            borderBottom: `2px solid ${activeTab === tab ? '#0a6ed1' : 'transparent'}`,
            marginBottom: -2, fontSize: '.875rem', fontFamily: 'inherit',
          }}>
            {tab === 'regles' ? '⚙️ Règles par grade' : tab === 'calendrier' ? '📅 Calendrier multi-niveaux' : '✏️ Propositions managers'}
          </button>
        ))}
      </div>

      {/* Règles par grade */}
      {activeTab === 'regles' && (
        <div>
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <select className="input-field" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
              <option value="all">Tous grades</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-sm" onClick={() => alert('Modifier les règles GPEC')}>✏️ Modifier règles</button>
            <button className="btn btn-ghost btn-sm" onClick={() => alert('Export règles PDF')}>⬇️ Export</button>
          </div>

          <div className="section-card">
            <div className="section-card-header">
              <h2>Règles d'avancement et d'accélération</h2>
              <span style={{ fontSize: '.8rem', color: '#6b6b6b' }}>{filtered.length} règles affichées</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Échelon</th>
                  <th>Ancienneté min.</th>
                  <th>Avancement auto</th>
                  <th>Taux auto (%)</th>
                  <th>Accélération possible</th>
                  <th>Taux accél. (%)</th>
                  <th>Nb éligibles</th>
                  <th>Budget estimé</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '.2rem .6rem',
                        background: r.grade.startsWith('M') ? '#fff3e0' : '#e8f0fc',
                        color: r.grade.startsWith('M') ? '#a05000' : '#0a6ed1',
                        borderRadius: '.25rem', fontWeight: 700, fontSize: '.8rem',
                      }}>
                        {r.grade}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.echelon}</td>
                    <td>{r.conditionAnciennete} an{r.conditionAnciennete > 1 ? 's' : ''}</td>
                    <td>
                      {r.avancementAuto
                        ? <span className="badge badge-success">✓ Automatique</span>
                        : <span className="badge badge-neutral">Sur proposition</span>
                      }
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#1b7e39' }}>{r.tauxAvancement.toFixed(1)}%</span>
                    </td>
                    <td>
                      {r.accelerationPossible
                        ? <span className="badge badge-warning">✓ Oui</span>
                        : <span className="badge badge-neutral">–</span>
                      }
                    </td>
                    <td>
                      {r.accelerationPossible
                        ? <span style={{ fontWeight: 700, color: '#a05000' }}>{r.tauxAcceleration.toFixed(1)}%</span>
                        : <span style={{ color: '#c0c0c0' }}>–</span>
                      }
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.nbEligibles}</td>
                    <td style={{ fontSize: '.8rem', color: '#6b6b6b' }}>
                      ≈ {fmtEur(r.nbEligibles * 45000 * r.tauxAvancement / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f5f6f7', fontWeight: 700 }}>
                  <td colSpan={7}>Total</td>
                  <td>{filtered.reduce((s, r) => s + r.nbEligibles, 0)}</td>
                  <td>{fmtEur(filtered.reduce((s, r) => s + r.nbEligibles * 45000 * r.tauxAvancement / 100, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Légende */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '.5rem' }}>
            <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '.5rem', border: '1px solid #a5d6a7', fontSize: '.85rem' }}>
              <div style={{ fontWeight: 700, color: '#1b5e20', marginBottom: '.5rem' }}>✓ Avancement automatique</div>
              <div style={{ color: '#2e7d32' }}>L'augmentation est appliquée automatiquement pour tous les collaborateurs éligibles répondant au critère d'ancienneté, sans proposition manager requise.</div>
            </div>
            <div style={{ padding: '1rem', background: '#fff8e1', borderRadius: '.5rem', border: '1px solid #ffe082', fontSize: '.85rem' }}>
              <div style={{ fontWeight: 700, color: '#e65100', marginBottom: '.5rem' }}>⚡ Accélération sur proposition</div>
              <div style={{ color: '#bf360c' }}>Le manager peut proposer un taux d'avancement accéléré (supérieur au taux auto) pour les collaborateurs exceptionnels, dans la limite du taux d'accélération max.</div>
            </div>
          </div>
        </div>
      )}

      {/* Calendrier multi-niveaux */}
      {activeTab === 'calendrier' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="section-card">
            <div className="section-card-header"><h2>Calendrier de validation multi-niveaux</h2></div>
            <div style={{ padding: '1rem 1.5rem' }}>
              {niveauxCalendrier.map((n, i) => {
                const isLast = i === niveauxCalendrier.length - 1;
                const today = new Date('2026-06-18');
                const debut = new Date(n.dateDebut);
                const fin = new Date(n.dateFin);
                const isActive = today >= debut && today <= fin;
                const isPast = today > fin;
                const statusReal: WorkflowStatus = isPast ? 'valide' : isActive ? 'en_cours' : 'en_attente';
                return (
                  <div key={i} style={{ display: 'flex', gap: '1rem', paddingBottom: isLast ? 0 : '1.5rem', position: 'relative' }}>
                    {!isLast && (
                      <div style={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: 2, background: '#e5e5e5' }} />
                    )}
                    <div className={`workflow-dot ${statusReal}`} style={{ zIndex: 1 }}>
                      {dotSymbol[statusReal]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.25rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Niveau {i + 1} – {n.niveau}</div>
                        <span className={`badge ${statusReal === 'en_cours' ? 'badge-warning' : statusReal === 'valide' ? 'badge-success' : 'badge-neutral'}`}>
                          {workflowStatusLabels[statusReal]}
                        </span>
                      </div>
                      <div style={{ fontSize: '.78rem', color: '#6b6b6b', marginTop: '.25rem' }}>
                        Du {new Date(n.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au{' '}
                        {new Date(n.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '.75rem', color: '#a0a0a0' }}>Rôle : {n.role}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header"><h2>Paramètres de la campagne</h2></div>
            <div style={{ padding: '1.25rem', display: 'grid', gap: '.75rem', fontSize: '.875rem' }}>
              <Row label="Période" val={`${new Date(campaign.dateDebut).toLocaleDateString('fr-FR')} → ${new Date(campaign.dateFin).toLocaleDateString('fr-FR')}`} />
              <Row label="Entités" val={campaign.entites.join(', ')} />
              <Row label="Population éligible" val={`${campaign.population.toLocaleString('fr-FR')} collaborateurs`} />
              <Row label="Enveloppe" val={fmtEur(campaign.enveloppe)} />
              <Row label="Niveaux de validation" val="4 niveaux (N-2 → DRH)" />
              <Row label="Statut" val={<span className="badge badge-neutral">Brouillon</span>} />
            </div>
            <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => alert('Modifier les paramètres')}>✏️ Modifier</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => alert('Ouvrir la campagne')}>▶ Ouvrir</button>
            </div>
          </div>
        </div>
      )}

      {/* Propositions managers */}
      {activeTab === 'propositions' && (
        <div>
          <div style={{ padding: '2rem', background: '#fff', border: '1px dashed #c9c9c9', borderRadius: '.5rem', textAlign: 'center', color: '#6b6b6b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: '.5rem' }}>Campagne non encore ouverte</div>
            <div style={{ fontSize: '.875rem', marginBottom: '1rem' }}>
              Les propositions de managers seront disponibles ici dès l'ouverture de la campagne GPEC (prévue le 01/06/2026).
            </div>
            <button className="btn btn-primary" onClick={() => alert('Ouvrir la campagne GPEC')}>▶ Ouvrir la campagne</button>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '.6rem', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ color: '#6b6b6b' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{val}</span>
    </div>
  );
}
