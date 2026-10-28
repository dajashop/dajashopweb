import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useState } from 'react';
import { MapPinned } from 'lucide-react';
import { useConsent } from '../../context/ConsentContext.jsx';
import './GoogleMapEmbed.css';

export default function GoogleMapEmbed({ src, title, className = '', ...iframeProps }) {
  const { t: translateText } = useStorefront();

  const { googleAllowed, requestGooglePermission } = useConsent();
  const [requesting, setRequesting] = useState(false);

  const allowGoogle = async () => {
    setRequesting(true);
    try {
      await requestGooglePermission({ force: true });
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
          <strong>{translateText("Prikaz mape je isključen")}</strong>
          <p>{translateText("Dozvolite funkcionalne usluge da biste videli lokaciju prodavnice.")}</p>
        </div>
        <button type="button" onClick={() => void allowGoogle()} disabled={requesting}>
          {translateText(requesting ? 'Otvaramo izbor…' : 'Prikaži mapu')}
        </button>
      </div>
    );
  }

  return <iframe className={className} title={translateText(title)} src={src} {...iframeProps} />;
}
