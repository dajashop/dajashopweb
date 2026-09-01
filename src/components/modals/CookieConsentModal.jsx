import { useEffect, useState } from 'react';
import { Check, ChevronLeft, Cookie, MapPinned, Settings2, ShieldCheck, X } from 'lucide-react';
import './CookieConsentModal.css';

export default function CookieConsentModal({
  open,
  policy,
  forceSettings = false,
  initialCategories,
  onCloseSettings,
  onNecessary,
  onAll,
  onSave,
}) {
  const [settings, setSettings] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [externalGoogle, setExternalGoogle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSettings(forceSettings);
    setPreferences(initialCategories?.preferences === true);
    setExternalGoogle(initialCategories?.externalGoogle === true);
    setSaving(false);
    setError('');
  }, [forceSettings, initialCategories?.externalGoogle, initialCategories?.preferences, open, policy?.version]);

  if (!open) return null;

  const run = async (action) => {
    setSaving(true);
    setError('');
    try {
      await action();
    } catch (requestError) {
      setError(requestError?.message || 'Izbor nije sačuvan. Pokušajte ponovo.');
      setSaving(false);
    }
  };

  return (
    <div className="cookie-consent" role="presentation">
      <section className="cookie-consent__dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
        {!settings ? (
          <>
            <div className="cookie-consent__icon"><Cookie size={25} /></div>
            <h1 id="cookie-consent-title">Vaša privatnost</h1>
            <p>
              Koristimo samo neophodnu memoriju dok ne izaberete dodatna podešavanja.
              Newsletter i obaveštenja o artiklima se uključuju zasebno.
            </p>
            <p className="cookie-consent__links">
              Pročitajte <a href="/cookies">politiku kolačića</a> i <a href="/privacy">politiku privatnosti</a>.
            </p>
            {error && <p className="cookie-consent__error">{error}</p>}
            <div className="cookie-consent__actions">
              <button type="button" className="cookie-consent__secondary" disabled={saving} onClick={() => run(onNecessary)}>
                Samo neophodno
              </button>
              <button type="button" className="cookie-consent__primary" disabled={saving} onClick={() => run(onAll)}>
                {saving ? 'Čuvamo…' : 'Prihvati sve'}
              </button>
            </div>
            <button type="button" className="cookie-consent__settings" disabled={saving} onClick={() => setSettings(true)}>
              <Settings2 size={17} /> Podesi
            </button>
          </>
        ) : (
          <>
            {forceSettings && (
              <button type="button" className="cookie-consent__close" onClick={onCloseSettings} disabled={saving} aria-label="Zatvori podešavanja">
                <X size={19} />
              </button>
            )}
            {!forceSettings && (
              <button type="button" className="cookie-consent__back" onClick={() => setSettings(false)} disabled={saving}>
                <ChevronLeft size={18} /> Nazad
              </button>
            )}
            <h1>Podesi kolačiće</h1>
            <p className="cookie-consent__subcopy">Neophodno je uvek uključeno da sajt zapamti vaš izbor i izvrši funkcije koje sami koristite.</p>
            <label className="cookie-consent__category cookie-consent__category--locked">
              <span><ShieldCheck size={19} /><strong>Neophodno</strong><small>Pristanak, prijava, korpa, lista želja i promo nakon vaše radnje.</small></span>
              <input type="checkbox" checked readOnly aria-label="Neophodno je uključeno" />
            </label>
            <label className="cookie-consent__category">
              <span><Settings2 size={19} /><strong>Podešavanja</strong><small>Tema, zapamćena prijava, newsletter modal i pozicija skrola.</small></span>
              <input type="checkbox" checked={preferences} onChange={(event) => setPreferences(event.target.checked)} disabled={saving} />
            </label>
            <label className="cookie-consent__category">
              <span><MapPinned size={19} /><strong>Google Maps</strong><small>Mapa i automatski unos adrese preko Google-a.</small></span>
              <input type="checkbox" checked={externalGoogle} onChange={(event) => setExternalGoogle(event.target.checked)} disabled={saving} />
            </label>
            {error && <p className="cookie-consent__error">{error}</p>}
            <button
              type="button"
              className="cookie-consent__primary cookie-consent__save"
              disabled={saving}
              onClick={() => run(() => onSave({ preferences, externalGoogle }))}
            >
              <Check size={18} /> {saving ? 'Čuvamo…' : 'Sačuvaj izbor'}
            </button>
          </>
        )}
        <p className="cookie-consent__version">Verzija politike: {policy?.version || 'u pripremi'}</p>
      </section>
    </div>
  );
}
