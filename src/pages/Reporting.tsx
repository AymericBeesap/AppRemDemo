import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { genderEquityData, employees, budgetByEntity } from '../data/mockData';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const histoData = employees
  .filter(e => e.matricule !== 'E010' && e.matricule !== 'E011')
  .slice(0, 5)
  .map(e => ({
    name: `${e.prenom} ${e.nom[0]}.`,
    '2023': e.historiqueRemuneration[0].salaire,
    '2024': e.historiqueRemuneration[1].salaire,
    '2025': e.historiqueRemuneration[2].salaire,
  }));

const radarData = [
  { critere: 'Équité H/F', score: 72 },
  { critere: 'Ancienneté', score: 85 },
  { critere: 'Performance', score: 68 },
  { critere: 'Marché', score: 79 },
  { critere: 'Transparence', score: 91 },
];

export default function Reporting() {
  const totalPop = employees.length;
  const women = employees.filter(e => e.genre === 'F').length;
  const pctWomen = ((women / totalPop) * 100).toFixed(0);

  const avgEcart = genderEquityData.reduce((s, d) => s + d.ecart, 0) / genderEquityData.length;

  return (
    <>
      <div className="page-header">
        <h1>Reporting & Équité salariale</h1>
        <p>Analyse RH · Transparence salariale (Directive UE – obligations au 01/01/2027)</p>
      </div>

      {/* Alerte réglementaire */}
      <div style={{
        background: '#fff8e1',
        border: '1px solid #f59e0b',
        borderRadius: '.5rem',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '.75rem',
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1.25rem' }}>⚖️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#92400e', marginBottom: '.25rem' }}>
            Directive européenne sur la transparence salariale
          </div>
          <div style={{ fontSize: '.85rem', color: '#78350f' }}>
            Transposition attendue avant le <strong>30/06/2026</strong> · Obligations de reporting à partir du <strong>01/01/2027</strong>.
            Les écarts de rémunération H/F devront être justifiés par poste et niveau équivalent.
          </div>
        </div>
      </div>

      {/* KPIs équité */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Population totale</div>
          <div className="kpi-value">{totalPop.toLocaleString('fr-FR')}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Part Femmes</div>
          <div className="kpi-value">{pctWomen}%</div>
          <div className="kpi-sub">{women} femmes sur {totalPop}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Écart H/F moyen</div>
          <div className="kpi-value" style={{ color: Math.abs(avgEcart) > 5 ? '#bb0000' : '#1b7e39' }}>
            {avgEcart > 0 ? '+' : ''}{avgEcart.toFixed(1)}%
          </div>
          <div className="kpi-sub">toutes catégories confondues</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Grades avec écart &gt; 5%</div>
          <div className="kpi-value" style={{ color: '#bb0000' }}>
            {genderEquityData.filter(d => Math.abs(d.ecart) > 5).length}
          </div>
          <div className="kpi-sub">sur {genderEquityData.length} grades analysés</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Écart H/F par grade */}
        <div className="section-card">
          <div className="section-card-header">
            <h2>Écart de rémunération H/F par grade</h2>
            <span className="badge badge-warning">Indicateur réglementaire</span>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Salaire moyen H</th>
                  <th>Salaire moyen F</th>
                  <th>Écart (%)</th>
                  <th>Conformité</th>
                </tr>
              </thead>
              <tbody>
                {genderEquityData.map(d => (
                  <tr key={d.grade}>
                    <td><span className="chip">{d.grade}</span></td>
                    <td>{fmtEur(d.hommes)}</td>
                    <td>{fmtEur(d.femmes)}</td>
                    <td style={{ fontWeight: 700, color: d.ecart < -5 ? '#bb0000' : d.ecart > 5 ? '#bb0000' : '#1b7e39' }}>
                      {d.ecart > 0 ? '+' : ''}{d.ecart.toFixed(1)}%
                    </td>
                    <td>
                      <span className={Math.abs(d.ecart) > 5 ? 'badge badge-error' : 'badge badge-success'}>
                        {Math.abs(d.ecart) > 5 ? '⚠ À justifier' : '✓ Conforme'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Graphique écart */}
        <div className="section-card">
          <div className="section-card-header">
            <h2>Salaires moyens H/F par grade</h2>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={genderEquityData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="grade" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k€`}
                  tick={{ fontSize: 11, fill: '#6b6b6b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => fmtEur(Number(v))}
                  contentStyle={{ borderRadius: '.375rem', border: '1px solid #e5e5e5', fontSize: '.8rem' }}
                />
                <Legend wrapperStyle={{ fontSize: '.8rem' }} />
                <Bar dataKey="hommes" name="Hommes" fill="#0a6ed1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="femmes" name="Femmes" fill="#9c27b0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Évolution salaires */}
        <div className="section-card">
          <div className="section-card-header">
            <h2>Évolution des salaires (2023–2025)</h2>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={histoData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 11, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmtEur(Number(v))} contentStyle={{ borderRadius: '.375rem', border: '1px solid #e5e5e5', fontSize: '.8rem' }} />
                <Legend wrapperStyle={{ fontSize: '.78rem' }} />
                <Line type="monotone" dataKey="2023" stroke="#cce0f5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="2024" stroke="#5ba4e6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="2025" stroke="#0a6ed1" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score conformité radar */}
        <div className="section-card">
          <div className="section-card-header">
            <h2>Indice de conformité salariale</h2>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e5e5" />
                <PolarAngleAxis dataKey="critere" tick={{ fontSize: 11, fill: '#6b6b6b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="#0a6ed1" fill="#0a6ed1" fillOpacity={0.18} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: '.375rem', border: '1px solid #e5e5e5', fontSize: '.8rem' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Budget global */}
      <div className="section-card">
        <div className="section-card-header">
          <h2>Consommation budgétaire – Vue consolidée</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => alert('Export rapport réglementaire PDF')}>
            ⬇️ Export PDF
          </button>
        </div>
        <div style={{ padding: '1.25rem' }}>
          {budgetByEntity.map(b => {
            const pct = (b.consomme / b.enveloppe) * 100;
            return (
              <div key={b.entite} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.35rem', fontSize: '.875rem' }}>
                  <span style={{ fontWeight: 600 }}>{b.entite}</span>
                  <span style={{ color: '#6b6b6b' }}>
                    {fmtEur(b.consomme)} / {fmtEur(b.enveloppe)} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="progress-bar-wrap">
                  <div
                    className={`progress-bar-fill ${pct > 95 ? 'danger' : pct > 80 ? 'warning' : ''}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f5f6f7',
            borderRadius: '.375rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            fontSize: '.875rem',
          }}>
            <div>
              <div style={{ color: '#6b6b6b', marginBottom: '.25rem' }}>Total enveloppes</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a' }}>
                {fmtEur(budgetByEntity.reduce((s, b) => s + b.enveloppe, 0))}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b6b6b', marginBottom: '.25rem' }}>Total consommé</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0a6ed1' }}>
                {fmtEur(budgetByEntity.reduce((s, b) => s + b.consomme, 0))}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b6b6b', marginBottom: '.25rem' }}>Taux global</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1b7e39' }}>
                {((budgetByEntity.reduce((s, b) => s + b.consomme, 0) / budgetByEntity.reduce((s, b) => s + b.enveloppe, 0)) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
