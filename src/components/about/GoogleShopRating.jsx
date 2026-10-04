import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { useConsent } from '../../context/ConsentContext.jsx';
import { fetchGoogleShopRating, SHOP_GOOGLE_MAPS_URL } from '../../services/googleShopRating.js';

export default function GoogleShopRating() {
  const { googleAllowed, requestGooglePermission } = useConsent();
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, margin: '200px' });
  const [rating, setRating] = useState(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!googleAllowed || !visible) {
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
  }, [googleAllowed, visible]);

  const currentRating = googleAllowed ? rating : null;
  return (
    <div ref={ref} className="stat-card" style={{ textAlign: 'center' }}>
      {currentRating ? (
        <>
          <h3 className="h1" style={{ color: 'var(--color-primary)', lineHeight: 1 }}>
            {currentRating.value.toLocaleString('sr-RS', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            <span style={{ fontSize: '0.5em', marginLeft: '2px' }}>/5</span>
          </h3>
          <p className="lead" style={{ marginTop: '8px', color: 'var(--color-muted)', fontWeight: 500 }}>
            Prosečna Google ocena
          </p>
          <p>{currentRating.count.toLocaleString('sr-RS')} ocena korisnika</p>
        </>
      ) : (
        <>
          <h3>Google ocena</h3>
          <p role="status">{googleAllowed && status === 'loading' ? 'Učitavanje ocene…' : 'Pogledajte ocene naše prodavnice.'}</p>
          {!googleAllowed && (
            <button type="button" className="btn" onClick={() => void requestGooglePermission({ force: true })}>
              Prikaži Google ocenu
            </button>
          )}
        </>
      )}
      <p style={{ marginTop: '12px' }}>
        <a href={SHOP_GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer">Pogledaj na Google Maps</a>
      </p>
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
