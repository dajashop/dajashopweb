import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ctx } from './AuthContext';
import {
  authApi,
  customerApi,
  isAdminEmail,
  subscribeCustomerRealtime,
} from '../services/dajaPlatform';
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
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [pendingPhone, setPendingPhone] = useState(null);
  const [pendingEmailVerify, setPendingEmailVerify] = useState(false);
  const [oauthJustSucceeded, setOauthJustSucceeded] = useState(false);

  const loadMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setUserInfo(null);
      return null;
    }

    try {
      const me = await authApi.me();

      if (isAdminEmail(me?.email)) {
        // The API is authoritative; a failed staff exchange must not log the
        // customer out of their normal storefront session.
        await authApi.createAdminSession().catch(() => null);
      }

      // Publish the admin user only after the staff-session exchange. This
      // prevents admin widgets from sending their first request with a normal
      // customer token while the staff token is still being created.
      try {
        const customer = await customerApi.me();
        const hydratedUser = {
          ...me,
          ...customer,
          emailVerified: Boolean(customer?.emailVerified ?? me?.emailVerified),
        };
        setUser(hydratedUser);
        setUserInfo(customer);
        return hydratedUser;
      } catch {
        setUser(me);
        setUserInfo(me);
        return me;
      }
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
    if (!user?.id) return undefined;
    return subscribeCustomerRealtime((event) => {
      if (event?.data?.emailVerified !== true) return;
      setUser((current) =>
        current ? { ...current, emailVerified: true } : current,
      );
      setUserInfo((current) =>
        current ? { ...current, emailVerified: true } : current,
      );
    });
  }, [user?.id]);

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
    setOauthJustSucceeded(true);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, []);

  const dismissOauthSuccess = useCallback(() => {
    setOauthJustSucceeded(false);
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

  async function oauth(provider, onProgress) {
    return authApi.oauthStart(provider, onProgress);
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
    setUserInfo(null);
    navigate('/logout', { replace: true });
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
      oauthJustSucceeded,
      dismissOauthSuccess,
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
      oauthJustSucceeded,
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
      dismissOauthSuccess,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
