import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// A FAIRE — Connexion SAP/CAP :
//   employees (pour la sélection de population) → getEmployees() de src/services/api.ts
//   Création de campagne → createCampaign() de src/services/api.ts
//     POST /cap/odata/v4/RemunerationService/Campaigns
//   Après création → startProcess() via WorkflowContext pour démarrer le workflow BPA
import { employees, type CampaignType } from '../data/mockData';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const ENTITIES = ['Entité 2 Services GIE', 'Entité 3 France', 'SOCORAIL'];
const GRADES   = ['P1', 'P2', 'P3', 'P4', 'M1'];

const typeConfig: Record<CampaignType, { label: string; icon: string; desc: string; color: string }> = {
  augmentation: { label: 'Augmentations individuelles', icon: '📈', color: '#0a6ed1', desc: 'Campagne annuelle d\'augmentations de salaire fixe, par proposition managériale avec validation multi-niveaux.' },
  bonus:        { label: 'Bonus',                        icon: '💰', color: '#1b7e39', desc: 'Campagne de distribution de bonus variable, consolidée par entité, avec reporting multi-entités.' },
  gpec:         { label: 'GPEC',                         icon: '🎓', color: '#a05000', desc: 'Gestion des avancements par grade et échelon, avec règles automatiques et accélérations possibles.' },
};

const STEPS = ['Type', 'Informations', 'Population & Éligibilité', 'Paramétrage', 'Récapitulatif'];

interface Form {
  type: CampaignType | '';
  nom: string;
  dateDebut: string;
  dateFin: string;
  entites: string[];
  enveloppe: string;
  gradesExclus: string[];
  ancienneteMin: string;
  workflowNiveaux: string;
  alerteSeuil: string;
}

const defaultForm: Form = {
  type: '',
  nom: '',
  dateDebut: '2026-09-01',
  dateFin: '2026-10-31',
  entites: ['Entité 2 Services GIE'],
  enveloppe: '',
  gradesExclus: [],
  ancienneteMin: '6',
  workflowNiveaux: '3',
  alerteSeuil: '80',
};

export default function NewCampaign() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(defaultForm);
  const [errors, setErrors] = useState<Partial<Form>>({});

  const setField = <K extends keyof Form>(key: K, val: Form[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const toggleEntity = (e: string) =>
    setField('entites', form.entites.includes(e) ? form.entites.filter(x => x !== e) : [...form.entites, e]);

  const toggleGrade = (g: string) =>
    setField('gradesExclus', form.gradesExclus.includes(g) ? form.gradesExclus.filter(x => x !== g) : [...form.gradesExclus, g]);

  const eligibles = employees.filter(emp =>
    emp.eligible &&
    form.entites.includes(emp.entite) &&
    !form.gradesExclus.includes(emp.grade) &&
    emp.anciennete >= parseInt(form.ancienneteMin || '0')
  );

  const validate = (): boolean => {
    const e: Partial<Form> = {};
    if (step === 0 && !form.type) e.type = 'Sélectionnez un type.' as any;
    if (step === 1) {
      if (!form.nom.trim()) e.nom = 'Nom requis.';
      if (!form.dateDebut) e.dateDebut = 'Date début requise.';
      if (!form.dateFin) e.dateFin = 'Date fin requise.';
      if (form.entites.length === 0) e.entites = ['Au moins une entité.'];
    }
    if (step === 3 && (!form.enveloppe || parseFloat(form.enveloppe) <= 0)) e.enveloppe = 'Enveloppe requise.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = () => {
    alert(`Campagne "${form.nom}" créée avec succès !`);
    navigate('/campaigns');
  };

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/campaigns')}>← Retour aux campagnes</button>
      </div>

      <div className="page-header">
        <h1>Nouvelle campagne</h1>
        <p>Paramétrez votre campagne de rémunération en {STEPS.length} étapes</p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', background: '#fff', borderRadius: '.5rem', padding: '1rem 1.5rem', border: '1px solid #e5e5e5' }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.25rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '.8rem',
                background: i < step ? '#1b7e39' : i === step ? '#0a6ed1' : '#e5e5e5',
                color: i <= step ? '#fff' : '#6b6b6b',
                transition: 'background .2s',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '.7rem', color: i === step ? '#0a6ed1' : '#6b6b6b', fontWeight: i === step ? 700 : 400, whiteSpace: 'nowrap' }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? '#1b7e39' : '#e5e5e5', margin: '0 .5rem', marginBottom: '1rem', transition: 'background .2s' }} />
            )}
          </div>
        ))}
      </div>

      <div className="section-card">
        <div style={{ padding: '1.5rem 2rem', minHeight: 340 }}>

          {/* Étape 0 : Type */}
          {step === 0 && (
            <div>
              <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Quel type de campagne souhaitez-vous créer ?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
                {(Object.entries(typeConfig) as [CampaignType, typeof typeConfig[CampaignType]][]).map(([key, cfg]) => (
                  <div
                    key={key}
                    onClick={() => setField('type', key)}
                    style={{
                      padding: '1.5rem',
                      border: `2px solid ${form.type === key ? cfg.color : '#e5e5e5'}`,
                      borderRadius: '.75rem',
                      cursor: 'pointer',
                      background: form.type === key ? `${cfg.color}0f` : '#fff',
                      transition: 'border-color .15s, background .15s',
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>{cfg.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: form.type === key ? cfg.color : '#1a1a1a', marginBottom: '.5rem' }}>{cfg.label}</div>
                    <div style={{ fontSize: '.8rem', color: '#6b6b6b', lineHeight: 1.5 }}>{cfg.desc}</div>
                  </div>
                ))}
              </div>
              {errors.type && <div style={{ color: '#bb0000', fontSize: '.85rem', marginTop: '.75rem' }}>{errors.type}</div>}
            </div>
          )}

          {/* Étape 1 : Informations */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 560 }}>
              <h2 style={{ fontSize: '1.1rem' }}>Informations générales</h2>

              <FormField label="Nom de la campagne *" error={errors.nom}>
                <input className="input-field" style={{ width: '100%' }} value={form.nom}
                  placeholder={`ex: ${typeConfig[form.type as CampaignType]?.label ?? 'Campagne'} ${new Date().getFullYear() + 1}`}
                  onChange={e => setField('nom', e.target.value)} />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormField label="Date de début *" error={errors.dateDebut}>
                  <input type="date" className="input-field" style={{ width: '100%' }} value={form.dateDebut}
                    onChange={e => setField('dateDebut', e.target.value)} />
                </FormField>
                <FormField label="Date de fin *" error={errors.dateFin}>
                  <input type="date" className="input-field" style={{ width: '100%' }} value={form.dateFin}
                    onChange={e => setField('dateFin', e.target.value)} />
                </FormField>
              </div>

              <FormField label="Entités concernées *" error={Array.isArray(errors.entites) ? errors.entites[0] : undefined}>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {ENTITIES.map(e => (
                    <button key={e} type="button"
                      className={`btn btn-sm ${form.entites.includes(e) ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => toggleEntity(e)}
                    >{e}</button>
                  ))}
                </div>
              </FormField>
            </div>
          )}

          {/* Étape 2 : Population */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Population et règles d'éligibilité</h2>
              <div className="grid-2" style={{ alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <FormField label="Ancienneté minimale (mois)">
                    <input type="number" className="input-field" style={{ width: '100%' }} value={form.ancienneteMin}
                      min={0} max={60} onChange={e => setField('ancienneteMin', e.target.value)} />
                  </FormField>
                  <FormField label="Grades à exclure">
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                      {GRADES.map(g => (
                        <button key={g} type="button"
                          className={`btn btn-sm ${form.gradesExclus.includes(g) ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ ...(form.gradesExclus.includes(g) ? { background: '#bb0000', borderColor: '#bb0000' } : {}) }}
                          onClick={() => toggleGrade(g)}
                        >{g}</button>
                      ))}
                    </div>
                    <div style={{ fontSize: '.75rem', color: '#6b6b6b', marginTop: '.3rem' }}>Les grades sélectionnés (rouge) seront exclus.</div>
                  </FormField>
                </div>

                <div className="section-card" style={{ marginBottom: 0 }}>
                  <div className="section-card-header" style={{ background: '#e8f0fc' }}>
                    <h2>Population éligible estimée</h2>
                    <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0a6ed1' }}>{eligibles.length}</span>
                  </div>
                  <table className="data-table" style={{ fontSize: '.8rem' }}>
                    <thead><tr><th>Nom</th><th>Entité</th><th>Grade</th><th>Ancienneté</th></tr></thead>
                    <tbody>
                      {eligibles.slice(0, 8).map(e => (
                        <tr key={e.matricule}>
                          <td style={{ fontWeight: 500 }}>{e.prenom} {e.nom}</td>
                          <td>{e.entite}</td>
                          <td><span className="chip">{e.grade}</span></td>
                          <td>{e.anciennete} ans</td>
                        </tr>
                      ))}
                      {eligibles.length > 8 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: '#a0a0a0' }}>+{eligibles.length - 8} autres</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Étape 3 : Paramétrage */}
          {step === 3 && (
            <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 560 }}>
              <h2 style={{ fontSize: '1.1rem' }}>Paramétrage budgétaire et workflow</h2>

              <FormField label="Enveloppe budgétaire (€) *" error={errors.enveloppe}>
                <input type="number" className="input-field" style={{ width: '100%' }} value={form.enveloppe}
                  placeholder="ex: 450000" min={0} onChange={e => setField('enveloppe', e.target.value)} />
              </FormField>

              <FormField label="Seuil d'alerte budget (%)">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="range" min={50} max={99} value={form.alerteSeuil}
                    onChange={e => setField('alerteSeuil', e.target.value)}
                    style={{ flex: 1 }} />
                  <span style={{ fontWeight: 700, color: '#0a6ed1', minWidth: 40 }}>{form.alerteSeuil}%</span>
                </div>
                <div style={{ fontSize: '.75rem', color: '#6b6b6b' }}>Alerte déclenchée quand la consommation dépasse ce seuil.</div>
              </FormField>

              <FormField label="Niveaux de validation workflow">
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  {['2', '3', '4'].map(n => (
                    <button key={n} type="button"
                      className={`btn btn-sm ${form.workflowNiveaux === n ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setField('workflowNiveaux', n)}
                    >
                      {n} niveaux
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '.75rem', color: '#6b6b6b', marginTop: '.3rem' }}>
                  {form.workflowNiveaux === '2' ? 'Manager → DRH' : form.workflowNiveaux === '3' ? 'Manager → Directeur → DRH' : 'Manager → Directeur → RRH → DRH'}
                </div>
              </FormField>
            </div>
          )}

          {/* Étape 4 : Récapitulatif */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Récapitulatif avant création</h2>
              <div className="grid-2">
                <div style={{ display: 'grid', gap: '.75rem' }}>
                  <RecapRow label="Type" val={form.type ? `${typeConfig[form.type].icon} ${typeConfig[form.type].label}` : '–'} />
                  <RecapRow label="Nom" val={form.nom || '–'} />
                  <RecapRow label="Période" val={`${form.dateDebut} → ${form.dateFin}`} />
                  <RecapRow label="Entités" val={form.entites.join(', ') || '–'} />
                  <RecapRow label="Grades exclus" val={form.gradesExclus.length ? form.gradesExclus.join(', ') : 'Aucun'} />
                  <RecapRow label="Ancienneté min." val={`${form.ancienneteMin} mois`} />
                  <RecapRow label="Enveloppe" val={form.enveloppe ? fmtEur(parseFloat(form.enveloppe)) : '–'} />
                  <RecapRow label="Seuil d'alerte" val={`${form.alerteSeuil}%`} />
                  <RecapRow label="Workflow" val={`${form.workflowNiveaux} niveaux de validation`} />
                  <RecapRow label="Population éligible" val={`${eligibles.length} collaborateurs`} />
                </div>
                <div style={{ background: '#f0f9f0', border: '1px solid #86efac', borderRadius: '.5rem', padding: '1.25rem' }}>
                  <div style={{ fontWeight: 700, color: '#1b5e20', marginBottom: '.75rem' }}>✓ Prêt à créer</div>
                  <div style={{ fontSize: '.875rem', color: '#2e7d32', lineHeight: 1.6 }}>
                    La campagne sera créée en statut <strong>Brouillon</strong>. Vous pourrez la modifier avant de l'ouvrir aux managers.
                    <br /><br />
                    Un email de notification sera envoyé aux RRH des entités concernées à l'ouverture.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div style={{ padding: '1rem 2rem', borderTop: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', background: '#fafafa' }}>
          <button className="btn btn-ghost" onClick={step === 0 ? () => navigate('/campaigns') : prev}>
            {step === 0 ? '✕ Annuler' : '← Précédent'}
          </button>
          {step < STEPS.length - 1
            ? <button className="btn btn-primary" onClick={next}>Suivant →</button>
            : <button className="btn btn-primary" style={{ background: '#1b7e39', borderColor: '#1b7e39' }} onClick={handleSubmit}>✓ Créer la campagne</button>
          }
        </div>
      </div>
    </>
  );
}

function FormField({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '.4rem' }}>{label}</label>
      {children}
      {error && <div style={{ color: '#bb0000', fontSize: '.8rem', marginTop: '.25rem' }}>{error}</div>}
    </div>
  );
}

function RecapRow({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', paddingBottom: '.6rem', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ color: '#6b6b6b' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{val}</span>
    </div>
  );
}
