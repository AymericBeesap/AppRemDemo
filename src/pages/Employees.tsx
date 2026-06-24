import { useState } from 'react';
// A FAIRE — Connexion S/4HANA : remplacer `employees` par getEmployees() de src/services/api.ts
// Source primaire : S/4HANA API_EMPLOYEE_SRV (matricule, nom, entité, grade)
//   + HCM_PAYRESULT_DISPLAY_SRV (salaire actuel — données GDPR sensibles)
// Alternative : SuccessFactors EmpJob + EmpPayCompensation
// Pour Manager : utiliser getEmployeesByManager(user.matricule) pour filtrer l'équipe
import { employees } from '../data/mockData';
import EmployeeDrawer from '../components/EmployeeDrawer';
import { useNavigate } from 'react-router-dom';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function Employees() {
  const navigate = useNavigate();
  const [search, setSearch]         = useState('');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterGrade, setFilterGrade]   = useState('all');
  const [drawerMatricule, setDrawerMatricule] = useState<string | null>(null);

  const entities = [...new Set(employees.map(e => e.entite))];
  const grades   = [...new Set(employees.map(e => e.grade))].sort();

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${e.prenom} ${e.nom} ${e.matricule}`.toLowerCase().includes(q);
    const matchEntity = filterEntity === 'all' || e.entite === filterEntity;
    const matchGrade  = filterGrade  === 'all' || e.grade  === filterGrade;
    return matchSearch && matchEntity && matchGrade;
  });

  const totalBudget = employees.reduce((s, e) => s + e.salaireActuel, 0);
  const eligibleCount = employees.filter(e => e.eligible).length;

  return (
    <>
      <div className="page-header">
        <h1>Collaborateurs</h1>
        <p>{employees.length} collaborateurs chargés · Données issues SAP/SAGE</p>
      </div>

      {/* KPI rapides */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.25rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">Total collaborateurs</div>
          <div className="kpi-value">{employees.length}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-label">Éligibles</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{eligibleCount}</div>
          <div className="kpi-sub">{((eligibleCount / employees.length) * 100).toFixed(0)} % de l'effectif</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Masse salariale totale</div>
          <div className="kpi-value" style={{ fontSize: '1.375rem' }}>{fmtEur(totalBudget)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Entités couvertes</div>
          <div className="kpi-value">{entities.length}</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input-field"
          placeholder="Rechercher par nom, prénom, matricule…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <select className="input-field" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
          <option value="all">Toutes entités</option>
          {entities.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="input-field" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
          <option value="all">Tous grades</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>{filtered.length} résultat(s)</span>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/bsi')}>📄 Générer BSI</button>
        <button className="btn btn-ghost btn-sm" onClick={() => alert('Export CSV des collaborateurs')}>⬇ Export</button>
      </div>

      <div className="section-card" style={{ overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th>Entité / Division</th>
              <th>Grade / Éch.</th>
              <th>Ancienneté</th>
              <th>Salaire fixe</th>
              <th>Éligible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => (
              <tr
                key={emp.matricule}
                className="clickable"
                style={{ background: drawerMatricule === emp.matricule ? 'var(--primary-bg)' : '' }}
                onClick={() => setDrawerMatricule(emp.matricule)}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <div
                      className="avatar"
                      style={{ width: 32, height: 32, fontSize: '.7rem', background: emp.genre === 'F' ? '#9c27b0' : 'var(--primary)' }}
                    >
                      {emp.prenom[0]}{emp.nom[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{emp.prenom} {emp.nom}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-secondary)' }}>{emp.matricule}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '.8rem' }}>
                  <div>{emp.entite}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{emp.division}</div>
                </td>
                <td>
                  <span className="chip">{emp.grade}</span>
                  <span style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginLeft: '.25rem' }}>Éch.{emp.echelon}</span>
                </td>
                <td style={{ fontSize: '.875rem' }}>{emp.anciennete} ans</td>
                <td style={{ fontWeight: 600 }}>{fmtEur(emp.salaireActuel)}</td>
                <td>
                  <span className={emp.eligible ? 'badge badge-success' : 'badge badge-neutral'}>
                    {emp.eligible ? '✓ Oui' : 'Non'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-ghost"
                    style={{ padding: '.2rem .5rem', fontSize: '.75rem' }}
                    onClick={e => { e.stopPropagation(); setDrawerMatricule(emp.matricule); }}
                  >
                    Détail →
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="empty-state" style={{ padding: '1rem' }}>
                    <div className="empty-state-icon">🔍</div>
                    <p>Aucun collaborateur trouvé pour ces critères.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer employé */}
      <EmployeeDrawer
        matricule={drawerMatricule}
        onClose={() => setDrawerMatricule(null)}
      />
    </>
  );
}
