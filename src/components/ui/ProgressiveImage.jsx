import { useState } from 'react';

// Each image paints independently. A thumbnail stays underneath its own full
// image, without waiting for any other card, gallery or Promise.all batch.
export default function ProgressiveImage(props) {
  return <ImageContent key={`${props.src}|${props.thumbSrc}`} {...props} />;
}
function ImageContent({ src, thumbSrc, alt, className, loading = 'lazy', style, onLoad, onError, ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = failed ? thumbSrc : src || thumbSrc;
  const preview = !loaded && !failed && src && thumbSrc && src !== thumbSrc;
  const imageStyle = { width: '100%', height: '100%', objectFit: 'inherit', display: 'block' };
  return <span className={className} style={{ ...style, display: 'block', position: 'relative', overflow: 'hidden' }}>
    {preview && <img src={thumbSrc} alt="" aria-hidden="true" loading={loading} decoding="async"
      style={{ ...imageStyle, position: 'absolute', inset: 0, padding: 'inherit' }} />}
    <img {...rest} src={source || undefined} alt={alt} loading={loading} decoding="async"
      style={{ ...imageStyle, position: 'relative' }}
      onLoad={event => { setLoaded(true); onLoad?.(event); }}
      onError={event => { if (thumbSrc && source !== thumbSrc) setFailed(true); onError?.(event); }} />
  </span>;
}
