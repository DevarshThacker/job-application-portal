import { Users, Briefcase, FileText, UserCheck } from 'lucide-react';
import { dashApi } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader, StatCard, Spinner, ErrorState } from '../../components/ui';
import { StatusPie, SimpleBars } from '../../components/Charts';
import { TYPE_LABELS } from '../../utils/format';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useFetch(() => dashApi.get('admin'), []);
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { totals, byStatus, jobsByType } = data;
  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Platform-wide statistics." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={totals.users} />
        <StatCard icon={UserCheck} label="Recruiters" value={totals.recruiters} tone="indigo" />
        <StatCard icon={Briefcase} label={`Jobs (${totals.openJobs} open)`} value={totals.jobs} tone="amber" />
        <StatCard icon={FileText} label="Applications" value={totals.applications} tone="green" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StatusPie byStatus={byStatus} title="All applications by status" />
        <SimpleBars data={jobsByType.map((j) => ({ ...j, label: TYPE_LABELS[j.type] }))} xKey="label" yKey="count" title="Jobs by employment type" />
      </div>
    </>
  );
}
