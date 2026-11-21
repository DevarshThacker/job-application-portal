import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS = { success: 'text-emerald-600', error: 'text-red-600', info: 'text-brand-600' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);
  const api = useMemo(() => ({
    success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} role="status" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${COLORS[t.type]}`} aria-hidden />
              <p className="flex-1 text-sm text-slate-700">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
