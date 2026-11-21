import { Link } from 'react-router-dom';
import { MapPin, Briefcase, Banknote, Building2 } from 'lucide-react';
import { Card } from './ui';
import { TYPE_LABELS, timeAgo } from '../utils/format';

export default function JobCard({ job }) {
  return (
    <Card className="p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/jobs/${job.id}`} className="block truncate text-lg font-semibold text-slate-900 hover:text-brand-600">{job.title}</Link>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600"><Building2 className="h-4 w-4 text-slate-400" aria-hidden />{job.companyName}</p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{TYPE_LABELS[job.employmentType]}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-slate-600">{job.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden />{job.location}</span>
        {job.salaryRange && <span className="flex items-center gap-1.5"><Banknote className="h-4 w-4" aria-hidden />{job.salaryRange}</span>}
        <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" aria-hidden />{timeAgo(job.createdAt)}</span>
      </div>
    </Card>
  );
}
