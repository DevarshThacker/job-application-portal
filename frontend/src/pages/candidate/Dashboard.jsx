import { Link } from 'react-router-dom';
import { FileText, Files, Briefcase, Trophy } from 'lucide-react';
import { dashApi } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatCard, Card, Spinner, ErrorState, StatusBadge, EmptyState, Button } from '../../components/ui';
import { StatusPie } from '../../components/Charts';
import { timeAgo } from '../../utils/format';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(() => dashApi.get('candidate'), []);
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { totals, byStatus, recent } = data;
  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]} 👋`} subtitle="Here is where your job search stands." actions={<Link to="/jobs"><Button>Browse jobs</Button></Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Applications" value={totals.applications} />
        <StatCard icon={Trophy} label="Offers" value={byStatus.OFFER} tone="green" />
        <StatCard icon={Files} label="Resumes" value={totals.resumes} tone="indigo" />
        <StatCard icon={Briefcase} label="Open jobs" value={totals.openJobs} tone="amber" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-slate-900">Recent activity</h2><Link to="/candidate/applications" className="text-sm font-medium text-brand-600">View all</Link></div>
            {recent.length === 0 ? <EmptyState icon={FileText} title="No applications yet" action={<Link to="/jobs"><Button>Find jobs</Button></Link>}>Apply to a job and it will show up here.</EmptyState> : (
              <ul className="divide-y divide-slate-100">
                {recent.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0"><Link to={`/candidate/applications/${a.id}`} className="block truncate font-medium text-slate-900 hover:text-brand-600">{a.job.title}</Link><p className="text-xs text-slate-500">{a.job.companyName} · updated {timeAgo(a.updatedAt)}</p></div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="lg:col-span-2"><StatusPie byStatus={byStatus} title="My applications by status" /></div>
      </div>
    </>
  );
}
