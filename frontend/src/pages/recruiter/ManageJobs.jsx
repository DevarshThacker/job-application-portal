import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Lock, Unlock, Briefcase, PlusCircle } from 'lucide-react';
import { jobsApi, errorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner, ErrorState, EmptyState, Table, Pagination, Button, ConfirmDialog, Field } from '../../components/ui';
import { TYPE_LABELS, fmtDate } from '../../utils/format';

export default function ManageJobs({ admin }) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useFetch(() => jobsApi.list({ ...(admin ? {} : { mine: 'true' }), status: status || undefined, page, limit: 10 }), [page, status]);
  const base = admin ? '/admin/jobs' : '/recruiter/jobs';

  const toggle = async (j) => {
    try { await jobsApi.update(j.id, { status: j.status === 'OPEN' ? 'CLOSED' : 'OPEN' }); toast.success(j.status === 'OPEN' ? 'Job closed' : 'Job reopened'); reload(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const remove = async () => {
    setBusy(true);
    try { await jobsApi.remove(del.id); toast.success('Job deleted'); setDel(null); reload(); } catch (e) { toast.error(errorMessage(e)); setDel(null); } finally { setBusy(false); }
  };
  const cols = [
    { key: 'title', header: 'Job', render: (j) => <div><Link to={`/jobs/${j.id}`} className="font-medium text-slate-900 hover:text-brand-600">{j.title}</Link><p className="text-xs text-slate-500">{j.companyName} · {j.location}</p></div> },
    { key: 'type', header: 'Type', render: (j) => TYPE_LABELS[j.employmentType] },
    { key: 'apps', header: 'Applicants', render: (j) => <Link className="font-medium text-brand-600" to={`${admin ? '/admin/applications' : '/recruiter/applicants'}?jobId=${j.id}`}>{j._count.applications}</Link> },
    { key: 'status', header: 'Status', render: (j) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${j.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{j.status === 'OPEN' ? 'Open' : 'Closed'}</span> },
    { key: 'createdAt', header: 'Posted', render: (j) => fmtDate(j.createdAt) },
    { key: 'actions', header: '', className: 'text-right', render: (j) => (
      <div className="flex justify-end gap-1">
        <Link to={`${base}/${j.id}/edit`} aria-label={`Edit ${j.title}`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></Link>
        <Button size="sm" variant="ghost" onClick={() => toggle(j)} aria-label={`${j.status === 'OPEN' ? 'Close' : 'Reopen'} ${j.title}`}>{j.status === 'OPEN' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}</Button>
        <Button size="sm" variant="ghost" onClick={() => setDel(j)} aria-label={`Delete ${j.title}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>
      </div>) },
  ];
  return (
    <>
      <PageHeader title={admin ? 'All job postings' : 'Manage jobs'} subtitle={admin ? 'Moderate any job on the platform.' : 'Edit, close or reopen your postings.'}
        actions={!admin && <Link to="/recruiter/jobs/new"><Button><PlusCircle className="h-4 w-4" aria-hidden />Create job</Button></Link>} />
      <div className="mb-4 max-w-xs"><Field label="Status" as="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></Field></div>
      {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <Table columns={cols} rows={data.data} empty={<EmptyState icon={Briefcase} title="No jobs found" action={!admin && <Link to="/recruiter/jobs/new"><Button>Create your first job</Button></Link>}>Nothing to show for this filter.</EmptyState>} />
          <Pagination meta={data.meta} onChange={setPage} />
        </>
      )}
      <ConfirmDialog open={!!del} danger loading={busy} title="Delete job?" message={`“${del?.title}” and all of its ${del?._count.applications} application(s) will be permanently deleted. Consider closing the job instead.`} confirmLabel="Delete job" onConfirm={remove} onCancel={() => setDel(null)} />
    </>
  );
}
