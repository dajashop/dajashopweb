import { useState } from 'react';
import { MapPinned } from 'lucide-react';
import { useConsent } from '../../context/ConsentContext.jsx';
import './GoogleMapEmbed.css';

export default function GoogleMapEmbed({ src, title, className = '', ...iframeProps }) {
  const { googleAllowed, requestGooglePermission } = useConsent();
  const [requesting, setRequesting] = useState(false);

  const allowGoogle = async () => {
    setRequesting(true);
    try {
      await requestGooglePermission();
    } finally {
      setRequesting(false);
    }
  };

  if (!googleAllowed) {
    return (
      <div className={`google-map-consent-placeholder ${className}`.trim()}>
        <div className="google-map-consent-icon" aria-hidden="true">
          <MapPinned size={22} />
        </div>
        <div className="google-map-consent-copy">
          <strong>Prikaz mape je isključen</strong>
          <p>Dozvolite funkcionalne usluge da biste videli lokaciju prodavnice.</p>
        </div>
        <button type="button" onClick={() => void allowGoogle()} disabled={requesting}>
          {requesting ? 'Otvaramo izbor…' : 'Prikaži mapu'}
        </button>
      </div>
    );
  }

  return <iframe className={className} title={title} src={src} {...iframeProps} />;
}
