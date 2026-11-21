import { StatusBadge } from './ui';
import { fmtDateTime } from '../utils/format';

export default function Timeline({ history }) {
  return (
    <ol className="relative ml-3 border-l border-slate-200" aria-label="Status history">
      {history.map((h, i) => (
        <li key={h.id} className="mb-6 ml-6 last:mb-0">
          <span className={`absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ${i === history.length - 1 ? 'bg-brand-600 ring-4 ring-brand-100' : 'bg-slate-300'}`} />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={h.newStatus} />
            <time className="text-xs text-slate-500" dateTime={h.changedAt}>{fmtDateTime(h.changedAt)}</time>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {h.oldStatus ? `Changed from ${h.oldStatus.toLowerCase()}` : 'Submitted'} by <span className="font-medium text-slate-800">{h.actor?.name}</span>
            <span className="text-slate-400"> ({h.actor?.role?.toLowerCase()})</span>
          </p>
          {h.note && <p className="mt-0.5 text-sm italic text-slate-500">“{h.note}”</p>}
        </li>
      ))}
    </ol>
  );
}
