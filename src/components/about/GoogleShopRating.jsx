import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { useConsent } from '../../context/ConsentContext.jsx';
import { fetchGoogleShopRating } from '../../services/googleShopRating.js';

export default function GoogleShopRating() {
  const { googleAllowed, loading: consentLoading, openSettings } = useConsent();
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, margin: '200px' });
  const [rating, setRating] = useState(null);
  const [status, setStatus] = useState('idle');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (consentLoading || !googleAllowed || !visible) {
      setRating(null);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    fetchGoogleShopRating().then((data) => {
      if (cancelled) return;
      setRating(data);
      setStatus('ready');
    }).catch(() => {
      if (cancelled) return;
      setRating(null);
      setStatus('unavailable');
    });
    return () => { cancelled = true; };
  }, [consentLoading, googleAllowed, visible, attempt]);

  const currentRating = googleAllowed ? rating : null;
  return (
    <div ref={ref} className="stat-card" style={{ textAlign: 'center' }}>
      <p className="h1" style={{ color: 'var(--color-primary)', lineHeight: 1 }}>
        {currentRating ? currentRating.value.toLocaleString('sr-RS', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
        {currentRating && <span style={{ fontSize: '0.5em', verticalAlign: 'top', fontWeight: 'bold', marginLeft: '2px' }}>/5</span>}
      </p>
      <p className="lead" style={{ marginTop: '8px', color: 'var(--color-muted)', fontWeight: 500 }}>
        Prosečna Google ocena
      </p>
      {!currentRating && (
        <p role="status" aria-live="polite" style={{ minHeight: '1.5em' }}>
          {consentLoading ? 'Proveravamo podešavanja kolačića…'
            : !googleAllowed ? 'Za prikaz Google ocene odobrite funkcionalne kolačiće i Google usluge.'
            : status === 'unavailable' ? 'Google ocena trenutno nije dostupna.' : 'Učitavanje ocene…'}
        </p>
      )}
      {!googleAllowed && (
        <button type="button" className="btn" onClick={openSettings} disabled={consentLoading}>
          Odobri kolačiće
        </button>
      )}
      {googleAllowed && status === 'unavailable' && (
        <button type="button" className="btn" onClick={() => setAttempt((value) => value + 1)}>
          Pokušaj ponovo
        </button>
      )}
      {currentRating && (
        <>
          <span translate="no" style={{
            display: 'inline-block', whiteSpace: 'nowrap', fontFamily: 'Roboto, sans-serif',
            fontSize: '14px', fontWeight: 400, fontStyle: 'normal', letterSpacing: 'normal',
            color: '#5e5e5e', background: '#fff', padding: '2px 6px', borderRadius: '4px',
          }}>Google Maps</span>
          {currentRating.attributions.map((attribution, index) => (
            <p key={index} style={{ fontSize: '12px' }}>
              {/^https?:\/\//i.test(attribution.providerURI || '') ? (
                <a href={attribution.providerURI} target="_blank" rel="noopener noreferrer">{attribution.provider}</a>
              ) : attribution.provider}
            </p>
          ))}
        </>
      )}
    </div>
  );
}
