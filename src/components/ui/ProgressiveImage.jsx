import { useStorefront } from '../../localization/StorefrontContext.jsx';
// Each native image paints as soon as its own response arrives. No preview
// swap, shared loading barrier, fade or enlargement of an already shown photo.
export default function ProgressiveImage({ src, thumbSrc, alt, loading = 'lazy', onError, ...rest }) {
  const { t: translateText } = useStorefront();

  return <img key={src || thumbSrc} {...rest} src={src || thumbSrc || undefined} alt={translateText(alt)} loading={loading} decoding="async"
    onError={event => {
      if (thumbSrc && event.currentTarget.getAttribute('src') !== thumbSrc) event.currentTarget.src = thumbSrc;
      onError?.(event);
    }} />;
}
