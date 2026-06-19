import { useParams } from 'react-router-dom';
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
