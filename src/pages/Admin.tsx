import { useState } from 'react';
// A FAIRE — Connexion CAP : remplacer `appUsers` par getAppUsers() de src/services/api.ts
// GET /cap/odata/v4/RemunerationService/AppUsers?$expand=Permissions
// La gestion des rôles applicatifs (XSUAA Role Collections) doit se faire dans BTP Cockpit
// > Security > Users. La table AppUsers CAP stocke les métadonnées métier (périmètre, entité)
// en complément des rôles XSUAA (qui gèrent les autorisations d'accès).
import { appUsers, roleColors, roleLabels, type Role, type AppUser } from '../data/mockData';
import { useWorkflow } from '../context/WorkflowContext';
import type { WorkflowTemplate, WorkflowStepConfig, WorkflowAction } from '../types/workflow';

const rolesMatrix = [
  { role: 'SIRH',      permissions: ['config_campagne', 'import_donnees', 'admin_droits', 'journal_audit', 'export_global', 'reporting'] },
  { role: 'DRH',       permissions: ['valider_campagne', 'voir_population_totale', 'reporting', 'journal_audit', 'export_global', 'arbitrage'] },
  { role: 'RRH',       permissions: ['valider_campagne', 'voir_population_perimetre', 'reporting', 'export_perimetre'] },
  { role: 'Directeur', permissions: ['valider_propositions', 'voir_equipe_directe'] },
  { role: 'Manager',   permissions: ['saisir_propositions', 'voir_equipe_directe'] },
];

const allPermissions = [
  { key: 'config_campagne',           label: 'Configurer campagne' },
  { key: 'import_donnees',            label: 'Importer données' },
  { key: 'admin_droits',              label: 'Administrer droits' },
  { key: 'journal_audit',             label: 'Voir journal audit' },
  { key: 'export_global',             label: 'Export global' },
  { key: 'reporting',                 label: 'Reporting' },
  { key: 'valider_campagne',          label: 'Valider campagne' },
  { key: 'valider_propositions',      label: 'Valider propositions' },
  { key: 'voir_population_totale',    label: 'Voir population totale' },
  { key: 'voir_population_perimetre', label: 'Voir périmètre RRH' },
  { key: 'voir_equipe_directe',       label: 'Voir équipe directe' },
  { key: 'saisir_propositions',       label: 'Saisir propositions' },
  { key: 'arbitrage',                 label: 'Arbitrage budgétaire' },
  { key: 'export_perimetre',          label: 'Export périmètre' },
];

const integrations = [
  { id: 'sap',   name: 'SAP ERP',            statut: 'connecte',     derniereSync: '2026-03-01 09:00', descr: 'Import collaborateurs, grades, rémunérations' },
  { id: 'sage',  name: 'SAGE (Filiale C)',    statut: 'connecte',     derniereSync: '2026-03-01 09:05', descr: 'Import collaborateurs Filiale C' },
  { id: 'lucca', name: 'LUCCA (objectifs)',   statut: 'non_connecte', derniereSync: '–',                descr: 'Intégration performance/objectifs (optionnel)' },
  { id: 'entra', name: 'Microsoft Entra ID', statut: 'connecte',     derniereSync: 'Temps réel',       descr: 'Authentification SSO obligatoire' },
];

const ALL_ROLES: Role[] = ['SIRH', 'DRH', 'RRH', 'Directeur', 'Manager'];
const ALL_ENTITIES = ['Groupe A', 'Filiale B', 'Filiale C'];
const WORKFLOW_ACTIONS: { value: WorkflowAction; label: string }[] = [
  { value: 'valider',       label: 'Valider' },
  { value: 'rejeter',       label: 'Rejeter' },
  { value: 'demander_info', label: 'Demander info' },
  { value: 'deleguer',      label: 'Déléguer' },
];

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  augmentation: 'Augmentations individuelles',
  bonus: 'Bonus',
  gpec: 'GPEC',
};
const CAMPAIGN_TYPE_ICONS: Record<string, string> = {
  augmentation: '📈',
  bonus: '💰',
  gpec: '🎓',
};

// ─── Éditeur de template workflow ─────────────────────────────────────────────

function WorkflowTemplateEditor({
  template,
  onSave,
}: {
  template: WorkflowTemplate;
  onSave: (t: WorkflowTemplate) => void;
}) {
  const [draft, setDraft] = useState<WorkflowTemplate>({
    ...template,
    steps: template.steps.map(s => ({ ...s, actions: [...s.actions] })),
  });

  const isDirty = JSON.stringify(draft.steps) !== JSON.stringify(template.steps);

  const updateStep = (id: string, patch: Partial<WorkflowStepConfig>) =>
    setDraft(d => ({ ...d, steps: d.steps.map(s => s.id === id ? { ...s, ...patch } : s) }));

  const moveStep = (id: string, dir: -1 | 1) =>
    setDraft(d => {
      const steps = [...d.steps];
      const idx = steps.findIndex(s => s.id === id);
      if (idx + dir < 0 || idx + dir >= steps.length) return d;
      [steps[idx], steps[idx + dir]] = [steps[idx + dir], steps[idx]];
      return { ...d, steps: steps.map((s, i) => ({ ...s, ordre: i + 1 })) };
    });

  const addStep = () =>
    setDraft(d => ({
      ...d,
      steps: [...d.steps, {
        id: `STEP-${Date.now()}`,
        ordre: d.steps.length + 1,
        libelle: 'Nouvelle étape',
        role: 'RRH' as Role,
        delaiJours: 5,
        rappelJours: 1,
        actions: ['valider' as WorkflowAction],
        obligatoire: true,
      }],
    }));

  const removeStep = (id: string) =>
    setDraft(d => ({
      ...d,
      steps: d.steps.filter(s => s.id !== id).map((s, i) => ({ ...s, ordre: i + 1 })),
    }));

  const toggleAction = (stepId: string, action: WorkflowAction) =>
    setDraft(d => ({
      ...d,
      steps: d.steps.map(s => {
        if (s.id !== stepId) return s;
        const has = s.actions.includes(action);
        return { ...s, actions: has ? s.actions.filter(a => a !== action) : [...s.actions, action] };
      }),
    }));

  return (
    <div>
      {/* Step list */}
      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
        {draft.steps.map((step, idx) => (
          <div key={step.id} style={{
            border: '1px solid #e5e5e5',
            borderRadius: '.5rem',
            background: '#fff',
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            alignItems: 'flex-start',
          }}>
            {/* Numéro */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#0a6ed1', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '.875rem', flexShrink: 0,
            }}>
              {step.ordre}
            </div>

            {/* Champs */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
              {/* Libellé */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '.72rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Libellé *</label>
                <input
                  className="input-field"
                  value={step.libelle}
                  onChange={e => updateStep(step.id, { libelle: e.target.value })}
                  style={{ width: '100%', marginTop: '.2rem' }}
                />
              </div>

              {/* Rôle */}
              <div>
                <label style={{ fontSize: '.72rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Rôle acteur *</label>
                <select
                  className="input-field"
                  value={step.role}
                  onChange={e => updateStep(step.id, { role: e.target.value as Role })}
                  style={{ width: '100%', marginTop: '.2rem' }}
                >
                  {ALL_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Escalade */}
              <div>
                <label style={{ fontSize: '.72rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Escalade si SLA dépassé</label>
                <select
                  className="input-field"
                  value={step.escaladeRole ?? ''}
                  onChange={e => updateStep(step.id, { escaladeRole: (e.target.value as Role) || undefined })}
                  style={{ width: '100%', marginTop: '.2rem' }}
                >
                  <option value="">– Aucune</option>
                  {ALL_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Délai SLA */}
              <div>
                <label style={{ fontSize: '.72rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '.05em' }}>SLA (jours) *</label>
                <input
                  type="number" min={1} max={90}
                  className="input-field"
                  value={step.delaiJours}
                  onChange={e => updateStep(step.id, { delaiJours: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '.2rem' }}
                />
              </div>

              {/* Rappel */}
              <div>
                <label style={{ fontSize: '.72rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Rappel (jours avant)</label>
                <input
                  type="number" min={0} max={30}
                  className="input-field"
                  value={step.rappelJours}
                  onChange={e => updateStep(step.id, { rappelJours: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '.2rem' }}
                />
              </div>

              {/* Actions autorisées */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '.72rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Actions autorisées *</label>
                <div style={{ display: 'flex', gap: '.75rem', marginTop: '.4rem', flexWrap: 'wrap' }}>
                  {WORKFLOW_ACTIONS.map(({ value, label }) => (
                    <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', cursor: 'pointer', fontSize: '.85rem' }}>
                      <input
                        type="checkbox"
                        checked={step.actions.includes(value)}
                        onChange={() => toggleAction(step.id, value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Obligatoire */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>
                  <input
                    type="checkbox"
                    checked={step.obligatoire}
                    onChange={e => updateStep(step.id, { obligatoire: e.target.checked })}
                  />
                  Étape obligatoire
                </label>
              </div>
            </div>

            {/* Boutons ordre/suppr */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', flexShrink: 0 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => moveStep(step.id, -1)}
                disabled={idx === 0}
                title="Monter"
                style={{ padding: '.25rem .5rem', opacity: idx === 0 ? .3 : 1 }}
              >↑</button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => moveStep(step.id, 1)}
                disabled={idx === draft.steps.length - 1}
                title="Descendre"
                style={{ padding: '.25rem .5rem', opacity: idx === draft.steps.length - 1 ? .3 : 1 }}
              >↓</button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => removeStep(step.id)}
                title="Supprimer"
                style={{ padding: '.25rem .5rem', color: '#bb0000' }}
              >✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Ajouter étape */}
      <button className="btn btn-ghost btn-sm" onClick={addStep} style={{ marginBottom: '1.5rem' }}>
        + Ajouter une étape
      </button>

      {/* Bannière BPA */}
      <div style={{
        background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '.5rem',
        padding: '1rem 1.25rem', marginBottom: '1.25rem', fontSize: '.8rem', color: '#0d47a1',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '.4rem' }}>ℹ️ Migration SAP Build Process Automation</div>
        <div style={{ lineHeight: 1.6 }}>
          En production, ce template sera déployé comme <strong>Process Definition</strong> sur SAP BPA.
          Les étapes, rôles et SLA sont directement mappés. Les notifications Teams / email, rappels automatiques
          et escalades sont gérés nativement par BPA via SAP Task Center.
          <br />
          <span style={{ opacity: .75 }}>
            Interface côté code : <code>WorkflowEngineAdapter → BpaWorkflowEngine</code>
            {' '}(<code>src/services/workflowEngine.ts</code>)
            — aucune modification des composants React requise.
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '.75rem' }}>
        <button
          className="btn btn-ghost"
          onClick={() => setDraft({ ...template, steps: template.steps.map(s => ({ ...s, actions: [...s.actions] })) })}
          disabled={!isDirty}
        >
          ↺ Réinitialiser
        </button>
        <button
          className="btn btn-primary"
          onClick={() => onSave(draft)}
          disabled={!isDirty}
        >
          ✓ Sauvegarder le template
        </button>
        {isDirty && (
          <span style={{ fontSize: '.8rem', color: '#e9730c', alignSelf: 'center' }}>● Modifications non sauvegardées</span>
        )}
      </div>
    </div>
  );
}

// ─── Page principale Admin ────────────────────────────────────────────────────

export default function Admin() {
  const { templates, updateTemplate } = useWorkflow();

  const [activeTab, setActiveTab] = useState<'roles_users' | 'roles_matrix' | 'integrations' | 'parametres' | 'workflows'>('roles_users');
  const [users, setUsers] = useState<AppUser[]>(appUsers);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState<{ role: Role; entite: string; perimetre: string[] } | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id ?? '');

  const filteredUsers = users.filter(u => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const q = search.toLowerCase();
    const matchSearch = !q || `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const startEdit = (u: AppUser) => {
    setEditingUser(u);
    setEditForm({ role: u.role, entite: u.entite, perimetre: [...u.perimetre] });
  };

  const saveEdit = () => {
    if (!editingUser || !editForm) return;
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editForm } : u));
    setEditingUser(null);
    setEditForm(null);
  };

  const toggleActif = (id: string) =>
    setUsers(prev => prev.map(u => u.id === id ? { ...u, actif: !u.actif } : u));

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <>
      <div className="page-header">
        <h1>Administration</h1>
        <p>Gestion des rôles, droits, workflows, intégrations et paramètres système</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid #e5e5e5', overflowX: 'auto' }}>
        {([
          ['roles_users',  '👥 Affectation des rôles'],
          ['roles_matrix', '🔒 Matrice des droits'],
          ['workflows',    '🔄 Workflows'],
          ['integrations', '🔗 Intégrations'],
          ['parametres',   '⚙️ Paramètres'],
        ] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '.65rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === tab ? 700 : 500,
            color: activeTab === tab ? '#0a6ed1' : '#6b6b6b',
            borderBottom: `2px solid ${activeTab === tab ? '#0a6ed1' : 'transparent'}`,
            marginBottom: -2, fontSize: '.875rem', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Affectation des rôles ── */}
      {activeTab === 'roles_users' && (
        <div>
          <div className="toolbar">
            <input className="input-field" placeholder="Rechercher un utilisateur…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ minWidth: 240 }} />
            <select className="input-field" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="all">Tous les rôles</option>
              {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={() => alert('Ajouter un utilisateur')}>+ Ajouter</button>
            <button className="btn btn-ghost btn-sm" onClick={() => alert('Export matrice droits')}>⬇️ Export</button>
          </div>

          <div className="section-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Entité</th>
                  <th>Périmètre</th>
                  <th>Statut</th>
                  <th>Dernière connexion</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <div className="avatar" style={{ width: 30, height: 30, fontSize: '.7rem', background: roleColors[u.role] }}>
                          {u.prenom[0]}{u.nom[0]}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.prenom} {u.nom}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '.8rem', color: '#6b6b6b' }}>{u.email}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', padding: '.2rem .6rem', borderRadius: '1rem',
                        background: `${roleColors[u.role]}18`, color: roleColors[u.role],
                        fontWeight: 700, fontSize: '.75rem',
                      }}>
                        {roleLabels[u.role]}
                      </span>
                    </td>
                    <td>{u.entite}</td>
                    <td style={{ fontSize: '.8rem' }}>
                      {u.perimetre.map(p => <span key={p} className="chip">{p}</span>)}
                    </td>
                    <td>
                      <button onClick={() => toggleActif(u.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                        <span className={u.actif ? 'badge badge-success' : 'badge badge-neutral'}>
                          {u.actif ? '● Actif' : '○ Inactif'}
                        </span>
                      </button>
                    </td>
                    <td style={{ fontSize: '.75rem', color: '#6b6b6b' }}>
                      {new Date(u.derniereConnexion).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(u)}>✏️ Modifier</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="kpi-grid" style={{ marginTop: '1rem' }}>
            {ALL_ROLES.map(role => {
              const count = users.filter(u => u.role === role && u.actif).length;
              return (
                <div key={role} className="kpi-card" style={{ borderLeft: `4px solid ${roleColors[role]}` }}>
                  <div className="kpi-label">{roleLabels[role]}</div>
                  <div className="kpi-value" style={{ color: roleColors[role], fontSize: '1.5rem' }}>{count}</div>
                  <div className="kpi-sub">utilisateur{count > 1 ? 's' : ''} actif{count > 1 ? 's' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Matrice des droits ── */}
      {activeTab === 'roles_matrix' && (
        <div className="section-card">
          <div className="section-card-header">
            <h2>Matrice RBAC – Rôles & permissions</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => alert('Export matrice')}>⬇️ Export</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Permission</th>
                  {rolesMatrix.map(r => (
                    <th key={r.role} style={{ textAlign: 'center' }}>
                      <span style={{ color: roleColors[r.role as Role], fontWeight: 700 }}>{r.role}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPermissions.map(perm => (
                  <tr key={perm.key}>
                    <td style={{ fontWeight: 500 }}>{perm.label}</td>
                    {rolesMatrix.map(r => (
                      <td key={r.role} style={{ textAlign: 'center' }}>
                        {r.permissions.includes(perm.key)
                          ? <span style={{ color: '#1b7e39', fontSize: '1.1rem' }}>✓</span>
                          : <span style={{ color: '#e0e0e0' }}>–</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '1rem 1.25rem', background: '#f5f6f7', borderTop: '1px solid #e5e5e5', fontSize: '.78rem', color: '#6b6b6b' }}>
            Revues périodiques recommandées (tous les 6 mois). Dernière revue : 01/01/2026.
          </div>
        </div>
      )}

      {/* ── Workflows ── */}
      {activeTab === 'workflows' && (
        <div className="grid-2" style={{ alignItems: 'start', gridTemplateColumns: '260px 1fr' }}>
          {/* Liste des templates */}
          <div style={{ display: 'grid', gap: '.75rem' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#6b6b6b', padding: '0 .25rem' }}>
              Templates de workflow
            </div>
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                style={{
                  textAlign: 'left', border: `2px solid ${selectedTemplateId === t.id ? '#0a6ed1' : '#e5e5e5'}`,
                  borderRadius: '.5rem', padding: '1rem',
                  background: selectedTemplateId === t.id ? '#f0f6ff' : '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.35rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{CAMPAIGN_TYPE_ICONS[t.campaignType]}</span>
                  <span style={{ fontWeight: 700, fontSize: '.875rem', color: '#1a1a1a' }}>
                    {CAMPAIGN_TYPE_LABELS[t.campaignType]}
                  </span>
                </div>
                <div style={{ fontSize: '.75rem', color: '#6b6b6b', marginBottom: '.4rem' }}>
                  {t.steps.length} étape{t.steps.length > 1 ? 's' : ''}
                  {' · '}
                  {t.steps.reduce((s, step) => s + step.delaiJours, 0)} j max
                </div>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  {t.steps.map(s => (
                    <span key={s.id} style={{
                      fontSize: '.65rem', background: `${roleColors[s.role]}18`,
                      color: roleColors[s.role], padding: '.1rem .4rem', borderRadius: '.25rem', fontWeight: 600,
                    }}>
                      {s.role}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: '.5rem' }}>
                  <span className={t.actif ? 'badge badge-success' : 'badge badge-neutral'} style={{ fontSize: '.68rem' }}>
                    {t.actif ? '● Actif' : '○ Inactif'}
                  </span>
                </div>
              </button>
            ))}

            <div style={{ fontSize: '.72rem', color: '#a0a0a0', padding: '.25rem', lineHeight: 1.5 }}>
              Modifié par {selectedTemplate?.modifiePar}<br />
              {selectedTemplate && new Date(selectedTemplate.modifieLe).toLocaleDateString('fr-FR')}
            </div>
          </div>

          {/* Éditeur */}
          {selectedTemplate ? (
            <div className="section-card">
              <div className="section-card-header">
                <div>
                  <h2>
                    {CAMPAIGN_TYPE_ICONS[selectedTemplate.campaignType]}{' '}
                    {CAMPAIGN_TYPE_LABELS[selectedTemplate.campaignType]}
                  </h2>
                  <div style={{ fontSize: '.8rem', color: '#6b6b6b', marginTop: '.2rem' }}>{selectedTemplate.description}</div>
                </div>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <WorkflowTemplateEditor
                  key={selectedTemplate.id}
                  template={selectedTemplate}
                  onSave={t => {
                    updateTemplate(t);
                    alert(`Template "${CAMPAIGN_TYPE_LABELS[t.campaignType]}" sauvegardé.`);
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#a0a0a0', background: '#fff', borderRadius: '.5rem', border: '1px dashed #ccc' }}>
              Sélectionnez un template
            </div>
          )}
        </div>
      )}

      {/* ── Intégrations ── */}
      {activeTab === 'integrations' && (
        <div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {integrations.map(integ => (
              <div key={integ.id} className="section-card" style={{ marginBottom: 0 }}>
                <div style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '.5rem', background: integ.statut === 'connecte' ? '#e8f5e9' : '#f5f6f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                      {integ.id === 'sap' ? '🏢' : integ.id === 'sage' ? '📊' : integ.id === 'lucca' ? '🎯' : '🔐'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{integ.name}</div>
                      <div style={{ fontSize: '.8rem', color: '#6b6b6b', marginTop: '.15rem' }}>{integ.descr}</div>
                      <div style={{ fontSize: '.72rem', color: '#a0a0a0', marginTop: '.1rem' }}>Sync : {integ.derniereSync}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                    <span className={integ.statut === 'connecte' ? 'badge badge-success' : 'badge badge-neutral'}>
                      {integ.statut === 'connecte' ? '● Connecté' : '○ Non configuré'}
                    </span>
                    {integ.statut === 'connecte'
                      ? <button className="btn btn-ghost btn-sm" onClick={() => alert(`Sync ${integ.name}`)}>↻ Sync</button>
                      : <button className="btn btn-primary btn-sm" onClick={() => alert(`Configurer ${integ.name}`)}>Configurer</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '.5rem', fontSize: '.85rem', color: '#0d47a1' }}>
            <strong>Hébergement :</strong> Données hébergées en Union Européenne (France – EU West). Chiffrement AES-256 · TLS 1.3 · RGPD.
          </div>
        </div>
      )}

      {/* ── Paramètres ── */}
      {activeTab === 'parametres' && (
        <div className="grid-2">
          <div className="section-card">
            <div className="section-card-header"><h2>Paramètres généraux</h2></div>
            <div style={{ padding: '1.25rem', display: 'grid', gap: '.75rem' }}>
              {[
                ['Nom du groupe', 'Groupe A'],
                ['Exercice fiscal', '2026'],
                ['Devise', 'EUR (€)'],
                ['Langue', 'Français (FR)'],
                ['Fuseau horaire', 'Europe/Paris (UTC+1)'],
                ['SSO', <span key="sso" className="badge badge-success">Activé – Entra ID</span>],
              ].map(([l, v]) => (
                <div key={String(l)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.875rem', paddingBottom: '.65rem', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ color: '#6b6b6b' }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="section-card">
            <div className="section-card-header"><h2>Sécurité & RGPD</h2></div>
            <div style={{ padding: '1.25rem', display: 'grid', gap: '.875rem', fontSize: '.875rem' }}>
              {[
                ['Durée de session',   '8h',                    'ok'],
                ['Chiffrement repos',  'AES-256',               'ok'],
                ['Chiffrement transit','TLS 1.3',               'ok'],
                ['Journalisation audit','Activée (5 ans)',      'ok'],
                ['Hébergement UE',     'France – EU West',      'ok'],
                ['DPO désigné',        'Oui',                   'ok'],
                ['Revue droits',       'Prévue 01/07/2026',     'warning'],
              ].map(([l, v, s]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6b6b6b' }}>{l}</span>
                  <span style={{ fontWeight: 600, color: s === 'ok' ? '#1b7e39' : '#a05000', display: 'flex', gap: '.3rem' }}>
                    {s === 'ok' ? '✓' : '⚠'} {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer d'édition de rôle ── */}
      {editingUser && editForm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 200 }} onClick={() => setEditingUser(null)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: '#fff', zIndex: 201, boxShadow: '-4px 0 20px rgba(0,0,0,.12)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e5e5', background: '#f5f6f7', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Modifier le rôle</div>
                <div style={{ fontSize: '.8rem', color: '#6b6b6b' }}>{editingUser.prenom} {editingUser.nom}</div>
              </div>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b6b6b' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', flex: 1, display: 'grid', gap: '1.25rem', alignContent: 'start' }}>
              <div>
                <div style={{ fontSize: '.875rem', fontWeight: 600, marginBottom: '.5rem' }}>Rôle</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                  {ALL_ROLES.map(role => (
                    <button key={role} type="button"
                      onClick={() => setEditForm(f => f ? { ...f, role } : f)}
                      style={{
                        padding: '.6rem .75rem', border: `2px solid ${editForm.role === role ? roleColors[role] : '#e5e5e5'}`,
                        borderRadius: '.375rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        background: editForm.role === role ? `${roleColors[role]}10` : '#fff',
                        display: 'flex', alignItems: 'center', gap: '.5rem',
                      }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: roleColors[role], display: 'inline-block' }} />
                      <span style={{ fontWeight: editForm.role === role ? 700 : 400, fontSize: '.875rem' }}>{role}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '.875rem', fontWeight: 600, marginBottom: '.5rem' }}>Entité principale</div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {ALL_ENTITIES.map(e => (
                    <button key={e} type="button"
                      className={`btn btn-sm ${editForm.entite === e ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setEditForm(f => f ? { ...f, entite: e } : f)}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '.875rem', fontWeight: 600, marginBottom: '.5rem' }}>Périmètre d'accès</div>
                <textarea className="input-field" rows={3} style={{ width: '100%', resize: 'none', fontFamily: 'inherit', fontSize: '.85rem' }}
                  value={editForm.perimetre.join('\n')}
                  onChange={e => setEditForm(f => f ? { ...f, perimetre: e.target.value.split('\n').filter(Boolean) } : f)}
                  placeholder="Un périmètre par ligne&#10;ex: Finance – Groupe A" />
              </div>
              <div style={{ background: '#f5f6f7', borderRadius: '.375rem', padding: '1rem' }}>
                <div style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.5rem', color: '#1a1a1a' }}>Permissions du rôle {editForm.role}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                  {(rolesMatrix.find(r => r.role === editForm.role)?.permissions ?? []).map(p => (
                    <span key={p} style={{ fontSize: '.72rem', background: '#e8f0fc', color: '#0a6ed1', padding: '.15rem .5rem', borderRadius: '.25rem' }}>
                      {allPermissions.find(a => a.key === p)?.label ?? p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e5e5', display: 'flex', gap: '.75rem', background: '#fafafa' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditingUser(null)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveEdit}>✓ Enregistrer</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
