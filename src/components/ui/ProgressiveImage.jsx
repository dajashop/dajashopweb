// The browser loads the real image natively. This keeps SSR useful without
// JavaScript and respects lazy loading instead of preloading every card.
export default function ProgressiveImage({ src, thumbSrc, alt, className, loading = 'lazy', ...rest }) {
  return <img src={src || thumbSrc || undefined} alt={alt} loading={loading}
    decoding="async" className={className} {...rest} />;
}
