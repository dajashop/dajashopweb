import { useEffect, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronRight,
  Cookie,
  MapPinned,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
import './CookieConsentModal.css';

const PANELS = {
  consent: 'consent',
  details: 'details',
  about: 'about',
};

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
  const [panel, setPanel] = useState(PANELS.consent);
  const [preferences, setPreferences] = useState(false);
  const [externalGoogle, setExternalGoogle] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPanel(forceSettings ? PANELS.details : PANELS.consent);
    setPreferences(initialCategories?.preferences === true);
    setExternalGoogle(initialCategories?.externalGoogle === true);
    setAnalytics(initialCategories?.analytics === true);
    setSaving(false);
    setError('');
  }, [forceSettings, initialCategories?.analytics, initialCategories?.externalGoogle, initialCategories?.preferences, open, policy?.version]);

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

  const selectPanel = (nextPanel) => {
    if (!saving) setPanel(nextPanel);
  };

  const renderPanel = () => {
    if (panel === PANELS.details) {
      return (
        <div className="cookie-consent__panel" id="cookie-details-panel" role="tabpanel" aria-labelledby="cookie-details-tab">
          <div className="cookie-consent__panel-heading">
            <h1 id="cookie-consent-title">Podesite kolačiće</h1>
            <p>Neophodni kolačići su uvek uključeni kako bi sajt zapamtio vaš izbor i omogućio funkcije koje koristite.</p>
          </div>
          <div className="cookie-consent__categories">
            <label className="cookie-consent__category cookie-consent__category--locked">
              <span><ShieldCheck size={20} /><strong>Neophodno</strong><small>Pristanak, prijava, korpa, lista želja i promo poruke nakon vaše radnje.</small></span>
              <input type="checkbox" checked readOnly aria-label="Neophodno je uključeno" />
            </label>
            <label className="cookie-consent__category">
              <span><Settings2 size={20} /><strong>Podešavanja</strong><small>Tema, zapamćena prijava, newsletter modal i pozicija skrola.</small></span>
              <input type="checkbox" checked={preferences} onChange={(event) => setPreferences(event.target.checked)} disabled={saving} />
            </label>
            <label className="cookie-consent__category">
              <span><MapPinned size={20} /><strong>Google Maps</strong><small>Mapa i automatski unos adrese preko Google-a.</small></span>
              <input type="checkbox" checked={externalGoogle} onChange={(event) => setExternalGoogle(event.target.checked)} disabled={saving} />
            </label>
            <label className="cookie-consent__category">
              <span><BarChart3 size={20} /><strong>Analitika</strong><small>Cloudflare Web Analytics meri posete i performanse sajta tek nakon vašeg pristanka.</small></span>
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} disabled={saving} />
            </label>
          </div>
        </div>
      );
    }

    if (panel === PANELS.about) {
      return (
        <div className="cookie-consent__panel cookie-consent__about" id="cookie-about-panel" role="tabpanel" aria-labelledby="cookie-about-tab">
          <div className="cookie-consent__panel-heading">
            <h1 id="cookie-consent-title">Vi kontrolišete svoj izbor</h1>
            <p>Kolačiće koristimo da bi DajaShop radio pouzdano i, uz vaš pristanak, da bismo unapredili iskustvo kupovine.</p>
          </div>
          <div className="cookie-consent__info-list">
            <div><ShieldCheck size={20} /><p><strong>Neophodno</strong> omogućava bezbedan rad korpe, naloga i vašeg izbora privatnosti.</p></div>
            <div><MapPinned size={20} /><p><strong>Google Maps</strong> prikazuje mapu i pomaže pri unosu adrese isporuke.</p></div>
            <div><BarChart3 size={20} /><p><strong>Analitika</strong> nam pokazuje kako posetioci koriste sajt, bez prikazivanja oglasa.</p></div>
          </div>
          <p className="cookie-consent__links">
            Pročitajte <a href="/cookies">politiku kolačića</a> i <a href="/privacy">politiku privatnosti</a>.
          </p>
          <p className="cookie-consent__version">Verzija politike: {policy?.version || 'u pripremi'}</p>
        </div>
      );
    }

    return (
      <div className="cookie-consent__panel" id="cookie-consent-panel" role="tabpanel" aria-labelledby="cookie-consent-tab">
        <div className="cookie-consent__panel-heading">
          <h1 id="cookie-consent-title">Sajt koristi kolačiće</h1>
          <p>Koristimo neophodnu memoriju kako bi DajaShop radio ispravno. Uz vašu saglasnost možemo uključiti dodatna podešavanja, Google Maps i analitiku za bolje iskustvo kupovine.</p>
        </div>
        <p className="cookie-consent__subcopy">Svoj izbor možete promeniti u bilo kom trenutku u podešavanjima privatnosti.</p>
        <button type="button" className="cookie-consent__text-action" disabled={saving} onClick={() => selectPanel(PANELS.details)}>
          Podesi izbor <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className="cookie-consent" role="presentation">
      <section className="cookie-consent__dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
        <header className="cookie-consent__header">
          <div className="cookie-consent__brand" aria-label="DajaShop privatnost">
            <span className="cookie-consent__brand-mark"><Cookie size={22} /></span>
            <span><strong>Daja</strong>Shop<small>privatnost</small></span>
          </div>
          {forceSettings && (
            <button type="button" className="cookie-consent__close" onClick={onCloseSettings} disabled={saving} aria-label="Zatvori podešavanja">
              <X size={20} />
            </button>
          )}
        </header>

        <div className="cookie-consent__tabs" role="tablist" aria-label="Podešavanja kolačića">
          <button id="cookie-consent-tab" type="button" role="tab" aria-selected={panel === PANELS.consent} aria-controls="cookie-consent-panel" className={panel === PANELS.consent ? 'is-active' : ''} onClick={() => selectPanel(PANELS.consent)}>Saglasnost</button>
          <button id="cookie-details-tab" type="button" role="tab" aria-selected={panel === PANELS.details} aria-controls="cookie-details-panel" className={panel === PANELS.details ? 'is-active' : ''} onClick={() => selectPanel(PANELS.details)}>Detalji</button>
          <button id="cookie-about-tab" type="button" role="tab" aria-selected={panel === PANELS.about} aria-controls="cookie-about-panel" className={panel === PANELS.about ? 'is-active' : ''} onClick={() => selectPanel(PANELS.about)}>O kolačićima</button>
        </div>

        <div className="cookie-consent__content">
          {renderPanel()}
          {error && <p className="cookie-consent__error" role="alert">{error}</p>}
        </div>

        <footer className="cookie-consent__footer">
          {panel === PANELS.details ? (
            <button
              type="button"
              className="cookie-consent__primary cookie-consent__save"
              disabled={saving}
              onClick={() => run(() => onSave({ preferences, externalGoogle, analytics }))}
            >
              <Check size={18} /> {saving ? 'Čuvamo…' : 'Sačuvaj izbor'}
            </button>
          ) : (
            <div className="cookie-consent__actions">
              <button type="button" className="cookie-consent__secondary" disabled={saving} onClick={() => run(onNecessary)}>
                Samo neophodno
              </button>
              <button type="button" className="cookie-consent__primary" disabled={saving} onClick={() => run(onAll)}>
                {saving ? 'Čuvamo…' : 'Prihvati sve'}
              </button>
            </div>
          )}
        </footer>
      </section>
    </div>
  );
}
