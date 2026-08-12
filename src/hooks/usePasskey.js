import { useState } from 'react';
import { useAuth } from './useAuth';
import { authApi } from '../services/dajaPlatform';
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';

export const usePasskey = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const registerPasskey = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Morate biti ulogovani da biste dodali Passkey.');
      if (!window.isSecureContext) {
        throw new Error('Passkey radi samo na https domeni ili na http://localhost:5173.');
      }
      if (!browserSupportsWebAuthn()) {
        throw new Error('Ovaj browser ili uredjaj ne podrzava Passkey.');
      }
      const result = await authApi.passkeyRegisterStart({
        name: user.displayName || user.email || 'DajaShop Passkey',
      });
      const credential = await startRegistration({ optionsJSON: result });
      await authApi.passkeyRegisterFinish({ credential });
      return { success: true };
    } catch (err) {
      console.error(err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { registerPasskey, loading, error };
};
