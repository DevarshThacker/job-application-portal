import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SearchX } from 'lucide-react';
import { jobsApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import JobCard from '../components/JobCard';
import { Spinner, EmptyState, ErrorState, Pagination, Field, Button } from '../components/ui';
import { TYPE_LABELS } from '../utils/format';

export default function BrowseJobs() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const [location, setLocation] = useState(sp.get('location') || '');
  const type = sp.get('type') || '';
  const page = parseInt(sp.get('page') || '1', 10);
  const dq = useDebounce(q); const dl = useDebounce(location);

  useEffect(() => {
    const next = new URLSearchParams();
    if (dq) next.set('q', dq); if (dl) next.set('location', dl); if (type) next.set('type', type);
    if (next.toString() !== new URLSearchParams([...sp].filter(([k]) => k !== 'page')).toString()) setSp(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, dl]);

  const { data, loading, error, reload } = useFetch(
    () => jobsApi.list({ q: dq || undefined, location: dl || undefined, type: type || undefined, page, limit: 9 }),
    [dq, dl, type, page],
  );
  const setParam = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n); };
  const clear = () => { setQ(''); setLocation(''); setSp(new URLSearchParams()); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Browse jobs</h1>
      <p className="mt-1 text-slate-500">Search by keyword, then narrow by type and location.</p>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Keyword" placeholder="Title, skill, company" value={q} onChange={(e) => setQ(e.target.value)} />
        <Field label="Location" placeholder="e.g. Remote, London" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Field label="Job type" as="select" value={type} onChange={(e) => setParam('type', e.target.value)}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Field>
        <div className="flex items-end"><Button type="button" variant="secondary" className="w-full" onClick={clear}>Clear filters</Button></div>
      </form>

      <div className="mt-6" aria-live="polite">
        {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? (
          <EmptyState icon={SearchX} title="No jobs match your search" action={<Button variant="secondary" onClick={clear}>Reset filters</Button>}>Try different keywords or remove a filter.</EmptyState>
        ) : (
          <>
            <p className="mb-3 flex items-center gap-1.5 text-sm text-slate-500"><Search className="h-4 w-4" aria-hidden />{data.meta.total} job{data.meta.total === 1 ? '' : 's'} found</p>
            <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>{data.data.map((j) => <JobCard key={j.id} job={j} />)}</div>
            <Pagination meta={data.meta} onChange={(p) => setParam('page', String(p))} />
          </>
        )}
      </div>
    </div>
  );
}
