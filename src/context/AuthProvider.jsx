import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ctx } from './AuthContext';
import { authApi, customerApi, isAdminEmail } from '../services/dajaPlatform';
import { getAccessToken, onAuthTokenChange, setAuthTokens } from '../services/apiClient';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_RE = /^\+?[0-9]{8,15}$/;
const USER_RE = /^[a-zA-Z0-9._-]{3,24}$/;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [pendingPhone, setPendingPhone] = useState(null);
  const [pendingEmailVerify, setPendingEmailVerify] = useState(false);

  const loadMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setUserInfo(null);
      return null;
    }

    try {
      const me = await authApi.me();
      setUser(me);

      if (isAdminEmail(me?.email)) {
        // The API is authoritative; a failed staff exchange must not log the
        // customer out of their normal storefront session.
        await authApi.createAdminSession().catch(() => null);
      }

      try {
        const customer = await customerApi.me();
        setUserInfo(customer);
      } catch {
        setUserInfo(me);
      }

      return me;
    } catch {
      setUser(null);
      setUserInfo(null);
      return null;
    }
  }, []);

  useEffect(() => {
    loadMe();
    return onAuthTokenChange(loadMe);
  }, [loadMe]);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (params.get('oauth') !== 'success' || !accessToken || !refreshToken) return;

    setAuthTokens({ accessToken, refreshToken });
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, []);

  function showAuth(nextMode = 'login') {
    setMode(nextMode);
    setAuthOpen(true);
  }

  function hideAuth() {
    setAuthOpen(false);
    setPendingEmailVerify(false);
    setPendingPhone(null);
  }

  const detectIdentity = useCallback((id) => {
    const clean = String(id || '').replace(/\s/g, '');
    if (EMAIL_RE.test(clean)) return { type: 'email', value: clean };
    if (PHONE_RE.test(clean))
      return { type: 'phone', value: clean.startsWith('+') ? clean : `+${clean}` };
    if (USER_RE.test(clean)) return { type: 'username', value: clean.toLowerCase() };
    return { type: 'unknown', value: clean };
  }, []);

  const login = useCallback(
    async ({ identity, password }) => {
      const id = detectIdentity(identity);
      if (id.type === 'phone') {
        await authApi.requestPhoneOtp(id.value);
        setPendingPhone(id.value);
        return 'phone-code';
      }
      if (id.type === 'unknown') {
        throw new Error('Unesite validan email/korisnicko ime/broj telefona.');
      }

      const me = await authApi.login({
        identity: id.value,
        password,
        type: id.type,
      });
      setUser(me);
      await loadMe();
      return me;
    },
    [detectIdentity, loadMe],
  );

  const confirmPhoneCode = useCallback(
    async (code) => {
      if (!pendingPhone) throw new Error('Nema aktivne telefonske sesije.');
      const me = await authApi.confirmPhoneOtp(pendingPhone, code);
      setPendingPhone(null);
      setUser(me);
      await loadMe();
      return me;
    },
    [loadMe, pendingPhone],
  );

  const register = useCallback(
    async ({ identity, password, name }) => {
      const id = detectIdentity(identity);
      if (id.type === 'phone') {
        await authApi.requestPhoneOtp(id.value);
        setPendingPhone(id.value);
        return 'phone-code';
      }
      if (id.type !== 'email') {
        throw new Error('Za registraciju koristite email ili broj telefona.');
      }

      const me = await authApi.register({
        email: id.value,
        password,
        name,
      });
      setPendingEmailVerify(Boolean(me?.email && !me?.emailVerified));
      setUser(me);
      await loadMe();
      return me?.emailVerified === false ? 'email-verify' : me;
    },
    [detectIdentity, loadMe],
  );

  const linkUsernameToEmail = useCallback(async (username, email) => {
    if (!USER_RE.test(username)) throw new Error('Nevalidno korisnicko ime.');
    return authApi.register({ username, email, linkOnly: true });
  }, []);

  async function oauth(provider) {
    authApi.oauthStart(provider);
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
    setUserInfo(null);
  }

  const passkeyLogin = useCallback(async () => {
    if (!window.isSecureContext) {
      throw new Error('Passkey radi samo na https domeni ili na http://localhost:5173.');
    }
    if (!browserSupportsWebAuthn()) {
      throw new Error('Ovaj browser ili uredjaj ne podrzava Passkey.');
    }
    const options = await authApi.passkeyLoginStart({});
    const credential = await startAuthentication({ optionsJSON: options });
    await authApi.passkeyLoginFinish({ credential });
    await loadMe();
    return 'success';
  }, [loadMe]);

  const passkeyRegister = useCallback(
    async (payload = {}) => {
      if (!window.isSecureContext) {
        throw new Error('Passkey radi samo na https domeni ili na http://localhost:5173.');
      }
      if (!browserSupportsWebAuthn()) {
        throw new Error('Ovaj browser ili uredjaj ne podrzava Passkey.');
      }
      const data =
        typeof payload === 'string'
          ? { name: payload }
          : payload;
      const options = await authApi.passkeyRegisterStart(data);
      const credential = await startRegistration({ optionsJSON: options });
      await authApi.passkeyRegisterFinish({ credential });
      await loadMe();
      return 'success';
    },
    [loadMe],
  );

  const linkPasskey = useCallback(
    async (passkeyName) => passkeyRegister(passkeyName || user?.email),
    [passkeyRegister, user],
  );

  const value = useMemo(
    () => ({
      user,
      userInfo,
      authOpen,
      showAuth,
      hideAuth,
      mode,
      setMode,
      login,
      register,
      confirmPhoneCode,
      oauth,
      pendingEmailVerify,
      detectIdentity,
      linkUsernameToEmail,
      logout,
      passkeyLogin,
      passkeyRegister,
      linkPasskey,
      refreshUser: loadMe,
    }),
    [
      user,
      userInfo,
      authOpen,
      mode,
      pendingEmailVerify,
      confirmPhoneCode,
      detectIdentity,
      linkUsernameToEmail,
      login,
      register,
      passkeyLogin,
      passkeyRegister,
      linkPasskey,
      loadMe,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
