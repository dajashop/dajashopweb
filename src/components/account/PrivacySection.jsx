import { useCallback, useEffect, useState } from 'react';
import { BellOff, Check, Cookie, Loader2, Mail, Settings2, X } from 'lucide-react';
import { privacyApi, newsletterApi } from '../../services/dajaPlatform.js';
import { useConsent } from '../../context/ConsentContext.jsx';
import { money } from '../../utils/currency.js';
import './PrivacySection.css';

const alertLabel = {
  price_change: 'Promena cene',
  back_in_stock: 'Ponovo na stanju',
};

export default function PrivacySection({ user }) {
  const { categories, openSettings, policy } = useConsent();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSnapshot(await privacyApi.mine());
    } catch (requestError) {
      setError(requestError.message || 'Podešavanja nisu dostupna.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!preview) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [preview]);

  const unsubscribeNewsletter = async () => {
    setBusy('newsletter');
    try {
      await privacyApi.unsubscribeNewsletter();
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Odjava sa novosti nije uspela.');
    } finally {
      setBusy('');
    }
  };

  const subscribeNewsletter = async () => {
    if (!marketingOptIn) {
      setError('Potvrdite da želite da primate novosti emailom.');
      return;
    }
    setBusy('newsletter');
    try {
      await newsletterApi.subscribe(user.email, {
        source: 'account_privacy',
        policyVersion: policy?.version,
        acceptedMarketing: true,
        authenticated: true,
      });
      setMarketingOptIn(false);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Prijava na novosti nije uspela.');
    } finally {
      setBusy('');
    }
  };

  const unsubscribeAlert = async (id) => {
    setBusy(`alert:${id}`);
    try {
      await privacyApi.unsubscribeAlert(id);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Odjava od obaveštenja nije uspela.');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <div className="privacy-section__loading"><Loader2 className="animate-spin" size={22} /> Učitavanje podešavanja…</div>;
  }

  const newsletterActive = snapshot?.newsletter?.active === true;
  const alerts = Array.isArray(snapshot?.alerts) ? snapshot.alerts : [];
  const hasEmail = Boolean(user?.email);

  return (
    <section className="privacy-section section-content">
      <header className="privacy-section__header">
        <div>
          <h3>Privatnost i obaveštenja</h3>
          <p>Ovde menjate izbor kolačića i upravljate email obaveštenjima.</p>
        </div>
        <button type="button" className="privacy-section__settings" onClick={openSettings}>
          <Settings2 size={17} /> Podesi kolačiće
        </button>
      </header>

      {error && <p className="privacy-section__error">{error}</p>}

      <article className="privacy-section__card">
        <div className="privacy-section__title"><Cookie size={19} /><h4>Kolačići i lokalna memorija</h4></div>
        <dl className="privacy-section__choices">
          <div><dt>Neophodno</dt><dd><Check size={16} /> Uključeno</dd></div>
          <div><dt>Podešavanja</dt><dd>{categories.preferences ? <><Check size={16} /> Uključeno</> : 'Isključeno'}</dd></div>
          <div><dt>Google Maps</dt><dd>{categories.externalGoogle ? <><Check size={16} /> Uključeno</> : 'Isključeno'}</dd></div>
          <div><dt>Analitika</dt><dd>{categories.analytics ? <><Check size={16} /> Uključeno</> : 'Isključeno'}</dd></div>
        </dl>
      </article>

      <article className="privacy-section__card">
        <div className="privacy-section__title"><Mail size={19} /><h4>Novosti emailom</h4></div>
        {!hasEmail ? (
          <p>Dodajte email adresu u profilu da biste mogli da upravljate novostima emailom.</p>
        ) : newsletterActive ? (
          <>
            <p>Prijavljeni ste na novosti za adresu {user.email}.</p>
            <button type="button" className="privacy-section__danger" onClick={() => void unsubscribeNewsletter()} disabled={busy === 'newsletter'}>
              {busy === 'newsletter' ? 'Odjavljujemo…' : 'Odjavi me sa novosti'}
            </button>
          </>
        ) : (
          <>
            <p>Niste prijavljeni na novosti.</p>
            <label className="privacy-section__check">
              <input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} disabled={busy === 'newsletter'} />
              <span>Želim da primam novosti, ponude i savete emailom.</span>
            </label>
            <button type="button" className="privacy-section__primary" onClick={() => void subscribeNewsletter()} disabled={busy === 'newsletter'}>
              {busy === 'newsletter' ? 'Prijavljujemo…' : 'Prijavi me na novosti'}
            </button>
          </>
        )}
      </article>

      <article className="privacy-section__card">
        <div className="privacy-section__title"><BellOff size={19} /><h4>Obaveštenja o artiklima</h4></div>
        {alerts.length === 0 ? (
          <p>Nemate aktivna obaveštenja o artiklima.</p>
        ) : (
          <ul className="privacy-section__alerts">
            {alerts.map((alert) => {
              const name = [alert.brand, alert.name].filter(Boolean).join(' ') || 'Artikal';
              const hasPrice = Number.isFinite(Number(alert.price));
              const imageSrc = alert.image || '/images/product-placeholder.svg';
              return (
                <li key={alert.id}>
                  <div className="privacy-section__alert-product">
                    <button
                      type="button"
                      className="privacy-section__image-button"
                      aria-label={`Uvećaj sliku: ${name}`}
                      onClick={() => setPreview({ src: imageSrc, name })}
                    >
                      <img
                        src={imageSrc}
                        alt=""
                        className="privacy-section__alert-image"
                        onError={(event) => {
                          event.currentTarget.src = '/images/product-placeholder.svg';
                        }}
                      />
                    </button>
                    <div className="privacy-section__alert-details">
                      <strong>{name}</strong>
                      <span>{alertLabel[alert.type] || 'Obaveštenje'}</span>
                      {hasPrice && <b>{money(Number(alert.price))}</b>}
                    </div>
                  </div>
                  <button type="button" onClick={() => void unsubscribeAlert(alert.id)} disabled={busy === `alert:${alert.id}`}>
                    {busy === `alert:${alert.id}` ? 'Odjavljujemo…' : 'Isključi'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </article>

      {preview && (
        <div className="privacy-section__image-modal" role="dialog" aria-modal="true" aria-label={`Slika artikla: ${preview.name}`} onClick={() => setPreview(null)}>
          <div className="privacy-section__image-modal-content" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="privacy-section__image-modal-close" aria-label="Zatvori sliku" onClick={() => setPreview(null)}><X size={21} /></button>
            <img src={preview.src} alt={preview.name} onError={(event) => { event.currentTarget.src = '/images/product-placeholder.svg'; }} />
            <strong>{preview.name}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
