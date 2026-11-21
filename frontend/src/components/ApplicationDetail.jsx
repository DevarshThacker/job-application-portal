import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Mail, MapPin, Phone, GraduationCap, Wrench, ArrowLeft } from 'lucide-react';
import { appsApi, resumesApi, errorMessage } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, Spinner, ErrorState, StatusBadge, Button, ConfirmDialog, Field, PageHeader } from '../components/ui';
import Timeline from '../components/Timeline';
import { NEXT_STATUSES, STATUS_LABELS, canWithdraw, fmtDate, TYPE_LABELS } from '../utils/format';

export default function ApplicationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: app, loading, error, reload, setData } = useFetch(() => appsApi.get(id), [id]);
  const [confirm, setConfirm] = useState(null); // {status, withdraw}
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState('');

  if (loading && !app) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const isCand = user.role === 'CANDIDATE'; const isAdmin = user.role === 'ADMIN';
  const base = user.role === 'CANDIDATE' ? '/candidate/applications' : user.role === 'RECRUITER' ? '/recruiter/applicants' : '/admin/applications';
  const nexts = NEXT_STATUSES[app.status];
  const cand = app.candidate; const prof = cand.candidateProfile || {};

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { const updated = await fn(); setData(updated); toast.success(okMsg); setConfirm(null); setNote(''); setOverrideStatus(''); }
    catch (e) { toast.error(errorMessage(e)); setConfirm(null); } finally { setBusy(false); }
  };
  const download = async () => { try { await resumesApi.download(app.resume.id, app.resume.fileName); } catch (e) { toast.error(errorMessage(e, 'Download failed')); } };

  return (
    <>
      <Link to={base} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden />Back to applications</Link>
      <PageHeader title={isCand ? app.job.title : cand.name} subtitle={isCand ? `${app.job.companyName} · ${app.job.location}` : `Applied for ${app.job.title}`} actions={<StatusBadge status={app.status} />} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Status timeline</h2>
            <Timeline history={app.history} />
          </Card>
          {app.coverNote && <Card className="p-6"><h2 className="mb-2 font-semibold text-slate-900">Cover note</h2><p className="whitespace-pre-line text-sm text-slate-700">{app.coverNote}</p></Card>}
          {!isCand && (
            <Card className="p-6">
              <h2 className="mb-3 font-semibold text-slate-900">Candidate profile</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" aria-hidden /><dd>{cand.email}</dd></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" aria-hidden /><dd>{prof.phone || '—'}</dd></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" aria-hidden /><dd>{prof.location || '—'}</dd></div>
                <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-slate-400" aria-hidden /><dd>{prof.education || '—'}</dd></div>
                <div className="flex items-start gap-2 sm:col-span-2"><Wrench className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden /><dd>{prof.skills || '—'}</dd></div>
                {prof.bio && <p className="text-slate-600 sm:col-span-2">{prof.bio}</p>}
              </dl>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 font-semibold text-slate-900">Application</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Job</dt><dd><Link className="font-medium text-brand-600" to={`/jobs/${app.job.id}`}>{app.job.title}</Link></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Type</dt><dd>{TYPE_LABELS[app.job.employmentType]}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Applied</dt><dd>{fmtDate(app.appliedAt)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Resume</dt><dd className="max-w-[60%] truncate">{app.resume.fileName}</dd></div>
            </dl>
            <Button variant="secondary" className="mt-4 w-full" onClick={download}><Download className="h-4 w-4" aria-hidden />Download resume</Button>
          </Card>

          {isCand && canWithdraw(app.status) && (
            <Card className="p-6"><h2 className="mb-2 font-semibold text-slate-900">Withdraw</h2><p className="mb-3 text-sm text-slate-500">Changed your mind? You can withdraw until a final decision is made.</p>
              <Button variant="danger" className="w-full" onClick={() => setConfirm({ withdraw: true })}>Withdraw application</Button></Card>
          )}

          {!isCand && nexts.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-3 font-semibold text-slate-900">Update status</h2>
              <div className="flex flex-col gap-2">
                {nexts.map((s) => <Button key={s} variant={s === 'REJECTED' ? 'danger' : 'primary'} onClick={() => setConfirm({ status: s })}>{s === 'REJECTED' ? 'Reject candidate' : `Move to ${STATUS_LABELS[s]}`}</Button>)}
              </div>
            </Card>
          )}
          {!isCand && nexts.length === 0 && !isAdmin && <Card className="p-6 text-sm text-slate-600">This application is in a final state ({STATUS_LABELS[app.status]}). Only an administrator can override it.</Card>}

          {isAdmin && (
            <Card className="p-6">
              <h2 className="mb-1 font-semibold text-slate-900">Administrator override</h2>
              <p className="mb-3 text-xs text-slate-500">Set any status. A note is required and is recorded in the history.</p>
              <Field label="New status" as="select" value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}>
                <option value="">Select…</option>{Object.entries(STATUS_LABELS).filter(([v]) => v !== app.status).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Field>
              <Field label="Reason" className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button className="mt-3 w-full" disabled={!overrideStatus || !note.trim()} loading={busy} onClick={() => run(() => appsApi.setStatus(app.id, { status: overrideStatus, note }), 'Status overridden')}>Apply override</Button>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm} danger={confirm?.withdraw || confirm?.status === 'REJECTED'} loading={busy}
        title={confirm?.withdraw ? 'Withdraw application?' : confirm?.status === 'REJECTED' ? 'Reject this candidate?' : `Move to ${STATUS_LABELS[confirm?.status]}?`}
        message={confirm?.withdraw ? 'This cannot be undone. You will not be able to reapply to this job.' : `${cand.name}'s application will be updated and the change recorded in the timeline.`}
        confirmLabel={confirm?.withdraw ? 'Withdraw' : 'Confirm'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => (confirm.withdraw ? run(() => appsApi.withdraw(app.id), 'Application withdrawn') : run(() => appsApi.setStatus(app.id, { status: confirm.status, note: note || undefined }), `Status updated to ${STATUS_LABELS[confirm.status]}`))}
      >
        {!confirm?.withdraw && <div className="mt-4"><Field label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></div>}
      </ConfirmDialog>
    </>
  );
}
