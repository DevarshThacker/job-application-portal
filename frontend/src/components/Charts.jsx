import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { STATUS_COLORS, STATUS_LABELS } from '../utils/format';
import { Card } from './ui';

export function StatusPie({ byStatus, title = 'Applications by status' }) {
  const data = Object.entries(byStatus || {}).filter(([, v]) => v > 0).map(([k, v]) => ({ name: STATUS_LABELS[k], key: k, value: v }));
  return (
    <Card className="p-5">
      <h2 className="mb-2 font-semibold text-slate-900">{title}</h2>
      {data.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No application data yet.</p> : (
        <>
          <div className="h-56" role="img" aria-label={title}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{data.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {data.map((d) => <li key={d.key} className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[d.key] }} />{d.name}</span><span className="font-medium text-slate-900">{d.value}</span></li>)}
          </ul>
        </>
      )}
    </Card>
  );
}

export function SimpleBars({ data, xKey, yKey, title, color = '#2563eb' }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold text-slate-900">{title}</h2>
      {data?.length ? (
        <div className="h-56" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval={0} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} /><Tooltip /><Bar isAnimationActive={false} dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="py-10 text-center text-sm text-slate-500">No data yet.</p>}
    </Card>
  );
}
