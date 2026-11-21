import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { jobsApi, errorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, Spinner, ErrorState } from '../../components/ui';
import { JobForm } from '../../components/FormParts';

export function CreateJob() {
  const toast = useToast(); const nav = useNavigate(); const [busy, setBusy] = useState(false);
  const submit = async (v) => {
    setBusy(true);
    try { const j = await jobsApi.create({ ...v, salaryRange: v.salaryRange || null }); toast.success('Job posted'); nav('/recruiter/jobs', { state: { createdId: j.id } }); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (<><PageHeader title="Create a job" subtitle="Describe the role to attract the right candidates." /><Card className="max-w-3xl p-6"><JobForm onSubmit={submit} submitLabel="Publish job" busy={busy} /></Card></>);
}

export function EditJob({ admin }) {
  const { id } = useParams(); const toast = useToast(); const nav = useNavigate(); const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useFetch(() => jobsApi.get(id), [id]);
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const back = admin ? '/admin/jobs' : '/recruiter/jobs';
  const submit = async (v) => {
    setBusy(true);
    try { await jobsApi.update(id, { ...v, salaryRange: v.salaryRange || null }); toast.success('Job updated'); nav(back); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (<><PageHeader title="Edit job" subtitle={data.title} /><Card className="max-w-3xl p-6"><JobForm defaultValues={{ ...data, salaryRange: data.salaryRange || '' }} onSubmit={submit} submitLabel="Save changes" busy={busy} /></Card></>);
}
