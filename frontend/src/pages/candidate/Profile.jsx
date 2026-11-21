import { PageHeader } from '../../components/ui';
import ProfileForm from '../../components/ProfileForm';
export default function CandidateProfile() {
  return (<><PageHeader title="My profile" subtitle="Recruiters see this information when you apply." /><ProfileForm role="CANDIDATE" /></>);
}
