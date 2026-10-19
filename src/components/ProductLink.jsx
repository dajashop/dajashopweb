import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { prefetchProduct } from '../services/products.js';

export default function ProductLink({ to, onPointerEnter, onPointerLeave, onFocus, onBlur, ...props }) {
  const timer = useRef();
  const cancel = () => window.clearTimeout(timer.current);
  const schedule = () => {
    cancel();
    if (typeof to === 'string' && to.startsWith('/product/')) {
      timer.current = window.setTimeout(() => prefetchProduct(to.slice(9)), 120);
    }
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return <Link {...props} to={to}
    onPointerEnter={event => { onPointerEnter?.(event); schedule(); }}
    onPointerLeave={event => { onPointerLeave?.(event); cancel(); }}
    onFocus={event => { onFocus?.(event); schedule(); }}
    onBlur={event => { onBlur?.(event); cancel(); }} />;
}
