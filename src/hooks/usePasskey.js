import { useState } from 'react';
import { useAuth } from './useAuth';

export const usePasskey = () => {
  const { user, linkPasskey } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const registerPasskey = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Morate biti ulogovani da biste dodali Passkey.');
      await linkPasskey(user.displayName || 'DajaShop passkey');
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
