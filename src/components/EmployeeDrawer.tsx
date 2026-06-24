// A FAIRE — Connexion SAP : les données employé sont issues de S/4HANA API_EMPLOYEE_SRV
// + PA0008 (salaire de base) + PA0015 (paiements complémentaires) + PA0014 (primes).
// En production, appeler getEmployeeById(matricule) depuis src/services/api.ts.

import { employees } from '../data/mockData';
import type { Employee } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const GRADE_LABELS: Record<string, string> = {
  P1: 'Assistant', P2: 'Technicien', P3: 'Cadre', P4: 'Cadre senior',
  M1: 'Manager', M2: 'Senior Manager', D1: 'Directeur', D2: 'Directeur senior',
};

interface Props {
  matricule: string | null;
  onClose: () => void;
}

export default function EmployeeDrawer({ matricule, onClose }: Props) {
  if (!matricule) return null;

  const emp: Employee | undefined = employees.find(e => e.matricule === matricule);
  if (!emp) return null;

  const manager = employees.find(e => e.matricule === emp.manager);
  const ancienneteYears = emp.anciennete;
  const lastHisto = emp.historiqueRemuneration.at(-1);
  const prevHisto = emp.historiqueRemuneration.at(-2);
  const evolPct = prevHisto && prevHisto.salaire > 0
    ? ((emp.salaireActuel - prevHisto.salaire) / prevHisto.salaire * 100).toFixed(1)
    : null;

  const chartData = emp.historiqueRemuneration.map(h => ({
    annee: h.annee.toString(),
    Salaire: h.salaire,
    Bonus: h.bonus,
    Augmentation: h.augmentation,
  }));

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.875rem' }}>
            <div className="avatar" style={{
              width: 44, height: 44, fontSize: '.9rem',
              background: emp.genre === 'F' ? '#9c27b0' : 'var(--primary)',
            }}>
              {emp.prenom[0]}{emp.nom[0]}
            </div>
            <div>
              <h2>{emp.prenom} {emp.nom}</h2>
              <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginTop: '.1rem' }}>
                {emp.matricule} · {GRADE_LABELS[emp.grade] ?? emp.grade} Éch.{emp.echelon}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: 'var(--text-secondary)', padding: '.25rem .5rem' }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="drawer-body">
          {/* Badges */}
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <span className="badge badge-neutral">{emp.entite}</span>
            <span className="badge badge-neutral">{emp.division}</span>
            <span className={`badge ${emp.eligible ? 'badge-success' : 'badge-neutral'}`}>
              {emp.eligible ? '✓ Éligible' : 'Non éligible'}
            </span>
            <span className="badge badge-info">{emp.genre === 'F' ? 'Femme' : 'Homme'}</span>
          </div>

          {/* KPI rémunération */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="kpi-card" style={{ padding: '1rem' }}>
              <div className="kpi-label">Salaire actuel</div>
              <div className="kpi-value" style={{ fontSize: '1.375rem' }}>{fmtEur(emp.salaireActuel)}</div>
              {evolPct && (
                <div className="kpi-sub">
                  <span className={`kpi-sub-${Number(evolPct) >= 0 ? 'up' : 'down'}`}>
                    {Number(evolPct) >= 0 ? '+' : ''}{evolPct}% vs N-1
                  </span>
                </div>
              )}
            </div>
            <div className="kpi-card" style={{ padding: '1rem' }}>
              <div className="kpi-label">Bonus N-1</div>
              <div className="kpi-value" style={{ fontSize: '1.375rem' }}>{lastHisto ? fmtEur(lastHisto.bonus) : '—'}</div>
              {lastHisto && <div className="kpi-sub">+{lastHisto.augmentation > 0 ? fmtEur(lastHisto.augmentation) : '—'} augm.</div>}
            </div>
          </div>

          {/* Informations */}
          <div className="section-card" style={{ marginBottom: '1.25rem' }}>
            <div className="section-card-header"><h2>Informations</h2></div>
            <div className="section-card-body">
              <table style={{ width: '100%', fontSize: '.875rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Grade',       `${emp.grade} — ${GRADE_LABELS[emp.grade] ?? emp.grade}`],
                    ['Échelon',     emp.echelon.toString()],
                    ['Ancienneté',  `${ancienneteYears} ans (depuis ${new Date(emp.dateEntree).toLocaleDateString('fr-FR')})`],
                    ['Manager',     manager ? `${manager.prenom} ${manager.nom}` : emp.manager],
                    ['Division',    emp.division],
                    ['Entité',      emp.entite],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td style={{ padding: '.4rem 0', color: 'var(--text-secondary)', width: '40%' }}>{label}</td>
                      <td style={{ padding: '.4rem 0', fontWeight: 500 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historique rémunération */}
          <div className="section-card">
            <div className="section-card-header"><h2>Historique rémunération (3 ans)</h2></div>
            <div style={{ padding: '1rem 1.25rem' }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip formatter={(v) => fmtEur(Number(v))} contentStyle={{ borderRadius: '.375rem', border: '1px solid var(--border)', fontSize: '.8rem' }} />
                  <Bar dataKey="Salaire" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Bonus"   fill="var(--accent)"  radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '.5rem', justifyContent: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ width: 12, height: 12, background: 'var(--primary)', borderRadius: 2, display: 'inline-block' }} />
                  Salaire de base
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ width: 12, height: 12, background: 'var(--accent)', borderRadius: 2, display: 'inline-block' }} />
                  Bonus
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </>
  );
}
