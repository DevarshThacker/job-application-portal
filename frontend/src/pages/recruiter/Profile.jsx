import { PageHeader } from '../../components/ui';
import ProfileForm from '../../components/ProfileForm';
export default function RecruiterProfile() {
  return (<><PageHeader title="Company profile" subtitle="Updating the company name also updates your existing job postings." /><ProfileForm role="RECRUITER" /></>);
}
