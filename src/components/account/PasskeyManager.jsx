import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { authApi } from '../../services/dajaPlatform.js';
import { clearAuthTokens } from '../../services/apiClient.js';
import { usePasskey } from '../../hooks/usePasskey.js';

export default function PasskeyManager({ user }) {
  const { t } = useStorefront();
  const { logout } = useAuth();
  const { registerPasskey, loading: adding, error: addError } = usePasskey();
  const [keys, setKeys] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setKeys([]);
    setError('');
    if (user?.uid) authApi.passkeyList().then(data => {
      if (active) setKeys(data.items || []);
    }).catch(() => { if (active) setError('Passkey ključeve nije moguće učitati. Osvežite stranicu i pokušajte ponovo.'); });
    return () => { active = false; };
  }, [user?.uid, user?.passkeyCount]);
  async function remove(id) {
    if (!window.confirm(t('Ukloniti ovaj passkey? Bićete odjavljeni sa svih uređaja.'))) return;
    setBusy(true);
    setError('');
    try {
      await authApi.passkeyRemove(id);
      clearAuthTokens();
      await logout();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div>
    {(error || addError) && <p role="alert">{t(error || addError)}</p>}
    {keys.map(key => <div key={key.id} className="flex items-center justify-between gap-3 mb-2 text-sm">
      <span>{key.name}</span>
      <button type="button" disabled={busy || adding} onClick={() => remove(key.id)}>{t('Ukloni passkey')}</button>
    </div>)}
    {Number(user?.passkeyCount) > 0 && Number(user?.passkeyCount) < 10 && <button type="button"
      disabled={busy || adding} onClick={() => { void registerPasskey().catch(() => {}); }}>
      {t(adding ? 'Dodavanje...' : 'Dodaj još jedan passkey')}
    </button>}
  </div>;
}
