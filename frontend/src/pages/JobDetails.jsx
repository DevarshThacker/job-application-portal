import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Briefcase, Banknote, Building2, CheckCircle2, Upload, Lock, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { jobsApi, appsApi, resumesApi, errorMessage } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, ErrorState, Card, Button, Field } from '../components/ui';
import { TYPE_LABELS, fmtDate, fmtSize } from '../utils/format';

function ApplyPanel({ job, onApplied }) {
  const toast = useToast();
  const { data: resumes, reload } = useFetch(() => resumesApi.mine(), []);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ defaultValues: { resumeId: '', coverNote: '' } });
  

  // Select the freshly uploaded resume only once its <option> has been rendered.
  useEffect(() => {
    if (pendingId && resumes?.some((r) => r.id === pendingId)) { setValue('resumeId', pendingId, { shouldValidate: true }); setPendingId(null); }
  }, [pendingId, resumes, setValue]);

  const upload = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('File is too large. Maximum size is 5 MB.');
    if (!/\.(pdf|docx)$/i.test(file.name)) return toast.error('Only PDF and DOCX files are allowed.');
    setUploading(true);
    try { const r = await resumesApi.upload(file); setPendingId(r.id); await reload(); toast.success('Resume uploaded'); }
    catch (err) { toast.error(errorMessage(err)); } finally { setUploading(false); }
  };
  const submit = async (v) => {
    setBusy(true);
    try { await appsApi.apply({ jobId: job.id, resumeId: v.resumeId, coverNote: v.coverNote || undefined }); toast.success('Application submitted!'); onApplied(); }
    catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Apply for this job</h2>
      <div>
        <Field label="Resume" as="select" error={errors.resumeId?.message} {...register('resumeId', { required: 'Please choose or upload a resume' })}>
          <option value="">{resumes?.length ? 'Select a resume…' : 'No resumes yet — upload one below'}</option>
          {resumes?.map((r) => <option key={r.id} value={r.id}>{r.fileName} ({fmtSize(r.fileSize)})</option>)}
        </Field>
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
          <Upload className="h-4 w-4" aria-hidden />{uploading ? 'Uploading…' : 'Upload new resume (PDF or DOCX, max 5 MB)'}
          <input type="file" className="sr-only" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={upload} disabled={uploading} aria-label="Upload resume file" />
        </label>
      </div>
      <Field label="Cover note (optional)" as="textarea" rows={4} maxLength={2000} placeholder="Why are you a great fit?" {...register('coverNote')} />
      <Button type="submit" loading={busy} className="w-full">Submit application</Button>
    </form>
  );
}

export default function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: job, loading, error, reload } = useFetch(() => jobsApi.get(id), [id, user?.id]);

  if (loading && !job) return <Spinner />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorState message={error} onRetry={reload} /><Link to="/jobs" className="mt-4 inline-block text-sm text-brand-600">← Back to jobs</Link></div>;

  const isOpen = job.status === 'OPEN';
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/jobs" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden />All jobs</Link>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-slate-600"><Building2 className="h-4 w-4 text-slate-400" aria-hidden />{job.companyName}</p>
              </div>
              {!isOpen && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Closed</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" aria-hidden />{job.location}</span>
              <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-slate-400" aria-hidden />{TYPE_LABELS[job.employmentType]}</span>
              {job.salaryRange && <span className="flex items-center gap-1.5"><Banknote className="h-4 w-4 text-slate-400" aria-hidden />{job.salaryRange}</span>}
              <span className="text-slate-400">Posted {fmtDate(job.createdAt)}</span>
            </div>
          </Card>
          <Card className="p-6"><h2 className="text-lg font-semibold text-slate-900">About the role</h2><p className="mt-3 whitespace-pre-line text-slate-700">{job.description}</p></Card>
          <Card className="p-6"><h2 className="text-lg font-semibold text-slate-900">Requirements</h2><p className="mt-3 whitespace-pre-line text-slate-700">{job.requirements}</p></Card>
        </div>

        <aside>
          <Card className="sticky top-24 p-6">
            {!user ? (
              <div className="text-center">
                <Lock className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
                <p className="mt-3 font-medium text-slate-900">Log in to apply</p>
                <p className="mt-1 text-sm text-slate-500">Create a free candidate account to apply for this job.</p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button onClick={() => nav('/login', { state: { from: `/jobs/${job.id}` } })}>Log in</Button>
                  <Button variant="secondary" onClick={() => nav('/register')}>Create account</Button>
                </div>
              </div>
            ) : user.role !== 'CANDIDATE' ? (
              <p className="text-sm text-slate-600">You are signed in as a {user.role.toLowerCase()}. Only candidate accounts can apply for jobs.</p>
            ) : job.hasApplied ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" aria-hidden />
                <p className="mt-3 font-semibold text-slate-900">You have applied</p>
                <Link to="/candidate/applications" className="mt-2 inline-block text-sm font-medium text-brand-600">Track your application →</Link>
              </div>
            ) : !isOpen ? (
              <p className="text-sm text-slate-600">This job is closed and no longer accepting applications.</p>
            ) : (
              <ApplyPanel job={job} onApplied={reload} />
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
