import { avifImageUrl, avifImageSrcSet } from '../../utils/productImageFormats.js';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
// Each native image paints as soon as its own response arrives. No preview
// swap, shared loading barrier, fade or enlargement of an already shown photo.
export default function ProgressiveImage({ src, thumbSrc, alt, loading = 'lazy', onError, ...rest }) {
  const { t: translateText } = useStorefront();

  const avif = avifImageSrcSet(rest.srcSet) || avifImageUrl(src || thumbSrc);
  const image = <img key={src || thumbSrc} {...rest} src={src || thumbSrc || undefined} alt={translateText(alt)} loading={loading} decoding="async"
    onError={event => {
      const parent = event.currentTarget.parentElement;
      const source = parent?.tagName === 'PICTURE' ? parent.querySelector('source') : null;
      if (source?.getAttribute('srcset')) {
        source.removeAttribute('srcset');
        // Keep the matching WebP srcset when an AVIF response cannot decode.
        event.currentTarget.src = src || thumbSrc;
        return;
      }
      if (thumbSrc && event.currentTarget.getAttribute('src') !== thumbSrc) {
        event.currentTarget.removeAttribute('srcset'); event.currentTarget.removeAttribute('sizes');
        event.currentTarget.src = thumbSrc;
      }
      onError?.(event);
    }} />;
  return avif ? <picture key={src || thumbSrc} style={{ display: 'contents' }}>
    <source type="image/avif" srcSet={avif} sizes={rest.srcSet ? rest.sizes : undefined} />
    {image}
  </picture> : image;
}
