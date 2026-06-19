import { useState } from 'react';
import { employees, type Employee } from '../data/mockData';
import { exportBsiPdf } from '../utils/pdfExport';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function Employees() {
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [selected, setSelected] = useState<Employee | null>(null);

  const entities = [...new Set(employees.map(e => e.entite))];
  const grades = [...new Set(employees.map(e => e.grade))].sort();

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${e.prenom} ${e.nom} ${e.matricule}`.toLowerCase().includes(q);
    const matchEntity = filterEntity === 'all' || e.entite === filterEntity;
    const matchGrade = filterGrade === 'all' || e.grade === filterGrade;
    return matchSearch && matchEntity && matchGrade;
  });

  return (
    <>
      <div className="page-header">
        <h1>Collaborateurs</h1>
        <p>{employees.length} collaborateurs chargés · Données issues SAP/SAGE</p>
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
        <span style={{ fontSize: '.85rem', color: '#6b6b6b' }}>{filtered.length} résultat(s)</span>
        <button className="btn btn-ghost btn-sm" onClick={() => alert('Export CSV des collaborateurs')}>⬇️ Export</button>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Table */}
        <div className="section-card" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Collaborateur</th>
                <th>Entité</th>
                <th>Grade / Éch.</th>
                <th>Ancienneté</th>
                <th>Salaire fixe</th>
                <th>Éligible</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr
                  key={emp.matricule}
                  style={{ cursor: 'pointer', background: selected?.matricule === emp.matricule ? '#e8f0fc' : '' }}
                  onClick={() => setSelected(emp)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <div
                        className="avatar"
                        style={{ width: 30, height: 30, fontSize: '.7rem', background: emp.genre === 'F' ? '#9c27b0' : '#0a6ed1' }}
                      >
                        {emp.prenom[0]}{emp.nom[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{emp.prenom} {emp.nom}</div>
                        <div style={{ fontSize: '.7rem', color: '#6b6b6b' }}>{emp.matricule}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '.8rem' }}>
                    <div>{emp.entite}</div>
                    <div style={{ color: '#6b6b6b' }}>{emp.division}</div>
                  </td>
                  <td><span className="chip">{emp.grade}</span> Éch.{emp.echelon}</td>
                  <td>{emp.anciennete} ans</td>
                  <td style={{ fontWeight: 600 }}>{fmtEur(emp.salaireActuel)}</td>
                  <td>
                    <span className={emp.eligible ? 'badge badge-success' : 'badge badge-neutral'}>
                      {emp.eligible ? '✓ Oui' : 'Non'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#a0a0a0', padding: '2rem' }}>
                    Aucun collaborateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Fiche individuelle */}
        {selected ? (
          <div>
            <div className="section-card">
              <div className="section-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <div
                    className="avatar"
                    style={{ width: 44, height: 44, fontSize: '1rem', background: selected.genre === 'F' ? '#9c27b0' : '#0a6ed1' }}
                  >
                    {selected.prenom[0]}{selected.nom[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selected.prenom} {selected.nom}</div>
                    <div style={{ fontSize: '.78rem', color: '#6b6b6b' }}>{selected.matricule} · {selected.genre === 'F' ? 'Femme' : 'Homme'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => exportBsiPdf(selected)}>⬇️ BSI PDF</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
                </div>
              </div>
              <div style={{ padding: '1.25rem', display: 'grid', gap: '.75rem' }}>
                <InfoRow label="Entité" value={selected.entite} />
                <InfoRow label="Division" value={selected.division} />
                <InfoRow label="Grade" value={`${selected.grade} – Échelon ${selected.echelon}`} />
                <InfoRow label="Date d'entrée" value={new Date(selected.dateEntree).toLocaleDateString('fr-FR')} />
                <InfoRow label="Ancienneté" value={`${selected.anciennete} ans`} />
                <InfoRow label="Salaire fixe actuel" value={<strong style={{ color: '#0a6ed1' }}>{fmtEur(selected.salaireActuel)}</strong>} />
                <InfoRow label="Éligibilité" value={
                  <span className={selected.eligible ? 'badge badge-success' : 'badge badge-neutral'}>
                    {selected.eligible ? 'Éligible' : 'Non éligible'}
                  </span>
                } />
              </div>
            </div>

            <div className="section-card">
              <div className="section-card-header"><h2>Historique rémunération (3 ans)</h2></div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Année</th>
                    <th>Salaire fixe</th>
                    <th>Augmentation</th>
                    <th>Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {[...selected.historiqueRemuneration].reverse().map(h => (
                    <tr key={h.annee}>
                      <td style={{ fontWeight: 600 }}>{h.annee}</td>
                      <td>{fmtEur(h.salaire)}</td>
                      <td style={{ color: '#1b7e39' }}>+{fmtEur(h.augmentation)}</td>
                      <td style={{ color: '#0a6ed1' }}>{fmtEur(h.bonus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '1rem 1.25rem', background: '#f9f9f9', borderTop: '1px solid #e5e5e5', fontSize: '.8rem', color: '#6b6b6b' }}>
                Évolution sur 3 ans : {fmtEur(selected.historiqueRemuneration[2].salaire - selected.historiqueRemuneration[0].salaire)}{' '}
                ({(((selected.historiqueRemuneration[2].salaire - selected.historiqueRemuneration[0].salaire) / selected.historiqueRemuneration[0].salaire) * 100).toFixed(1)}%)
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#fff',
            border: '1px dashed #c9c9c9',
            borderRadius: '.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            color: '#a0a0a0',
            fontSize: '.9rem',
          }}>
            Sélectionnez un collaborateur pour voir sa fiche
          </div>
        )}
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', alignItems: 'center' }}>
      <span style={{ color: '#6b6b6b' }}>{label}</span>
      <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{value}</span>
    </div>
  );
}
