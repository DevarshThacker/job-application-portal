import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { appsApi } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader, Spinner, ErrorState, EmptyState, StatusBadge, Table, Pagination, Button, Field } from '../../components/ui';
import { STATUS_LABELS, fmtDate } from '../../utils/format';

export default function MyApplications() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useFetch(() => appsApi.mine({ page, limit: 10, status: status || undefined }), [page, status]);
  const cols = [
    { key: 'job', header: 'Job', render: (a) => <div><Link to={`/candidate/applications/${a.id}`} className="font-medium text-slate-900 hover:text-brand-600">{a.job.title}</Link><p className="text-xs text-slate-500">{a.job.companyName} · {a.job.location}</p></div> },
    { key: 'appliedAt', header: 'Applied', render: (a) => fmtDate(a.appliedAt) },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'actions', header: '', className: 'text-right', render: (a) => <Link to={`/candidate/applications/${a.id}`} className="text-sm font-medium text-brand-600">Track</Link> },
  ];
  return (
    <>
      <PageHeader title="My applications" subtitle="Track the status of every job you applied to." />
      <div className="mb-4 max-w-xs"><Field label="Filter by status" as="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Field></div>
      {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <Table columns={cols} rows={data.data} empty={<EmptyState icon={FileText} title="No applications found" action={<Link to="/jobs"><Button>Browse jobs</Button></Link>}>You have not applied to any jobs{status ? ' with this status' : ''} yet.</EmptyState>} />
          <Pagination meta={data.meta} onChange={setPage} />
        </>
      )}
    </>
  );
}
