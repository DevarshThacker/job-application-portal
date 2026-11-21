import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ShieldCheck, FileCheck2, LineChart, ArrowRight } from 'lucide-react';
import { jobsApi } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import JobCard from '../components/JobCard';
import { Spinner } from '../components/ui';

export default function Home() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const { data, loading } = useFetch(() => jobsApi.list({ limit: 6 }), []);
  const submit = (e) => { e.preventDefault(); nav(`/jobs?${new URLSearchParams({ ...(q && { q }), ...(loc && { location: loc }) })}`); };

  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">Find the job that fits your skills — and your life.</h1>
          <p className="mt-4 max-w-xl text-lg text-blue-100">Browse openings from growing teams, apply with your resume in minutes, and follow every step of your application.</p>
          <form onSubmit={submit} className="mt-8 flex max-w-3xl flex-col gap-2 rounded-xl bg-white p-2 shadow-xl sm:flex-row" role="search">
            <label className="flex flex-1 items-center gap-2 px-3"><Search className="h-5 w-5 text-slate-400" aria-hidden /><span className="sr-only">Keyword</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill or company" className="w-full py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none" /></label>
            <label className="flex flex-1 items-center gap-2 border-t border-slate-200 px-3 sm:border-l sm:border-t-0"><MapPin className="h-5 w-5 text-slate-400" aria-hidden /><span className="sr-only">Location</span>
              <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City or remote" className="w-full py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none" /></label>
            <button className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">Search jobs</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <div><h2 className="text-2xl font-bold text-slate-900">Latest openings</h2><p className="text-sm text-slate-500">Fresh roles from verified recruiters</p></div>
          <Link to="/jobs" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {loading ? <Spinner /> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data?.data?.map((j) => <JobCard key={j.id} job={j} />)}</div>}
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
          {[
            [FileCheck2, 'Apply in minutes', 'Upload a PDF or DOCX resume once and reuse it across applications.'],
            [LineChart, 'Track every stage', 'See when you are shortlisted, interviewed or offered — with a full timeline.'],
            [ShieldCheck, 'Private & secure', 'Resumes are only visible to you and the recruiter reviewing your application.'],
          ].map(([Icon, t, d]) => (
            <div key={t}><div className="mb-3 inline-flex rounded-lg bg-brand-50 p-3 text-brand-600"><Icon className="h-6 w-6" aria-hidden /></div><h3 className="font-semibold text-slate-900">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-slate-900 p-8 text-white sm:flex-row sm:items-center">
          <div><h2 className="text-xl font-bold">Hiring? Post your first job today.</h2><p className="mt-1 text-slate-300">Manage applicants and move candidates through your pipeline.</p></div>
          <Link to="/register/recruiter" className="rounded-lg bg-white px-5 py-2.5 font-semibold text-slate-900 hover:bg-slate-100">Create recruiter account</Link>
        </div>
      </section>
    </>
  );
}
