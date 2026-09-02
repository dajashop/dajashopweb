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
        <MapPinned size={25} aria-hidden="true" />
        <p>Mapa se ne učitava dok ne dozvolite Google funkcionalnosti.</p>
        <button type="button" onClick={() => void allowGoogle()} disabled={requesting}>
          {requesting ? 'Otvaramo izbor…' : 'Uključi Google mapu'}
        </button>
      </div>
    );
  }

  return <iframe className={className} title={title} src={src} {...iframeProps} />;
}
