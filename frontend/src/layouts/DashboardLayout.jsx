import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, User, FileText, Files, Search, PlusCircle, Briefcase, Users, LogOut, Menu, X, ClipboardList, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Brand } from './PublicLayout';
import { cx } from '../utils/format';

const NAV = {
  CANDIDATE: [
    { to: '/candidate', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/jobs', label: 'Browse Jobs', icon: Search },
    { to: '/candidate/applications', label: 'My Applications', icon: FileText },
    { to: '/candidate/resumes', label: 'Resumes', icon: Files },
    { to: '/candidate/profile', label: 'My Profile', icon: User },
  ],
  RECRUITER: [
    { to: '/recruiter', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/recruiter/jobs/new', label: 'Create Job', icon: PlusCircle },
    { to: '/recruiter/jobs', label: 'Manage Jobs', icon: Briefcase, end: true },
    { to: '/recruiter/applicants', label: 'Applicants', icon: Users },
    { to: '/recruiter/profile', label: 'Company Profile', icon: User },
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: ShieldCheck, end: true },
    { to: '/admin/users', label: 'Manage Users', icon: Users },
    { to: '/admin/jobs', label: 'Manage Jobs', icon: Briefcase },
    { to: '/admin/applications', label: 'Applications', icon: ClipboardList },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const items = NAV[user.role];
  const doLogout = async () => { await logout(); toast.info('You have been logged out'); nav('/login'); };

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex h-16 items-center px-5"><Brand light /></div>
      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Sidebar" onClick={() => setOpen(false)}>
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800 hover:text-white')}>
            <Icon className="h-5 w-5" aria-hidden />{label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-slate-400">{user.email}</p>
        <p className="mt-1 inline-block rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">{user.role}</p>
        <button onClick={doLogout} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-800 hover:text-white"><LogOut className="h-4 w-4" aria-hidden />Log out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block"><div className="fixed inset-y-0 w-64">{sidebar}</div></aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} className="rounded-md p-2 text-slate-600">{open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
          <Link to="/" className="text-sm font-bold text-slate-900">HireFlow</Link><span className="w-10" />
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
