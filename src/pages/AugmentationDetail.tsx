import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// A FAIRE — Connexion SAP/CAP : remplacer les imports mockData :
//   campaigns   → getCampaignById(id)             — CAP /Campaigns(id)?$expand=Population
//   employees   → getEmployeesByManager(matricule) — S/4HANA ou SF (filtré par périmètre)
//   propositions → getPropositions(campaignId)    — CAP /Propositions?$filter=campaignId eq '${id}'
// Pour upsertProposition() et deleteProposition() : voir src/services/api.ts
// A FAIRE — Connexion Workflow : completeTask() passe par WorkflowContext (déjà branché)
import { campaigns, employees, propositions as initialProps, workflowStatusLabels, type Proposition, type WorkflowStatus, type Employee } from '../data/mockData';
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

type ViewMode = 'propositions' | 'consolidation' | 'ajustements';
type AdjMode = 'pct' | 'montant';

interface Props { campaignId: string; }

const stepStatusDot: Record<string, string> = { valide: '✓', en_cours: '●', en_attente: '○' };

export default function AugmentationDetail({ campaignId }: Props) {
  const navigate = useNavigate();
  const campaign = campaigns.find(c => c.id === campaignId)!;
  const { getStepsView, completeTask } = useWorkflow();
  const { user } = useUser();

  const [props, setProps] = useState<Proposition[]>(initialProps.filter(p => p.campaignId === campaignId));
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterEntite, setFilterEntite] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('propositions');

  // ── Ajustements population ───────────────────────────────────────────────
  const [adjustments, setAdjustments] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      initialProps
        .filter(p => p.campaignId === campaignId)
        .map(p => [p.matricule, p.pourcentage])
    )
  );
  const [globalPct, setGlobalPct] = useState(0);
  const [adjMode, setAdjMode] = useState<AdjMode>('pct');
  const [adjFilterEntite, setAdjFilterEntite] = useState<string>('all');

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

  // Ajustements calculés
  const adjEligibles = eligibles.filter(e => adjFilterEntite === 'all' || e.entite === adjFilterEntite);
  const totalMasseSalariale = adjEligibles.reduce((s, e) => s + e.salaireActuel, 0);
  const totalAdjusted = adjEligibles.reduce((s, e) => {
    const pctAdj = adjustments[e.matricule] ?? 0;
    return s + Math.round(e.salaireActuel * pctAdj / 100);
  }, 0);
  const adjEnveloppePct = campaign.enveloppe > 0 ? (totalAdjusted / campaign.enveloppe) * 100 : 0;
  const avgAdjPct = totalMasseSalariale > 0 ? (totalAdjusted / totalMasseSalariale) * 100 : 0;

  const applyGlobal = (val: number) => {
    setGlobalPct(val);
    setAdjustments(prev => {
      const next = { ...prev };
      adjEligibles.forEach(emp => { next[emp.matricule] = val; });
      return next;
    });
  };

  const resetAdjustments = () => {
    setGlobalPct(0);
    setAdjustments({});
  };

  const convertToPropositions = () => {
    const newProps = adjEligibles
      .filter(e => (adjustments[e.matricule] ?? 0) > 0)
      .map(emp => {
        const pctAdj = adjustments[emp.matricule] ?? 0;
        const montant = Math.round(emp.salaireActuel * pctAdj / 100);
        const existing = props.find(p => p.matricule === emp.matricule);
        if (existing) {
          return { ...existing, montant, pourcentage: pctAdj, dateModification: new Date().toISOString().slice(0, 10) };
        }
        return {
          id: `P_ADJ_${emp.matricule}`, campaignId, matricule: emp.matricule,
          montant, pourcentage: pctAdj, commentaire: 'Ajustement global population',
          statut: 'en_cours' as WorkflowStatus, auteur: `${user.prenom} ${user.nom}`,
          dateCreation: new Date().toISOString().slice(0, 10),
          dateModification: new Date().toISOString().slice(0, 10),
        };
      });
    setProps(prev => {
      const kept = prev.filter(p => !adjEligibles.some(e => e.matricule === p.matricule));
      return [...kept, ...newProps];
    });
    setViewMode('propositions');
  };

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

  // ── Vue Manager : retour anticipé avant le rendu complexe ────────────────
  if (user.role === 'Manager') {
    const myTeam = user.matricule
      ? eligibles.filter(e => e.manager === user.matricule)
      : eligibles;
    return (
      <ManagerView
        campaign={campaign}
        myTeam={myTeam}
        allProps={props}
        setProps={setProps}
        campaignId={campaignId}
        userName={`${user.prenom} ${user.nom}`}
      />
    );
  }

  const entities = [...new Set(eligibles.map(e => e.entite))];
  const selectedEmployee = employees.find(e => e.matricule === selectedEmp) ?? null;
  const existingProp = props.find(p => p.matricule === selectedEmp);

  const workflowSteps = getStepsView(campaignId, 'augmentation');
  const currentStep = workflowSteps.find(s => s.status === 'en_cours');
  const canAct = currentStep?.role === user.role;

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
            <button
              className={`btn btn-sm ${viewMode === 'propositions' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('propositions')}>
              Propositions
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'ajustements' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('ajustements')}>
              Ajustements population
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'consolidation' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('consolidation')}>
              Consolidation
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

      {/* ── Vue : Ajustements population ────────────────────────────────────── */}
      {viewMode === 'ajustements' && (
        <div>
          {/* Panneau de contrôle global */}
          <div className="section-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1rem' }}>Ajustement global de la population</h2>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                  <select
                    className="input-field"
                    style={{ fontSize: '.8rem', padding: '.3rem .6rem' }}
                    value={adjFilterEntite}
                    onChange={e => setAdjFilterEntite(e.target.value)}>
                    <option value="all">Toutes entités</option>
                    {entities.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <button
                    className={`btn btn-sm ${adjMode === 'pct' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setAdjMode('pct')}>% Taux</button>
                  <button
                    className={`btn btn-sm ${adjMode === 'montant' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setAdjMode('montant')}>€ Montant</button>
                </div>
              </div>

              {/* Slider global */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '.85rem', color: '#6b6b6b', minWidth: 80 }}>Tous :</span>
                <input
                  type="range" min={0} max={15} step={0.1} value={globalPct}
                  onChange={e => applyGlobal(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#0a6ed1' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                  <button
                    onClick={() => applyGlobal(Math.max(0, +(globalPct - 0.5).toFixed(1)))}
                    style={btnSmStyle}>−</button>
                  <input
                    type="number" min={0} max={15} step={0.1} value={globalPct.toFixed(1)}
                    onChange={e => applyGlobal(Math.max(0, Math.min(15, parseFloat(e.target.value) || 0)))}
                    style={{ width: 64, padding: '.3rem .5rem', border: '1px solid #d5d5d5', borderRadius: '.375rem', fontSize: '.875rem', textAlign: 'right' }} />
                  <button
                    onClick={() => applyGlobal(Math.min(15, +(globalPct + 0.5).toFixed(1)))}
                    style={btnSmStyle}>+</button>
                  <span style={{ fontSize: '.85rem', color: '#6b6b6b' }}>%</span>
                </div>
              </div>

              {/* KPIs ajustements */}
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <KpiMini label="Population ajustée" val={`${adjEligibles.length} collab.`} />
                <KpiMini label="Taux moyen" val={`+${avgAdjPct.toFixed(2)}%`} color="#0a6ed1" />
                <KpiMini label="Impact masse salariale" val={`+${fmtEur(totalAdjusted)}`} color="#1b7e39" />
                <KpiMini
                  label="vs Enveloppe"
                  val={`${adjEnveloppePct.toFixed(1)}%`}
                  color={adjEnveloppePct > 100 ? '#bb0000' : adjEnveloppePct > 80 ? '#e9730c' : '#1b7e39'} />
                <KpiMini label="Restant enveloppe" val={fmtEur(campaign.enveloppe - totalAdjusted)} />
              </div>

              {/* Barre d'impact */}
              <div style={{ marginBottom: '.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: '#6b6b6b', marginBottom: '.3rem' }}>
                  <span>Impact vs enveloppe</span>
                  <span style={{ fontWeight: 700, color: adjEnveloppePct > 100 ? '#bb0000' : '#0a6ed1' }}>
                    {fmtEur(totalAdjusted)} / {fmtEur(campaign.enveloppe)}
                  </span>
                </div>
                <div className="progress-bar-wrap" style={{ height: 10 }}>
                  <div
                    className={`progress-bar-fill ${adjEnveloppePct > 95 ? 'danger' : adjEnveloppePct > 80 ? 'warning' : ''}`}
                    style={{ width: `${Math.min(adjEnveloppePct, 100)}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={resetAdjustments}>Réinitialiser</button>
                <button className="btn btn-primary btn-sm" onClick={convertToPropositions}
                  disabled={totalAdjusted === 0}>
                  → Convertir en propositions
                </button>
              </div>
            </div>
          </div>

          {/* Table population */}
          <div className="section-card" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Collaborateur</th>
                  <th>Grade</th>
                  <th>Entité</th>
                  <th>Salaire actuel</th>
                  <th style={{ minWidth: 260 }}>
                    Ajustement {adjMode === 'pct' ? '(%)' : '(€)'}
                  </th>
                  <th>{adjMode === 'pct' ? 'Montant €' : 'Taux %'}</th>
                  <th>Nouveau salaire</th>
                </tr>
              </thead>
              <tbody>
                {adjEligibles.map(emp => {
                  const adjPct = adjustments[emp.matricule] ?? 0;
                  const adjMontant = Math.round(emp.salaireActuel * adjPct / 100);

                  const setEmpAdj = (val: number) =>
                    setAdjustments(p => ({ ...p, [emp.matricule]: Math.max(0, Math.min(15, val)) }));

                  const setEmpAdjMontant = (montant: number) => {
                    const newPct = emp.salaireActuel > 0 ? (montant / emp.salaireActuel) * 100 : 0;
                    setAdjustments(p => ({ ...p, [emp.matricule]: Math.max(0, Math.min(15, newPct)) }));
                  };

                  const maxMontant = Math.ceil(emp.salaireActuel * 0.15 / 500) * 500;

                  return (
                    <tr key={emp.matricule}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: '.7rem', flexShrink: 0, background: emp.genre === 'F' ? '#9c27b0' : '#0a6ed1' }}>
                            {emp.prenom[0]}{emp.nom[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{emp.prenom} {emp.nom}</div>
                            <div style={{ fontSize: '.72rem', color: '#6b6b6b' }}>{emp.matricule}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="chip">{emp.grade} Éch.{emp.echelon}</span></td>
                      <td style={{ fontSize: '.8rem' }}>{emp.entite}</td>
                      <td style={{ fontWeight: 600 }}>{fmtEur(emp.salaireActuel)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                          <button onClick={() => adjMode === 'pct' ? setEmpAdj(+(adjPct - 0.5).toFixed(1)) : setEmpAdjMontant(adjMontant - 100)}
                            style={btnSmStyle}>−</button>
                          {adjMode === 'pct' ? (
                            <input type="range" min={0} max={15} step={0.1} value={adjPct}
                              onChange={e => setEmpAdj(parseFloat(e.target.value))}
                              style={{ flex: 1, minWidth: 80, accentColor: adjPct > 0 ? '#0a6ed1' : '#c9c9c9' }} />
                          ) : (
                            <input type="range" min={0} max={maxMontant} step={100} value={adjMontant}
                              onChange={e => setEmpAdjMontant(parseInt(e.target.value))}
                              style={{ flex: 1, minWidth: 80, accentColor: adjPct > 0 ? '#0a6ed1' : '#c9c9c9' }} />
                          )}
                          <button onClick={() => adjMode === 'pct' ? setEmpAdj(+(adjPct + 0.5).toFixed(1)) : setEmpAdjMontant(adjMontant + 100)}
                            style={btnSmStyle}>+</button>
                          {adjMode === 'pct' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.2rem' }}>
                              <input type="number" min={0} max={15} step={0.1} value={adjPct.toFixed(1)}
                                onChange={e => setEmpAdj(parseFloat(e.target.value) || 0)}
                                style={numInputStyle} />
                              <span style={{ fontSize: '.75rem', color: '#6b6b6b' }}>%</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.2rem' }}>
                              <input type="number" min={0} max={maxMontant} step={100} value={adjMontant}
                                onChange={e => setEmpAdjMontant(parseInt(e.target.value) || 0)}
                                style={{ ...numInputStyle, width: 72 }} />
                              <span style={{ fontSize: '.75rem', color: '#6b6b6b' }}>€</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: adjPct > 0 ? '#1b7e39' : '#a0a0a0', fontSize: '.85rem' }}>
                        {adjMode === 'pct'
                          ? (adjPct > 0 ? `+${fmtEur(adjMontant)}` : '—')
                          : (adjPct > 0 ? `+${adjPct.toFixed(2)}%` : '—')}
                      </td>
                      <td style={{ fontWeight: 600, color: adjPct > 0 ? '#0a6ed1' : '#6b6b6b' }}>
                        {fmtEur(emp.salaireActuel + adjMontant)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f5f6f7', fontWeight: 700 }}>
                  <td colSpan={3}>Total — {adjEligibles.length} collaborateurs</td>
                  <td>{fmtEur(totalMasseSalariale)}</td>
                  <td style={{ fontSize: '.82rem', color: '#0a6ed1' }}>
                    moy. +{avgAdjPct.toFixed(2)}%
                  </td>
                  <td style={{ color: '#1b7e39' }}>+{fmtEur(totalAdjusted)}</td>
                  <td>{fmtEur(totalMasseSalariale + totalAdjusted)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Vue : Consolidation ─────────────────────────────────────────────── */}
      {viewMode === 'consolidation' && (
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
      )}

      {/* ── Vue : Propositions ──────────────────────────────────────────────── */}
      {viewMode === 'propositions' && (
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
      <div className="section-card" style={{ marginTop: '1.5rem' }}>
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
              <div style={{ fontSize: '.7rem', color: '#6b6b6b', textAlign: 'center' }}>{step.role}</div>
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

// ── Vue Manager : saisie inline ───────────────────────────────────────────────

interface ManagerViewProps {
  campaign: ReturnType<typeof campaigns.find> & object;
  myTeam: Employee[];
  allProps: Proposition[];
  setProps: React.Dispatch<React.SetStateAction<Proposition[]>>;
  campaignId: string;
  userName: string;
}

function ManagerView({ campaign: c, myTeam, allProps, setProps, campaignId, userName }: ManagerViewProps) {
  const navigate = useNavigate();
  if (!c) return null;

  const nbSaisis = myTeam.filter(e => allProps.some(p => p.matricule === e.matricule)).length;

  const saveProp = (emp: Employee, pct: number, montant: number, commentaire: string) => {
    setProps(prev => {
      const existing = prev.find(p => p.matricule === emp.matricule);
      if (existing) {
        return prev.map(p => p.matricule === emp.matricule
          ? { ...p, montant, pourcentage: pct, commentaire, dateModification: new Date().toISOString().slice(0, 10) }
          : p);
      }
      return [...prev, {
        id: `P_MGR_${emp.matricule}`, campaignId, matricule: emp.matricule,
        montant, pourcentage: pct, commentaire,
        statut: 'en_cours' as WorkflowStatus, auteur: userName,
        dateCreation: new Date().toISOString().slice(0, 10),
        dateModification: new Date().toISOString().slice(0, 10),
      }];
    });
  };

  const deleteProp = (matricule: string) =>
    setProps(prev => prev.filter(p => p.matricule !== matricule));

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Retour</button>
      </div>

      <div className="page-header">
        <div>
          <h1>{c.nom}</h1>
          <p>
            Clôture le{' '}
            <strong>{new Date(c.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span style={{ fontSize: '.85rem', color: '#6b6b6b' }}>
            {nbSaisis}/{myTeam.length} saisi{nbSaisis > 1 ? 's' : ''}
          </span>
          {nbSaisis === myTeam.length && myTeam.length > 0
            ? <span className="badge badge-success">✓ Toutes les propositions sont saisies</span>
            : <span className="badge badge-success">Ouverte</span>}
        </div>
      </div>

      <div style={{ marginBottom: '.5rem', fontSize: '.85rem', color: '#6b6b6b', fontWeight: 600 }}>
        Mon équipe — {myTeam.length} collaborateur{myTeam.length !== 1 ? 's' : ''}
      </div>

      {myTeam.length === 0 ? (
        <div style={{ background: '#fff', border: '1px dashed #c9c9c9', borderRadius: '.5rem', padding: '3rem', textAlign: 'center', color: '#a0a0a0' }}>
          Aucun collaborateur éligible dans votre équipe pour cette campagne.
        </div>
      ) : (
        myTeam.map(emp => (
          <ManagerEmpCard
            key={emp.matricule}
            emp={emp}
            prop={allProps.find(p => p.matricule === emp.matricule) ?? null}
            onSave={(pct, montant, commentaire) => saveProp(emp, pct, montant, commentaire)}
            onDelete={() => deleteProp(emp.matricule)}
          />
        ))
      )}
    </>
  );
}

function ManagerEmpCard({
  emp, prop, onSave, onDelete,
}: {
  emp: Employee;
  prop: Proposition | null;
  onSave: (pct: number, montant: number, commentaire: string) => void;
  onDelete: () => void;
}) {
  const [pctStr, setPctStr] = useState(prop ? prop.pourcentage.toFixed(1) : '0');
  const [commentaire, setCommentaire] = useState(prop?.commentaire ?? '');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(!!prop);

  const pct = Math.max(0, Math.min(15, parseFloat(pctStr) || 0));
  const montant = Math.round(emp.salaireActuel * pct / 100);

  const handlePct = (val: string) => { setPctStr(val); setDirty(true); setSaved(false); };
  const handleComment = (val: string) => { setCommentaire(val); setDirty(true); setSaved(false); };

  const handleSave = () => {
    onSave(pct, montant, commentaire);
    setDirty(false);
    setSaved(true);
  };

  return (
    <div className="section-card" style={{ marginBottom: '1rem' }}>
      {/* En-tête */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 1.25rem', borderBottom: '1px solid #f0f0f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div className="avatar" style={{ width: 42, height: 42, background: emp.genre === 'F' ? '#9c27b0' : '#0a6ed1' }}>
            {emp.prenom[0]}{emp.nom[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{emp.prenom} {emp.nom}</div>
            <div style={{ fontSize: '.78rem', color: '#6b6b6b' }}>
              {emp.grade} Éch.{emp.echelon} · {emp.division} · {emp.anciennete} ans d'ancienneté
            </div>
          </div>
        </div>
        {saved && prop
          ? prop.statut === 'valide'
            ? <span className="badge badge-success">✓ Validé</span>
            : <span className="badge badge-warning">En attente de validation</span>
          : !saved && prop
            ? <span className="badge badge-neutral">Modifié</span>
            : <span className="badge badge-neutral">À saisir</span>}
      </div>

      {/* Corps */}
      <div style={{ padding: '1.25rem' }}>

        {/* Résumé chiffré */}
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '.72rem', color: '#6b6b6b', marginBottom: '.1rem' }}>Salaire actuel</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{fmtEur(emp.salaireActuel)}</div>
          </div>
          {pct > 0 && (
            <>
              <div>
                <div style={{ fontSize: '.72rem', color: '#6b6b6b', marginBottom: '.1rem' }}>Augmentation</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1b7e39' }}>+{fmtEur(montant)}</div>
              </div>
              <div>
                <div style={{ fontSize: '.72rem', color: '#6b6b6b', marginBottom: '.1rem' }}>Nouveau salaire</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0a6ed1' }}>{fmtEur(emp.salaireActuel + montant)}</div>
              </div>
            </>
          )}
        </div>

        {/* Slider + inputs */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', marginBottom: '.4rem' }}>
            <span style={{ color: '#6b6b6b' }}>Augmentation</span>
            <span style={{ fontWeight: 700, color: pct > 0 ? '#0a6ed1' : '#a0a0a0' }}>{pct.toFixed(1)} %</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input
              type="range" min={0} max={15} step={0.1} value={pct}
              onChange={e => handlePct(e.target.value)}
              style={{ flex: 1, accentColor: '#0a6ed1' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
              <input
                type="number" min={0} max={15} step={0.1} value={pctStr}
                onChange={e => handlePct(e.target.value)}
                style={{ width: 60, padding: '.3rem .5rem', border: '1px solid #d5d5d5', borderRadius: '.375rem', fontSize: '.9rem', textAlign: 'right' }}
              />
              <span style={{ fontSize: '.85rem', color: '#6b6b6b' }}>%</span>
              {pct > 0 && (
                <span style={{ fontSize: '.82rem', color: '#6b6b6b', marginLeft: '.25rem' }}>
                  = {fmtEur(montant)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Commentaire */}
        <textarea
          placeholder="Motif de l'augmentation (facultatif)…"
          value={commentaire}
          onChange={e => handleComment(e.target.value)}
          rows={2}
          style={{
            width: '100%', padding: '.5rem .75rem', border: '1px solid #d5d5d5',
            borderRadius: '.375rem', fontSize: '.85rem', fontFamily: 'inherit',
            resize: 'vertical', boxSizing: 'border-box', marginBottom: '1rem',
            outline: 'none',
          }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {prop ? (
            <button
              onClick={onDelete}
              style={{ fontSize: '.8rem', color: '#bb0000', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Supprimer la proposition
            </button>
          ) : <div />}

          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            {saved && !dirty && (
              <span style={{ fontSize: '.82rem', color: '#1b7e39', fontWeight: 600 }}>✓ Enregistré</span>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={pct === 0 && !prop}
              style={{ opacity: pct === 0 && !prop ? .45 : 1 }}>
              {prop && !dirty ? 'Modifier' : prop ? '✓ Mettre à jour' : '✓ Valider la proposition'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers de style ──────────────────────────────────────────────────────────

const btnSmStyle: React.CSSProperties = {
  width: 24, height: 24, border: '1px solid #d5d5d5', borderRadius: '.25rem',
  background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0,
};

const numInputStyle: React.CSSProperties = {
  width: 56, padding: '.25rem .4rem', border: '1px solid #d5d5d5',
  borderRadius: '.375rem', fontSize: '.8rem', textAlign: 'right',
};

function KpiMini({ label, val, color }: { label: string; val: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
      <span style={{ fontSize: '.72rem', color: '#6b6b6b' }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: '.95rem', color: color ?? '#1a1a1a' }}>{val}</span>
    </div>
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
