import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaigns, employees, propositions as initialProps, workflowStatusLabels, type Proposition, type WorkflowStatus } from '../data/mockData';
import PropositionForm from '../components/PropositionForm';
import { useWorkflow } from '../context/WorkflowContext';
import { useUser } from '../context/UserContext';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const statusBg: Record<WorkflowStatus, string> = {
  valide: 'badge badge-success',
  en_cours: 'badge badge-warning',
  en_attente: 'badge badge-neutral',
  rejete: 'badge badge-error',
};

interface Props { campaignId: string; }

const stepStatusDot: Record<string, string> = { valide: '✓', en_cours: '●', en_attente: '○' };

export default function AugmentationDetail({ campaignId }: Props) {
  const navigate = useNavigate();
  const campaign = campaigns.find(c => c.id === campaignId)!
  const { getStepsView, completeTask } = useWorkflow();
  const { user } = useUser();;

  const [props, setProps] = useState<Proposition[]>(initialProps.filter(p => p.campaignId === campaignId));
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterEntite, setFilterEntite] = useState<string>('all');
  const [consolidationView, setConsolidationView] = useState(false);

  const eligibles = employees.filter(e => e.eligible && campaign.entites.includes(e.entite));
  const withProp = eligibles.map(emp => ({
    emp,
    prop: props.find(p => p.matricule === emp.matricule) ?? null,
  }));

  const filtered = withProp.filter(({ emp, prop }) => {
    const matchStatut = filterStatut === 'all'
      || (filterStatut === 'sans' && !prop)
      || (prop && prop.statut === filterStatut);
    const matchEntite = filterEntite === 'all' || emp.entite === filterEntite;
    return matchStatut && matchEntite;
  });

  const totalPropose = props.reduce((s, p) => s + p.montant, 0);
  const pct = campaign.enveloppe > 0 ? (totalPropose / campaign.enveloppe) * 100 : 0;
  const fillClass = pct > 95 ? 'danger' : pct > 80 ? 'warning' : '';
  const nbSaisis = props.length;
  const nbEligibles = eligibles.length;

  const handleOpen = (matricule: string) => { setSelectedEmp(matricule); setFormOpen(true); };

  const handleSubmit = (data: { montant: number; pourcentage: number; commentaire: string }) => {
    if (!selectedEmp) return;
    setProps(prev => {
      const existing = prev.find(p => p.matricule === selectedEmp);
      if (existing) {
        return prev.map(p => p.matricule === selectedEmp
          ? { ...p, ...data, dateModification: new Date().toISOString().slice(0, 10) }
          : p);
      }
      return [...prev, {
        id: `P_NEW_${Date.now()}`, campaignId, matricule: selectedEmp,
        statut: 'en_cours', auteur: 'Sophie Dupont',
        dateCreation: new Date().toISOString().slice(0, 10),
        dateModification: new Date().toISOString().slice(0, 10),
        ...data,
      }];
    });
  };

  const entities = [...new Set(eligibles.map(e => e.entite))];
  const selectedEmployee = employees.find(e => e.matricule === selectedEmp) ?? null;
  const existingProp = props.find(p => p.matricule === selectedEmp);

  // Workflow dynamique depuis le contexte
  const workflowSteps = getStepsView(campaignId, 'augmentation');
  const currentStep = workflowSteps.find(s => s.status === 'en_cours');
  const canAct = currentStep?.role === user.role;

  // Consolidation par entité
  const consolidation = entities.map(entite => {
    const empEntite = eligibles.filter(e => e.entite === entite);
    const propsEntite = props.filter(p => empEntite.some(e => e.matricule === p.matricule));
    return {
      entite,
      nbEligibles: empEntite.length,
      nbSaisis: propsEntite.length,
      totalMontant: propsEntite.reduce((s, p) => s + p.montant, 0),
      valides: propsEntite.filter(p => p.statut === 'valide').length,
    };
  });

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/campaigns')}>← Retour aux campagnes</button>
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>{campaign.nom}</h1>
            <p>Augmentations individuelles · {campaign.entites.join(', ')}</p>
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <span className="badge badge-success">Ouverte</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setConsolidationView(v => !v)}>
              {consolidationView ? '← Propositions' : '📊 Consolidation'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => alert('Export Excel/PDF de la synthèse')}>⬇️ Export</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-label">Enveloppe</div>
          <div className="kpi-value">{fmtEur(campaign.enveloppe)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Proposé</div>
          <div className="kpi-value" style={{ color: pct > 95 ? '#bb0000' : '#0a6ed1' }}>{fmtEur(totalPropose)}</div>
          <div className="kpi-sub">{pct.toFixed(1)}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Restant</div>
          <div className="kpi-value" style={{ color: '#1b7e39' }}>{fmtEur(campaign.enveloppe - totalPropose)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Saisis</div>
          <div className="kpi-value">{nbSaisis} / {nbEligibles}</div>
          <div className="kpi-sub">{((nbSaisis / nbEligibles) * 100).toFixed(0)}% couverts</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">En attente</div>
          <div className="kpi-value" style={{ color: '#e9730c' }}>
            {props.filter(p => p.statut === 'en_attente').length}
          </div>
          <div className="kpi-sub">validations directeur</div>
        </div>
      </div>

      {/* Barre progression budget */}
      <div className="section-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.4rem' }}>
          <span style={{ fontWeight: 600 }}>Consommation enveloppe</span>
          <span style={{ fontWeight: 700, color: pct > 95 ? '#bb0000' : pct > 80 ? '#e9730c' : '#0a6ed1' }}>{pct.toFixed(1)}%</span>
        </div>
        <div className="progress-bar-wrap" style={{ height: 14 }}>
          <div className={`progress-bar-fill ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        {pct > 80 && (
          <div style={{ marginTop: '.5rem', fontSize: '.8rem', color: pct > 95 ? '#bb0000' : '#a05000' }}>
            {pct > 95 ? '⚠ Enveloppe quasi épuisée – arbitrage requis avant toute nouvelle proposition.' : '⚠ Alerte : plus de 80% de l\'enveloppe consommée.'}
          </div>
        )}
      </div>

      {consolidationView ? (
        /* ── Vue consolidation ── */
        <div className="section-card">
          <div className="section-card-header">
            <h2>Consolidation par entité</h2>
            <button className="btn btn-primary btn-sm" onClick={() => alert('Export consolidation')}>⬇️ Export Excel</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Entité</th>
                <th>Éligibles</th>
                <th>Propositions saisies</th>
                <th>Taux couverture</th>
                <th>Montant total proposé</th>
                <th>Validées</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {consolidation.map(c => (
                <tr key={c.entite}>
                  <td style={{ fontWeight: 600 }}>{c.entite}</td>
                  <td>{c.nbEligibles}</td>
                  <td>{c.nbSaisis}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <div className="progress-bar-wrap" style={{ width: 60, margin: 0 }}>
                        <div className="progress-bar-fill" style={{ width: `${c.nbEligibles ? (c.nbSaisis / c.nbEligibles) * 100 : 0}%` }} />
                      </div>
                      <span style={{ fontSize: '.8rem' }}>{c.nbEligibles ? ((c.nbSaisis / c.nbEligibles) * 100).toFixed(0) : 0}%</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{fmtEur(c.totalMontant)}</td>
                  <td>{c.valides}</td>
                  <td>
                    <span className={c.nbSaisis === c.nbEligibles ? 'badge badge-success' : c.nbSaisis > 0 ? 'badge badge-warning' : 'badge badge-neutral'}>
                      {c.nbSaisis === c.nbEligibles ? '✓ Complet' : c.nbSaisis > 0 ? 'En cours' : 'Non démarré'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f5f6f7', fontWeight: 700 }}>
                <td>Total</td>
                <td>{eligibles.length}</td>
                <td>{props.length}</td>
                <td>{((props.length / eligibles.length) * 100).toFixed(0)}%</td>
                <td>{fmtEur(totalPropose)}</td>
                <td>{props.filter(p => p.statut === 'valide').length}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* ── Vue propositions ── */
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="section-card">
            <div className="section-card-header">
              <h2>Propositions ({filtered.length})</h2>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <select className="input-field" style={{ fontSize: '.8rem', padding: '.3rem .6rem' }}
                  value={filterEntite} onChange={e => setFilterEntite(e.target.value)}>
                  <option value="all">Toutes entités</option>
                  {entities.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select className="input-field" style={{ fontSize: '.8rem', padding: '.3rem .6rem' }}
                  value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                  <option value="all">Tous statuts</option>
                  <option value="sans">Sans proposition</option>
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="valide">Validé</option>
                </select>
              </div>
            </div>
            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              {filtered.map(({ emp, prop }) => (
                <div
                  key={emp.matricule}
                  style={{
                    padding: '.875rem 1.25rem',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: selectedEmp === emp.matricule ? '#e8f0fc' : '',
                    transition: 'background .1s',
                  }}
                  onClick={() => setSelectedEmp(emp.matricule)}
                  onMouseEnter={e => { if (selectedEmp !== emp.matricule) e.currentTarget.style.background = '#f9f9f9'; }}
                  onMouseLeave={e => { if (selectedEmp !== emp.matricule) e.currentTarget.style.background = ''; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: '.7rem', background: emp.genre === 'F' ? '#9c27b0' : '#0a6ed1' }}>
                        {emp.prenom[0]}{emp.nom[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{emp.prenom} {emp.nom}</div>
                        <div style={{ fontSize: '.72rem', color: '#6b6b6b' }}>{emp.grade} Éch.{emp.echelon} · {emp.entite}</div>
                      </div>
                    </div>
                    {prop
                      ? <span className={statusBg[prop.statut]}>{workflowStatusLabels[prop.statut]}</span>
                      : <span className="badge badge-neutral">Non saisi</span>
                    }
                  </div>
                  {prop && (
                    <div style={{ marginTop: '.5rem', display: 'flex', gap: '1rem', fontSize: '.8rem', color: '#6b6b6b' }}>
                      <span style={{ color: '#0a6ed1', fontWeight: 700 }}>+{prop.pourcentage.toFixed(1)}%</span>
                      <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{fmtEur(prop.montant)}</span>
                      <span>{prop.commentaire.slice(0, 40)}{prop.commentaire.length > 40 ? '…' : ''}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panneau droite : détail collaborateur */}
          <div>
            {selectedEmp ? (() => {
              const emp = employees.find(e => e.matricule === selectedEmp)!;
              const prop = props.find(p => p.matricule === selectedEmp);
              return (
                <>
                  <div className="section-card">
                    <div className="section-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div className="avatar" style={{ width: 40, height: 40, background: emp.genre === 'F' ? '#9c27b0' : '#0a6ed1' }}>
                          {emp.prenom[0]}{emp.nom[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{emp.prenom} {emp.nom}</div>
                          <div style={{ fontSize: '.75rem', color: '#6b6b6b' }}>{emp.matricule} · {emp.grade} Éch.{emp.echelon}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '1rem 1.25rem', display: 'grid', gap: '.6rem', fontSize: '.875rem' }}>
                      <Row label="Entité" val={emp.entite} />
                      <Row label="Division" val={emp.division} />
                      <Row label="Ancienneté" val={`${emp.anciennete} ans`} />
                      <Row label="Salaire actuel" val={<strong style={{ color: '#0a6ed1' }}>{fmtEur(emp.salaireActuel)}</strong>} />
                      <Row label="Dernier bonus" val={fmtEur(emp.historiqueRemuneration[2].bonus)} />
                      <Row label="Augm. N-1" val={`+${fmtEur(emp.historiqueRemuneration[2].augmentation)}`} />
                    </div>
                  </div>

                  {prop ? (
                    <div className="section-card">
                      <div className="section-card-header">
                        <h2>Proposition en cours</h2>
                        <span className={statusBg[prop.statut]}>{workflowStatusLabels[prop.statut]}</span>
                      </div>
                      <div style={{ padding: '1rem 1.25rem', display: 'grid', gap: '.75rem' }}>
                        <Row label="Augmentation" val={<span style={{ color: '#0a6ed1', fontWeight: 700, fontSize: '1.1rem' }}>+{prop.pourcentage.toFixed(1)}% · {fmtEur(prop.montant)}</span>} />
                        <Row label="Nouveau salaire" val={<strong style={{ color: '#1b7e39' }}>{fmtEur(emp.salaireActuel + prop.montant)}</strong>} />
                        <Row label="Saisi par" val={prop.auteur} />
                        <Row label="Commentaire" val={prop.commentaire} />
                      </div>
                      {campaign.statut === 'ouverte' && prop.statut !== 'valide' && (
                        <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', gap: '.5rem' }}>
                          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleOpen(emp.matricule)}>✏️ Modifier</button>
                          <button className="btn btn-ghost btn-sm" style={{ flex: 1, color: '#bb0000', borderColor: '#bb0000' }}
                            onClick={() => setProps(p => p.filter(x => x.matricule !== emp.matricule))}>
                            🗑 Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  ) : campaign.statut === 'ouverte' ? (
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '.75rem', padding: '.75rem' }}
                      onClick={() => handleOpen(emp.matricule)}>
                      + Saisir la proposition
                    </button>
                  ) : null}

                  {/* Historique rémunération */}
                  <div className="section-card" style={{ marginTop: '.75rem' }}>
                    <div className="section-card-header"><h2>Historique (3 ans)</h2></div>
                    <table className="data-table">
                      <thead><tr><th>Année</th><th>Salaire</th><th>Augm.</th><th>Bonus</th></tr></thead>
                      <tbody>
                        {[...emp.historiqueRemuneration].reverse().map(h => (
                          <tr key={h.annee}>
                            <td style={{ fontWeight: 600 }}>{h.annee}</td>
                            <td>{fmtEur(h.salaire)}</td>
                            <td style={{ color: '#1b7e39' }}>+{fmtEur(h.augmentation)}</td>
                            <td style={{ color: '#0a6ed1' }}>{fmtEur(h.bonus)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })() : (
              <div style={{ background: '#fff', border: '1px dashed #c9c9c9', borderRadius: '.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: '#a0a0a0', fontSize: '.9rem' }}>
                Sélectionnez un collaborateur
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow dynamique */}
      <div className="section-card">
        <div className="section-card-header">
          <h2>Workflow de validation</h2>
          {canAct && currentStep && (
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <span style={{ fontSize: '.8rem', color: '#0a6ed1', alignSelf: 'center' }}>
                Votre tour : <strong>{currentStep.libelle}</strong>
              </span>
              {currentStep.actions.includes('valider') && (
                <button className="btn btn-primary btn-sm" onClick={() => {
                  completeTask(campaignId, 'valider', `${user.prenom} ${user.nom}`);
                  alert(`Étape "${currentStep.libelle}" validée.`);
                }}>
                  ✓ Valider
                </button>
              )}
              {currentStep.actions.includes('rejeter') && (
                <button className="btn btn-ghost btn-sm" style={{ color: '#bb0000' }} onClick={() => {
                  completeTask(campaignId, 'rejeter', `${user.prenom} ${user.nom}`, 'Rejeté depuis la vue détail');
                  alert(`Étape "${currentStep.libelle}" rejetée.`);
                }}>
                  ✕ Rejeter
                </button>
              )}
              {currentStep.actions.includes('demander_info') && (
                <button className="btn btn-ghost btn-sm" onClick={() => alert('Demande d\'information envoyée')}>
                  ? Info
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: 0 }}>
          {workflowSteps.map((step, i) => (
            <div key={step.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i < workflowSteps.length - 1 && (
                <div style={{ position: 'absolute', top: 15, left: '50%', right: '-50%', height: 2, background: step.status === 'valide' ? '#1b7e39' : '#e5e5e5', zIndex: 0 }} />
              )}
              <div className={`workflow-dot ${step.status}`} style={{ zIndex: 1 }}>
                {stepStatusDot[step.status] ?? '○'}
              </div>
              <div style={{ fontSize: '.75rem', fontWeight: 600, color: '#1a1a1a', marginTop: '.4rem', textAlign: 'center' }}>
                {step.libelle}
              </div>
              <div style={{ fontSize: '.7rem', color: '#6b6b6b', textAlign: 'center' }}>
                {step.role}
              </div>
              <div style={{ fontSize: '.68rem', color: '#a0a0a0', textAlign: 'center' }}>
                {step.status === 'en_cours'
                  ? `SLA : ${step.delaiJours}j`
                  : step.completedAt
                    ? new Date(step.completedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                    : ''}
              </div>
            </div>
          ))}
        </div>

        {workflowSteps.length === 0 && (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#a0a0a0', fontSize: '.875rem' }}>
            Aucun template de workflow actif pour ce type de campagne.
            <br />
            <button className="btn btn-ghost btn-sm" style={{ marginTop: '.5rem' }} onClick={() => navigate('/admin')}>
              Configurer dans Administration →
            </button>
          </div>
        )}
      </div>

      <PropositionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        employee={selectedEmployee}
        campaign={campaign}
        existingMontant={existingProp?.montant ?? 0}
      />
    </>
  );
}

function Row({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#6b6b6b' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{val}</span>
    </div>
  );
}
