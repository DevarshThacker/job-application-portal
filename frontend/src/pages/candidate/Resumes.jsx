import { useRef, useState } from 'react';
import { Upload, Download, Trash2, FileText } from 'lucide-react';
import { resumesApi, errorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner, ErrorState, EmptyState, Table, Button, ConfirmDialog, Card } from '../../components/ui';
import { fmtDate, fmtSize } from '../../utils/format';

export default function Resumes() {
  const toast = useToast();
  const input = useRef(null);
  const { data, loading, error, reload } = useFetch(() => resumesApi.mine(), []);
  const [uploading, setUploading] = useState(false);
  const [del, setDel] = useState(null);
  const [delBusy, setDelBusy] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('File is too large. Maximum size is 5 MB.');
    if (!/\.(pdf|docx)$/i.test(file.name)) return toast.error('Only PDF and DOCX files are allowed.');
    setUploading(true);
    try { await resumesApi.upload(file); toast.success('Resume uploaded'); reload(); } catch (err) { toast.error(errorMessage(err)); } finally { setUploading(false); }
  };
  const download = async (r) => { try { await resumesApi.download(r.id, r.fileName); } catch (e) { toast.error(errorMessage(e, 'Download failed')); } };
  const confirmDelete = async () => {
    setDelBusy(true);
    try { await resumesApi.remove(del.id); toast.success('Resume deleted'); setDel(null); reload(); } catch (e) { toast.error(errorMessage(e)); setDel(null); } finally { setDelBusy(false); }
  };
  const cols = [
    { key: 'fileName', header: 'File', render: (r) => <span className="flex items-center gap-2 font-medium text-slate-900"><FileText className="h-4 w-4 text-slate-400" aria-hidden />{r.fileName}</span> },
    { key: 'fileSize', header: 'Size', render: (r) => fmtSize(r.fileSize) },
    { key: 'uploadedAt', header: 'Uploaded', render: (r) => fmtDate(r.uploadedAt) },
    { key: 'used', header: 'Used in', render: (r) => `${r._count.applications} application${r._count.applications === 1 ? '' : 's'}` },
    { key: 'actions', header: '', className: 'text-right', render: (r) => (
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={() => download(r)} aria-label={`Download ${r.fileName}`}><Download className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" disabled={r._count.applications > 0} title={r._count.applications > 0 ? 'Attached to an application' : 'Delete'} onClick={() => setDel(r)} aria-label={`Delete ${r.fileName}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>
      </div>) },
  ];
  return (
    <>
      <PageHeader title="Resume management" subtitle="Upload PDF or DOCX files up to 5 MB." actions={
        <>
          <input ref={input} type="file" className="sr-only" aria-label="Choose resume file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFile} />
          <Button onClick={() => input.current.click()} loading={uploading}><Upload className="h-4 w-4" aria-hidden />Upload resume</Button>
        </>} />
      {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <Table columns={cols} rows={data} empty={<EmptyState icon={FileText} title="No resumes yet">Upload your first resume to start applying.</EmptyState>} />
      )}
      <Card className="mt-4 p-4 text-sm text-slate-500">Resumes are private. Only you, and recruiters reviewing an application you submit, can access them.</Card>
      <ConfirmDialog open={!!del} danger title="Delete resume?" message={`“${del?.fileName}” will be permanently deleted.`} confirmLabel="Delete" loading={delBusy} onConfirm={confirmDelete} onCancel={() => setDel(null)} />
    </>
  );
}
