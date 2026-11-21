import { Link } from 'react-router-dom';
import { Briefcase, Users, Archive, PlusCircle } from 'lucide-react';
import { dashApi } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader, StatCard, Card, Spinner, ErrorState, StatusBadge, Button, EmptyState } from '../../components/ui';
import { StatusPie, SimpleBars } from '../../components/Charts';
import { timeAgo } from '../../utils/format';

export default function RecruiterDashboard() {
  const { data, loading, error, reload } = useFetch(() => dashApi.get('recruiter'), []);
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { totals, byStatus, recent, perJob } = data;
  return (
    <>
      <PageHeader title="Recruiter dashboard" subtitle="Your hiring pipeline at a glance." actions={<Link to="/recruiter/jobs/new"><Button><PlusCircle className="h-4 w-4" aria-hidden />Post a job</Button></Link>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Briefcase} label="Open jobs" value={totals.openJobs} />
        <StatCard icon={Archive} label="Closed jobs" value={totals.closedJobs} tone="amber" />
        <StatCard icon={Users} label="Total applicants" value={totals.applications} tone="green" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StatusPie byStatus={byStatus} title="Pipeline by stage" />
        <SimpleBars data={perJob.map((j) => ({ ...j, label: j.title.length > 12 ? `${j.title.slice(0, 11)}…` : j.title }))} xKey="label" yKey="applications" title="Applicants per job" />
      </div>
      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-slate-900">Latest applicants</h2><Link to="/recruiter/applicants" className="text-sm font-medium text-brand-600">View all</Link></div>
        {recent.length === 0 ? <EmptyState icon={Users} title="No applicants yet">Applications will appear here once candidates apply.</EmptyState> : (
          <ul className="divide-y divide-slate-100">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0"><Link to={`/recruiter/applicants/${a.id}`} className="block truncate font-medium text-slate-900 hover:text-brand-600">{a.candidate.name}</Link><p className="text-xs text-slate-500">{a.job.title} · {timeAgo(a.appliedAt)}</p></div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
