// A FAIRE — Connexion SAP : les données du BSI sont issues de S/4HANA :
//   - PA0008 Salaire de base (données mensuelles → annualiser)
//   - PA0015 Paiements complémentaires (primes, bonus)
//   - PA0014 Rémunération variable récurrente (intéressement, participation)
//   - Congés, avantages en nature : PA0001 (affectation organisationnelle)
//
// Appeler getEmployeeById(matricule) et getPayrollHistory(matricule, year)
// depuis src/services/api.ts une fois l'API S/4HANA connectée.
// La génération PDF actuelle utilise html2canvas + jsPDF (déjà installés).

import { useState, useRef } from 'react';
import { employees } from '../data/mockData';
import type { Employee } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const GRADE_LABELS: Record<string, string> = {
  P1: 'Assistant', P2: 'Technicien', P3: 'Cadre', P4: 'Cadre senior',
  M1: 'Manager', M2: 'Senior Manager', D1: 'Directeur', D2: 'Directeur senior',
};

export default function Bsi() {
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<Employee | null>(null);
  const [generating, setGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const filtered = employees.filter(e =>
    (e.nom.toLowerCase() + ' ' + e.prenom.toLowerCase() + ' ' + e.matricule.toLowerCase()).includes(search.toLowerCase())
  );

  async function handleGenerate() {
    if (!contentRef.current || !selected) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`BSI_${selected.nom}_${selected.prenom}_${new Date().getFullYear()}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  const chartData = selected?.historiqueRemuneration.map(h => ({
    annee: h.annee.toString(),
    'Salaire de base': h.salaire,
    Bonus: h.bonus,
    Augmentation: h.augmentation,
  })) ?? [];

  const totalRemu = selected
    ? (selected.salaireActuel + (selected.historiqueRemuneration.at(-1)?.bonus ?? 0))
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Bilan Social Individualisé (BSI)</h1>
        <p>Synthèse annuelle de rémunération par collaborateur — génération PDF</p>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Panneau de recherche */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div className="section-card">
            <div className="section-card-header"><h2>Rechercher un collaborateur</h2></div>
            <div className="section-card-body">
              <input
                className="input-field"
                style={{ width: '100%', marginBottom: '.75rem' }}
                placeholder="Nom, prénom ou matricule…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {filtered.length === 0 && (
                  <div style={{ color: 'var(--text-disabled)', fontSize: '.85rem', textAlign: 'center', padding: '1rem' }}>
                    Aucun résultat
                  </div>
                )}
                {filtered.map(e => (
                  <div
                    key={e.matricule}
                    onClick={() => setSelected(e)}
                    style={{
                      padding: '.625rem .75rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      background: selected?.matricule === e.matricule ? 'var(--primary-bg)' : 'transparent',
                      borderLeft: `3px solid ${selected?.matricule === e.matricule ? 'var(--primary)' : 'transparent'}`,
                      marginBottom: '.2rem',
                      transition: 'background var(--transition)',
                    }}
                    onMouseEnter={el => { if (selected?.matricule !== e.matricule) (el.currentTarget as HTMLElement).style.background = 'var(--surface-raised)'; }}
                    onMouseLeave={el => { if (selected?.matricule !== e.matricule) (el.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{e.prenom} {e.nom}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)' }}>
                      {e.matricule} · {e.grade} · {e.entite}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contenu BSI */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div className="empty-state" style={{ minHeight: 400, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div className="empty-state-icon">📄</div>
              <h3>Sélectionner un collaborateur</h3>
              <p>Recherchez et sélectionnez un collaborateur pour afficher son Bilan Social Individualisé.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.75rem' }}>
                <button
                  className="btn btn-accent"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? '⏳ Génération…' : '⬇ Télécharger PDF'}
                </button>
              </div>

              <div ref={contentRef} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '2rem' }}>
                {/* En-tête BSI */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingBottom: '1.25rem', borderBottom: '2px solid var(--primary)' }}>
                  <div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, marginBottom: '.3rem' }}>
                      Bilan Social Individualisé
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {selected.prenom} {selected.nom}
                    </div>
                    <div style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginTop: '.25rem' }}>
                      {GRADE_LABELS[selected.grade] ?? selected.grade} · Échelon {selected.echelon} · {selected.entite}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)' }}>Matricule</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selected.matricule}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', marginTop: '.5rem' }}>Exercice</div>
                    <div style={{ fontWeight: 700 }}>{new Date().getFullYear()}</div>
                  </div>
                </div>

                {/* KPI principaux */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { label: 'Rémunération fixe', val: fmtEur(selected.salaireActuel), color: 'var(--primary)' },
                    { label: 'Bonus variable', val: fmtEur(selected.historiqueRemuneration.at(-1)?.bonus ?? 0), color: 'var(--accent-hover)' },
                    { label: 'Rémunération totale', val: fmtEur(totalRemu), color: 'var(--success)' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, marginBottom: '.4rem' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: item.color }}>{item.val}</div>
                    </div>
                  ))}
                </div>

                {/* Informations collaborateur */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.75rem', color: 'var(--text-primary)' }}>Informations contractuelles</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                    {[
                      ['Entité',       selected.entite],
                      ['Division',     selected.division],
                      ['Ancienneté',   `${selected.anciennete} ans`],
                      ['Date d\'entrée', new Date(selected.dateEntree).toLocaleDateString('fr-FR')],
                      ['Grade',        `${selected.grade} — ${GRADE_LABELS[selected.grade] ?? selected.grade}`],
                      ['Éligibilité',  selected.eligible ? 'Éligible aux augmentations' : 'Non éligible'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem .6rem', background: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '.8rem' }}>{k}</span>
                        <span style={{ fontWeight: 600, fontSize: '.8rem' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Évolution de la rémunération */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.75rem' }}>Évolution de la rémunération (3 ans)</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="annee" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip formatter={(v) => fmtEur(Number(v))} contentStyle={{ borderRadius: '.375rem', fontSize: '.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '.8rem' }} />
                      <Bar dataKey="Salaire de base" fill="var(--primary)"       radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Bonus"           fill="var(--accent)"        radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Augmentation"    fill="var(--success)"       radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tableau détaillé */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.75rem' }}>Détail par exercice</div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Exercice</th>
                        <th>Salaire de base</th>
                        <th>Augmentation</th>
                        <th>Bonus</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.historiqueRemuneration.map(h => (
                        <tr key={h.annee}>
                          <td><strong>{h.annee}</strong></td>
                          <td>{fmtEur(h.salaire)}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 600 }}>+{fmtEur(h.augmentation)}</td>
                          <td style={{ color: 'var(--accent-hover)', fontWeight: 600 }}>{fmtEur(h.bonus)}</td>
                          <td><strong>{fmtEur(h.salaire + h.bonus)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mention légale */}
                <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)', fontSize: '.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Ce bilan est établi à titre informatif. Les données salariales sont confidentielles et soumises au RGPD.
                  Document généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}.
                  Directive EU 2023/970 relative à la transparence des rémunérations — transposition 30/06/2026.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
