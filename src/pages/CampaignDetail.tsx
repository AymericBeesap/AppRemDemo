import { useParams } from 'react-router-dom';
// A FAIRE — Connexion CAP : remplacer `campaigns` par getCampaignById(id) de src/services/api.ts
// GET /cap/odata/v4/RemunerationService/Campaigns(id)?$expand=WorkflowEtapes,Population
import { campaigns } from '../data/mockData';
import AugmentationDetail from './AugmentationDetail';
import BonusDetail from './BonusDetail';
import GpecDetail from './GpecDetail';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const campaign = campaigns.find(c => c.id === id);

  if (!campaign) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b6b6b' }}>
        Campagne introuvable.
      </div>
    );
  }

  if (campaign.type === 'augmentation') return <AugmentationDetail campaignId={campaign.id} />;
  if (campaign.type === 'bonus')        return <BonusDetail        campaignId={campaign.id} />;
  if (campaign.type === 'gpec')         return <GpecDetail         campaignId={campaign.id} />;

  return null;
}
