import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../services/api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    auth.me().then((u) => alive && setUser(u)).catch(() => alive && setUser(null)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (body) => { const u = await auth.login(body); setUser(u); return u; }, []);
  const register = useCallback(async (body) => { const u = await auth.register(body); setUser(u); return u; }, []);
  const logout = useCallback(async () => { try { await auth.logout(); } finally { setUser(null); } }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
