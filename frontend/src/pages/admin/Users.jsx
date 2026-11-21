import { useState } from 'react';
import { Users as UsersIcon } from 'lucide-react';
import { adminApi, errorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner, ErrorState, EmptyState, Table, Pagination, Button, ConfirmDialog, Field } from '../../components/ui';
import { fmtDate } from '../../utils/format';

export default function ManageUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1); const [role, setRole] = useState(''); const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [target, setTarget] = useState(null); const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useFetch(() => adminApi.users({ page, limit: 10, role: role || undefined, q: dq || undefined }), [page, role, dq]);

  const confirm = async () => {
    setBusy(true);
    try { await adminApi.setActive(target.id, !target.isActive); toast.success(target.isActive ? 'User deactivated' : 'User reactivated'); setTarget(null); reload(); }
    catch (e) { toast.error(errorMessage(e)); setTarget(null); } finally { setBusy(false); }
  };
  const cols = [
    { key: 'name', header: 'User', render: (u) => <div><p className="font-medium text-slate-900">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div> },
    { key: 'role', header: 'Role', render: (u) => <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{u.role}</span> },
    { key: 'company', header: 'Company', render: (u) => u.companyName || '—' },
    { key: 'createdAt', header: 'Joined', render: (u) => fmtDate(u.createdAt) },
    { key: 'isActive', header: 'Access', render: (u) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{u.isActive ? 'Active' : 'Deactivated'}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (u) => u.id === me.id ? <span className="text-xs text-slate-400">You</span> : (
      <Button size="sm" variant={u.isActive ? 'secondary' : 'primary'} onClick={() => setTarget(u)} aria-label={`${u.isActive ? 'Deactivate' : 'Reactivate'} ${u.name}`}>{u.isActive ? 'Deactivate' : 'Reactivate'}</Button>) },
  ];
  return (
    <>
      <PageHeader title="Manage users" subtitle="Control who can access the platform." />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Search" placeholder="Name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Field label="Role" as="select" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option><option value="CANDIDATE">Candidates</option><option value="RECRUITER">Recruiters</option><option value="ADMIN">Admins</option></Field>
      </div>
      {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <Table columns={cols} rows={data.data} empty={<EmptyState icon={UsersIcon} title="No users found">Adjust your search.</EmptyState>} />
          <Pagination meta={data.meta} onChange={setPage} />
        </>
      )}
      <ConfirmDialog open={!!target} danger={target?.isActive} loading={busy} title={target?.isActive ? 'Deactivate user?' : 'Reactivate user?'}
        message={target?.isActive ? `${target?.name} will be signed out and unable to log in.` : `${target?.name} will regain access.`} confirmLabel={target?.isActive ? 'Deactivate' : 'Reactivate'} onConfirm={confirm} onCancel={() => setTarget(null)} />
    </>
  );
}
