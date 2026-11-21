import { forwardRef, useEffect, useRef } from 'react';
import { Loader2, Inbox, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cx, STATUS_LABELS, STATUS_STYLES } from '../utils/format';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm disabled:bg-brand-500/60',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-60',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-60',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:opacity-60',
};
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }) {
  return (
    <button
      disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed', size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm', VARIANTS[variant], className)}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Spinner({ label = 'Loading…', className }) {
  return (
    <div role="status" className={cx('flex items-center justify-center gap-2 py-16 text-slate-500', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden /> <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3"><Icon className="h-6 w-6 text-slate-400" aria-hidden /></div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="flex-1"><p className="font-medium">Something went wrong</p><p className="mt-0.5">{message}</p></div>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[status])}>{STATUS_LABELS[status] || status}</span>;
}

export function Card({ className, children, ...rest }) {
  return <div className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...rest}>{children}</div>;
}

export function StatCard({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', indigo: 'bg-indigo-50 text-indigo-600', red: 'bg-red-50 text-red-600' };
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cx('rounded-lg p-3', tones[tone])}><Icon className="h-6 w-6" aria-hidden /></div>
      <div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-semibold text-slate-900">{value}</p></div>
    </Card>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Pagination({ meta, onChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
      <p className="text-slate-500">Page {meta.page} of {meta.totalPages} · {meta.total} results</p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /> Prev</Button>
        <Button size="sm" variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onChange(meta.page + 1)} aria-label="Next page">Next <ChevronRight className="h-4 w-4" /></Button>
      </div>
    </nav>
  );
}

export const Field = forwardRef(function Field({ label, error, hint, as = 'input', className, children, id, ...rest }, ref) {
  const fid = id || `f-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const Tag = as;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <Tag
        id={fid} ref={ref} aria-invalid={!!error} aria-describedby={error ? `${fid}-err` : undefined}
        className={cx('block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30', error ? 'border-red-400' : 'border-slate-300')}
        {...rest}
      >{children}</Tag>
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${fid}-err`} role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="dlg-title" className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        {children}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function Table({ columns, rows, rowKey = 'id', empty }) {
  if (!rows?.length) return empty || null;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>{columns.map((c) => <th key={c.key} scope="col" className={cx('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500', c.className)}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r[rowKey]} className="hover:bg-slate-50/60">
                {columns.map((c) => <td key={c.key} className={cx('px-4 py-3 align-middle text-slate-700', c.className)}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
