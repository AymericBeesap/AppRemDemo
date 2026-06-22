import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// A FAIRE — Connexion CAP : remplacer `campaigns` par getCampaigns() de src/services/api.ts
// GET /cap/odata/v4/RemunerationService/Campaigns?$expand=WorkflowEtapes
// Filtrer par périmètre utilisateur : &$filter=entites/any(e: e eq '${user.entite}')
import { campaigns, campaignStatusLabels, campaignTypeLabels, type CampaignType, type CampaignStatus } from '../data/mockData';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const statusBadge: Record<CampaignStatus, string> = {
  ouverte: 'badge badge-success',
  brouillon: 'badge badge-neutral',
  en_validation: 'badge badge-warning',
  cloturee: 'badge badge-error',
};

const typeIcon: Record<CampaignType, string> = {
  augmentation: '📈',
  bonus: '💰',
  gpec: '🎓',
};

export default function Campaigns() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = campaigns.filter(c =>
    (filterType === 'all' || c.type === filterType) &&
    (filterStatus === 'all' || c.statut === filterStatus)
  );

  return (
    <>
      <div className="page-header">
        <h1>Campagnes de rémunération</h1>
        <p>Gestion des campagnes d'augmentations, bonus et GPEC</p>
      </div>

      <div className="toolbar">
        <select
          className="input-field"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">Tous types</option>
          <option value="augmentation">Augmentations individuelles</option>
          <option value="bonus">Bonus</option>
          <option value="gpec">GPEC</option>
        </select>
        <select
          className="input-field"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">Tous statuts</option>
          <option value="ouverte">Ouverte</option>
          <option value="en_validation">En validation</option>
          <option value="brouillon">Brouillon</option>
          <option value="cloturee">Clôturée</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => navigate('/campaigns/new')}>
          + Nouvelle campagne
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {filtered.map(c => {
          const pct = c.enveloppe > 0 ? (c.consomme / c.enveloppe) * 100 : 0;
          const fillClass = pct > 95 ? 'danger' : pct > 80 ? 'warning' : '';

          return (
            <div
              key={c.id}
              className="section-card"
              style={{ cursor: 'pointer', marginBottom: 0 }}
              onClick={() => navigate(`/campaigns/${c.id}`)}
            >
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.5rem' }}>{typeIcon[c.type]}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', marginBottom: '.25rem' }}>{c.nom}</div>
                      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                        <span className="chip">{campaignTypeLabels[c.type]}</span>
                        {c.entites.map(e => <span key={e} className="chip">{e}</span>)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                    <span className={statusBadge[c.statut]}>{campaignStatusLabels[c.statut]}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={ev => { ev.stopPropagation(); navigate(`/campaigns/${c.id}`); }}
                    >
                      Détail →
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '.72rem', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '.04em' }}>Population</div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a' }}>{c.population.toLocaleString('fr-FR')}</div>
                    <div style={{ fontSize: '.75rem', color: '#6b6b6b' }}>collaborateurs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.72rem', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '.04em' }}>Enveloppe</div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a' }}>{fmtEur(c.enveloppe)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.72rem', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '.04em' }}>Consommé</div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: pct > 95 ? '#bb0000' : pct > 80 ? '#e9730c' : '#1a1a1a' }}>
                      {fmtEur(c.consomme)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.72rem', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '.04em' }}>Période</div>
                    <div style={{ fontSize: '.85rem', color: '#1a1a1a', fontWeight: 500 }}>
                      {new Date(c.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      {' → '}
                      {new Date(c.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: '#6b6b6b', marginBottom: '.3rem' }}>
                    <span>Avancement budgétaire</span>
                    <span style={{ fontWeight: 600, color: pct > 95 ? '#bb0000' : pct > 80 ? '#e9730c' : '#0a6ed1' }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className={`progress-bar-fill ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#a0a0a0', background: '#fff', borderRadius: '.5rem', border: '1px solid #e5e5e5' }}>
            Aucune campagne ne correspond aux filtres sélectionnés.
          </div>
        )}
      </div>
    </>
  );
}
