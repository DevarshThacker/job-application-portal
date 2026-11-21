import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui';
import { roleHome, cx } from '../utils/format';

export function Brand({ to = '/', light }) {
  return (
    <Link to={to} className={cx('flex items-center gap-2 text-lg font-bold', light ? 'text-white' : 'text-slate-900')}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><Briefcase className="h-4 w-4" aria-hidden /></span>HireFlow
    </Link>
  );
}

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const link = ({ isActive }) => cx('rounded-md px-3 py-2 text-sm font-medium', isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900');
  const doLogout = async () => { await logout(); toast.info('You have been logged out'); nav('/'); };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLink to="/" end className={link}>Home</NavLink>
            <NavLink to="/jobs" className={link}>Browse Jobs</NavLink>
            {user ? (
              <>
                <NavLink to={roleHome(user.role)} className={link}>Dashboard</NavLink>
                <Button variant="secondary" size="sm" className="ml-2" onClick={doLogout}>Log out</Button>
              </>
            ) : (
              <>
                <NavLink to="/register/recruiter" className={link}>For Recruiters</NavLink>
                <Link to="/login" className="ml-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Log in</Link>
                <Link to="/register" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Sign up</Link>
              </>
            )}
          </nav>
          <button className="rounded-md p-2 text-slate-600 md:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t border-slate-200 bg-white px-4 py-3 md:hidden" aria-label="Mobile" onClick={() => setOpen(false)}>
            <NavLink to="/" end className={link}>Home</NavLink>
            <NavLink to="/jobs" className={link}>Browse Jobs</NavLink>
            {user ? (
              <>
                <NavLink to={roleHome(user.role)} className={link}>Dashboard</NavLink>
                <button className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600" onClick={doLogout}>Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/register/recruiter" className={link}>For Recruiters</NavLink>
                <NavLink to="/login" className={link}>Log in</NavLink>
                <NavLink to="/register" className={link}>Sign up</NavLink>
              </>
            )}
          </nav>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row">
          <Brand /><p>© {new Date().getFullYear()} HireFlow. Academic demo project.</p>
        </div>
      </footer>
    </div>
  );
}
