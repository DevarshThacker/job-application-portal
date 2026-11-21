import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { appsApi } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader, Spinner, ErrorState, EmptyState, Table, Pagination, StatusBadge, Field } from '../../components/ui';
import { STATUS_LABELS, fmtDate } from '../../utils/format';

export default function Applicants({ admin }) {
  const [sp] = useSearchParams();
  const jobId = sp.get('jobId') || undefined;
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const base = admin ? '/admin/applications' : '/recruiter/applicants';
  const { data, loading, error, reload } = useFetch(() => appsApi.list({ page, limit: 10, status: status || undefined, q: dq || undefined, jobId }), [page, status, dq, jobId]);
  const cols = [
    { key: 'cand', header: 'Candidate', render: (a) => <div><Link to={`${base}/${a.id}`} className="font-medium text-slate-900 hover:text-brand-600">{a.candidate.name}</Link><p className="text-xs text-slate-500">{a.candidate.email}</p></div> },
    { key: 'job', header: 'Job', render: (a) => <div>{a.job.title}<p className="text-xs text-slate-500">{a.job.companyName}</p></div> },
    { key: 'appliedAt', header: 'Applied', render: (a) => fmtDate(a.appliedAt) },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'actions', header: '', className: 'text-right', render: (a) => <Link to={`${base}/${a.id}`} className="text-sm font-medium text-brand-600">Review</Link> },
  ];
  return (
    <>
      <PageHeader title={admin ? 'Application overview' : 'Applicants'} subtitle={jobId ? 'Filtered to a single job.' : admin ? 'Every application on the platform.' : 'Candidates who applied to your jobs.'}
        actions={jobId && <Link className="text-sm font-medium text-brand-600" to={base}>Clear job filter</Link>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Search candidate" placeholder="Name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Field label="Status" as="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Field>
      </div>
      {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <Table columns={cols} rows={data.data} empty={<EmptyState icon={Users} title="No applications found">Try changing your filters.</EmptyState>} />
          <Pagination meta={data.meta} onChange={setPage} />
        </>
      )}
    </>
  );
}
