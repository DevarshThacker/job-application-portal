export const TYPE_LABELS = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship', REMOTE: 'Remote' };
export const STATUS_LABELS = { APPLIED: 'Applied', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview', OFFER: 'Offer', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn' };
export const STATUS_STYLES = {
  APPLIED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  SHORTLISTED: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  INTERVIEW: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  OFFER: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJECTED: 'bg-red-50 text-red-700 ring-red-600/20',
  WITHDRAWN: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};
export const STATUS_COLORS = { APPLIED: '#3b82f6', SHORTLISTED: '#6366f1', INTERVIEW: '#f59e0b', OFFER: '#10b981', REJECTED: '#ef4444', WITHDRAWN: '#94a3b8' };
export const NEXT_STATUSES = { APPLIED: ['SHORTLISTED', 'REJECTED'], SHORTLISTED: ['INTERVIEW', 'REJECTED'], INTERVIEW: ['OFFER', 'REJECTED'], OFFER: [], REJECTED: [], WITHDRAWN: [] };
export const canWithdraw = (s) => ['APPLIED', 'SHORTLISTED', 'INTERVIEW'].includes(s);

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtSize = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
export const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d ago`;
  return fmtDate(d);
};
export const roleHome = (role) => ({ CANDIDATE: '/candidate', RECRUITER: '/recruiter', ADMIN: '/admin' }[role] || '/');
export const cx = (...c) => c.filter(Boolean).join(' ');
