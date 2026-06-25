import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propositions, employees, campaigns } from '../data/mockData';
// A FAIRE — Connexion CAP/BPA : remplacer les données mock par :
//   getPropositionById(id) → CAP /Propositions(id)
//   puis useWorkflow().completeTask() pour la validation BPA

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface Props {
  propositionId: string | null;
  onClose: () => void;
  onValidated: () => void;
}

export default function PropositionValidationDrawer({ propositionId, onClose, onValidated }: Props) {
  const navigate = useNavigate();
  const [commentaire, setCommentaire] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [action, setAction] = useState<'valider' | 'rejeter' | null>(null);

  const proposition = propositionId ? propositions.find(p => p.id === propositionId) : null;
  const employee    = proposition ? employees.find(e => e.matricule === proposition.matricule) : null;
  const campaign    = proposition ? campaigns.find(c => c.id === proposition.campaignId) : null;

  if (!proposition || !employee || !campaign) return null;

  const salaireApres = employee.salaireActuel + proposition.montant;
  const daysLeft = Math.ceil((new Date(campaign.dateFin).getTime() - Date.now()) / 86400000);

  function handleAction(act: 'valider' | 'rejeter') {
    // A FAIRE — Connexion BPA : appeler useWorkflow().completeTask() ici
    setAction(act);
    setTimeout(() => {
      onValidated();
      setAction(null);
      setCommentaire('');
      setShowComment(false);
    }, 600);
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel" style={{ width: 440 }}>
        {/* Header */}
        <div className="drawer-header">
          <div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, marginBottom: '.2rem' }}>
              Validation proposition
            </div>
            <h2 style={{ fontSize: '1rem' }}>{campaign.nom}</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: 'var(--text-secondary)', padding: '.25rem .5rem' }}
            aria-label="Fermer"
          >×</button>
        </div>

        <div className="drawer-body" style={{ gap: '1rem', display: 'flex', flexDirection: 'column' }}>
          {/* Employé */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.875rem', padding: '1rem', background: 'var(--surface-raised)', borderRadius: 'var(--radius)' }}>
            <div className="avatar" style={{ width: 44, height: 44, fontSize: '.9rem', background: employee.genre === 'F' ? '#9c27b0' : 'var(--primary)' }}>
              {employee.prenom[0]}{employee.nom[0]}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{employee.prenom} {employee.nom}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>
                {employee.grade} Éch.{employee.echelon} · {employee.division} · {employee.entite}
              </div>
            </div>
          </div>

          {/* Proposition */}
          <div style={{ background: 'var(--primary-bg)', borderRadius: 'var(--radius)', padding: '1rem', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.75rem' }}>
              Proposition Manager
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                  +{proposition.pourcentage.toFixed(1)}%
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-secondary)' }}>Augmentation</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>
                  +{fmtEur(proposition.montant)}
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-secondary)' }}>Montant annuel</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{fmtEur(salaireApres)}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-secondary)' }}>Nouveau salaire</div>
              </div>
            </div>
            {proposition.commentaire && (
              <div style={{ marginTop: '.75rem', padding: '.6rem .75rem', background: 'rgba(255,255,255,.7)', borderRadius: 'var(--radius-sm)', fontSize: '.82rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                « {proposition.commentaire} »
              </div>
            )}
            <div style={{ marginTop: '.5rem', fontSize: '.75rem', color: 'var(--text-secondary)' }}>
              Saisi par <strong>{proposition.auteur}</strong> · {new Date(proposition.dateModification).toLocaleDateString('fr-FR')}
            </div>
          </div>

          {/* Contexte salaire */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)', padding: '.75rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.25rem' }}>Salaire actuel</div>
              <div style={{ fontWeight: 700 }}>{fmtEur(employee.salaireActuel)}</div>
            </div>
            <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)', padding: '.75rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.25rem' }}>Ancienneté</div>
              <div style={{ fontWeight: 700 }}>{employee.anciennete} ans</div>
            </div>
          </div>

          {/* Échéance campagne */}
          {daysLeft <= 7 && (
            <div className="alert alert-warning" style={{ fontSize: '.82rem' }}>
              ⏰ Campagne se clôture dans <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong>
            </div>
          )}

          {/* Champ commentaire */}
          {showComment && (
            <div>
              <label style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: '.3rem', display: 'block' }}>
                Commentaire {action === 'rejeter' ? '(obligatoire)' : '(facultatif)'}
              </label>
              <textarea
                className="input-field"
                style={{ width: '100%', minHeight: 72, resize: 'vertical' }}
                placeholder="Motif ou remarque…"
                value={commentaire}
                onChange={e => setCommentaire(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="drawer-footer" style={{ flexDirection: 'column', gap: '.75rem' }}>
          <div style={{ display: 'flex', gap: '.75rem', width: '100%' }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, color: 'var(--error)', borderColor: 'var(--error-border)' }}
              onClick={() => { setShowComment(true); setAction('rejeter'); }}
              disabled={action !== null}
            >
              ✕ Rejeter
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2, background: 'var(--success)', borderColor: 'var(--success)' }}
              onClick={() => {
                if (!showComment) { setShowComment(true); setAction('valider'); }
                else handleAction('valider');
              }}
              disabled={action !== null}
            >
              {action === 'valider' ? '✓ Validation en cours…' : '✓ Valider la proposition'}
            </button>
          </div>
          {showComment && action === 'rejeter' && (
            <button
              className="btn btn-danger"
              style={{ width: '100%' }}
              onClick={() => handleAction('rejeter')}
              disabled={!commentaire.trim()}
            >
              Confirmer le rejet
            </button>
          )}
          <div style={{ textAlign: 'center' }}>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', color: 'var(--primary-light)', textDecoration: 'underline' }}
              onClick={() => { navigate(`/campaigns/${campaign.id}`); onClose(); }}
            >
              Voir la campagne complète →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
