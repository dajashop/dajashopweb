import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { serviceMedia } from '../../data/serviceCatalog.js';

export default function ServiceVisual({ kind = 'engraving', variant = 'hero' }) {
  const { t: translateText } = useStorefront();

  const media = serviceMedia[kind];
  const tile = variant !== 'hero';
  const sizes = variant === 'related'
    ? '(max-width: 680px) 120px, 180px'
    : variant === 'card'
      ? '(max-width: 680px) 92vw, (max-width: 1100px) 46vw, 750px'
      : '(max-width: 1740px) 92vw, 1600px';
  const prefix = `/images/services/${kind}`;
  return <picture className={`services-visual services-visual--${variant}`}>
    <img src={`${prefix}-${tile ? '960' : '1600'}.webp`}
      srcSet={`${prefix}-640.webp 640w, ${prefix}-960.webp 960w, ${prefix}-1600.webp 1600w`}
      sizes={sizes} width="1600" height={media.height}
      alt={translateText(tile ? '' : media.alt)} decoding="async"
      loading={tile ? 'lazy' : 'eager'} fetchPriority={tile ? 'auto' : 'high'} />
  </picture>;
}
