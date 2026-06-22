import { useState, useEffect } from 'react';
import type { Employee, Campaign } from '../data/mockData';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { montant: number; pourcentage: number; commentaire: string }) => void;
  employee: Employee | null;
  campaign: Campaign;
  existingMontant?: number;
}

const PCT_MIN = 0;
const PCT_MAX = 10;

export default function PropositionForm({ open, onClose, onSubmit, employee, campaign, existingMontant = 0 }: Props) {
  const [montant, setMontant] = useState('');
  const [pourcentage, setPourcentage] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState('');

  const restant = campaign.enveloppe - campaign.consomme + existingMontant;
  const montantNum = parseFloat(montant) || 0;
  const pctNum = parseFloat(pourcentage) || 0;
  const nouveauSalaire = employee ? employee.salaireActuel + montantNum : 0;
  const restantApres = restant - montantNum;
  const depasse = montantNum > restant;
  const alerteSeuil = restantApres < campaign.enveloppe * 0.1 && !depasse;

  useEffect(() => {
    if (!open) return;
    setMontant('');
    setPourcentage('');
    setCommentaire('');
    setError('');
  }, [open, employee]);

  const handleMontantChange = (val: string) => {
    setMontant(val);
    if (employee && val) {
      const m = parseFloat(val) || 0;
      setPourcentage(((m / employee.salaireActuel) * 100).toFixed(2));
    }
  };

  const handlePctChange = (val: string) => {
    setPourcentage(val);
    if (employee && val) {
      const p = parseFloat(val) || 0;
      setMontant(Math.round(employee.salaireActuel * p / 100).toString());
    }
  };

  const handleSubmit = () => {
    if (!montantNum || montantNum <= 0) { setError('Le montant doit être supérieur à 0.'); return; }
    if (depasse) { setError('Le montant dépasse l\'enveloppe disponible.'); return; }
    if (pctNum > PCT_MAX) { setError(`Le taux ne peut pas dépasser ${PCT_MAX}%.`); return; }
    if (!commentaire.trim()) { setError('Le commentaire est obligatoire.'); return; }
    onSubmit({ montant: montantNum, pourcentage: pctNum, commentaire: commentaire.trim() });
    onClose();
  };

  if (!open || !employee) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 200 }}
        onClick={onClose}
      />
      {/* Drawer — 480px desktop, plein écran mobile */}
      <div className="proposition-drawer" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, background: '#fff', zIndex: 201,
        boxShadow: '-4px 0 24px rgba(0,0,0,.15)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e5e5e5',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#f5f6f7',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>Saisie de proposition</div>
            <div style={{ fontSize: '.8rem', color: '#6b6b6b', marginTop: '.15rem' }}>{campaign.nom}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b6b6b', lineHeight: 1 }}>✕</button>
        </div>

        {/* Fiche collaborateur */}
        <div style={{ padding: '1rem 1.5rem', background: '#e8f0fc', borderBottom: '1px solid #c5d7f5' }}>
          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
            <div
              className="avatar"
              style={{ background: employee.genre === 'F' ? '#9c27b0' : '#0a6ed1', width: 40, height: 40 }}
            >
              {employee.prenom[0]}{employee.nom[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{employee.prenom} {employee.nom}</div>
              <div style={{ fontSize: '.78rem', color: '#4a4a4a' }}>{employee.matricule} · {employee.grade} Éch.{employee.echelon} · {employee.entite}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem', marginTop: '.75rem' }}>
            <InfoMini label="Salaire actuel" value={fmtEur(employee.salaireActuel)} />
            <InfoMini label="Ancienneté" value={`${employee.anciennete} ans`} />
            <InfoMini label="Dernier bonus" value={fmtEur(employee.historiqueRemuneration[2].bonus)} />
          </div>
        </div>

        {/* Formulaire */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'grid', gap: '1.25rem' }}>
          {/* Enveloppe */}
          <div>
            <div style={{ fontSize: '.8rem', color: '#6b6b6b', marginBottom: '.5rem', fontWeight: 600 }}>Enveloppe disponible</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.3rem' }}>
              <span>Restant</span>
              <span style={{ fontWeight: 700, color: depasse ? '#bb0000' : '#0a6ed1' }}>{fmtEur(restant)}</span>
            </div>
            <div className="progress-bar-wrap">
              <div
                className={`progress-bar-fill ${(campaign.consomme / campaign.enveloppe) > 0.9 ? 'danger' : (campaign.consomme / campaign.enveloppe) > 0.8 ? 'warning' : ''}`}
                style={{ width: `${Math.min((campaign.consomme / campaign.enveloppe) * 100, 100)}%` }}
              />
            </div>
            <div style={{ fontSize: '.75rem', color: '#a0a0a0', marginTop: '.25rem' }}>
              {fmtEur(campaign.consomme)} consommés / {fmtEur(campaign.enveloppe)} alloués
            </div>
          </div>

          {/* Montant */}
          <div>
            <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '.4rem' }}>
              Montant d'augmentation (€) <span style={{ color: '#bb0000' }}>*</span>
            </label>
            <input
              type="number"
              min={0}
              max={restant}
              className="input-field"
              style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
              placeholder="ex: 2 500"
              value={montant}
              onChange={e => handleMontantChange(e.target.value)}
            />
          </div>

          {/* Pourcentage */}
          <div>
            <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '.4rem' }}>
              Taux d'augmentation (%) <span style={{ color: '#bb0000' }}>*</span>
            </label>
            <input
              type="number"
              min={PCT_MIN}
              max={PCT_MAX}
              step={0.1}
              className="input-field"
              style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700, color: pctNum > PCT_MAX ? '#bb0000' : undefined }}
              placeholder="ex: 4.5"
              value={pourcentage}
              onChange={e => handlePctChange(e.target.value)}
            />
            {pctNum > 0 && (
              <div style={{ fontSize: '.75rem', color: pctNum > PCT_MAX ? '#bb0000' : '#6b6b6b', marginTop: '.25rem' }}>
                {pctNum > PCT_MAX ? `⚠ Dépasse le plafond de ${PCT_MAX}%` : `Plafond : ${PCT_MAX}%`}
              </div>
            )}
          </div>

          {/* Simulation nouveau salaire */}
          {montantNum > 0 && (
            <div style={{
              padding: '1rem',
              background: depasse ? '#fff5f5' : alerteSeuil ? '#fff8f0' : '#f0f9f0',
              border: `1px solid ${depasse ? '#fca5a5' : alerteSeuil ? '#fdba74' : '#86efac'}`,
              borderRadius: '.5rem',
            }}>
              <div style={{ fontSize: '.8rem', fontWeight: 600, color: depasse ? '#bb0000' : alerteSeuil ? '#a05000' : '#1b5e20', marginBottom: '.5rem' }}>
                {depasse ? '⚠ Dépassement d\'enveloppe' : alerteSeuil ? '⚠ Enveloppe presque épuisée' : '✓ Simulation'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', fontSize: '.85rem' }}>
                <div>
                  <div style={{ color: '#6b6b6b', fontSize: '.75rem' }}>Nouveau salaire</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>{fmtEur(nouveauSalaire)}</div>
                </div>
                <div>
                  <div style={{ color: '#6b6b6b', fontSize: '.75rem' }}>Enveloppe restante après</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: depasse ? '#bb0000' : '#1a1a1a' }}>
                    {fmtEur(Math.max(0, restantApres))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Commentaire */}
          <div>
            <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '.4rem' }}>
              Justification / Commentaire <span style={{ color: '#bb0000' }}>*</span>
            </label>
            <textarea
              className="input-field"
              rows={4}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Motif de la proposition, éléments de performance, contexte…"
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
            />
            <div style={{ fontSize: '.72rem', color: '#a0a0a0', marginTop: '.2rem', textAlign: 'right' }}>
              {commentaire.length} / 500 caractères
            </div>
          </div>

          {error && (
            <div style={{
              padding: '.75rem 1rem', background: '#fff5f5', border: '1px solid #fca5a5',
              borderRadius: '.375rem', color: '#bb0000', fontSize: '.85rem',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e5e5e5',
          display: 'flex', gap: '.75rem',
          background: '#fafafa',
        }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, opacity: depasse || !montantNum || !commentaire.trim() ? .5 : 1 }}
            onClick={handleSubmit}
          >
            ✓ Soumettre la proposition
          </button>
        </div>
      </div>
    </>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '.7rem', color: '#5a5a8c', marginBottom: '.15rem' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#1a1a1a' }}>{value}</div>
    </div>
  );
}
