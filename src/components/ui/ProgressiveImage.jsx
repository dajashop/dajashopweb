import { useEffect, useMemo, useState } from 'react';

function combineClassNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function ProgressiveImage({
  src,
  thumbSrc,
  alt,
  className,
  loading = 'lazy',
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(thumbSrc || src);

  useEffect(() => {
    setLoaded(false);
    setCurrentSrc(thumbSrc || src);

    if (!src) return undefined;
    if (!thumbSrc) {
      setCurrentSrc(src);
      setLoaded(true);
      return undefined;
    }

    let cancelled = false;
    const img = new Image();
    img.src = src;

    img.onload = () => {
      if (cancelled) return;
      setCurrentSrc(src);
      setLoaded(true);
    };

    img.onerror = () => {
      if (cancelled) return;
      setCurrentSrc(src);
      setLoaded(true);
    };

    return () => {
      cancelled = true;
    };
  }, [src, thumbSrc]);

  const style = useMemo(
    () => ({
      filter: loaded || !thumbSrc ? 'blur(0px)' : 'blur(8px)',
      transform: loaded || !thumbSrc ? 'scale(1)' : 'scale(1.05)',
      opacity: currentSrc ? 1 : 0,
      transition: 'filter 0.4s ease, transform 0.4s ease, opacity 0.4s ease',
    }),
    [currentSrc, loaded, thumbSrc],
  );

  return (
    <img
      src={currentSrc || src}
      alt={alt}
      loading={loading}
      className={combineClassNames(className)}
      style={style}
      {...rest}
    />
  );
}
