import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { productAlertsApi, productAlertSubscriptions } from './dajaPlatform.js';

export function useWatchAlertStatus(productId, variantId) {
  const { user, authReady } = useAuth();
  const account = user?.id || user?.uid;
  const key = `${account || 'guest'}:${productId}:${variantId}`;
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (!authReady || !productId || !variantId) return undefined;
    let request;
    const refresh = () => {
      request?.abort();
      request = new AbortController();
      const { signal } = request;
      const { managementToken } = productAlertSubscriptions.contact();
      if (!account && !managementToken) {
        setCurrent({ key, email: [], whatsapp: [] });
        return;
      }
      productAlertsApi.status(productId, { variantId, ...(!account && managementToken ? { managementToken } : {}) },
        { auth: Boolean(account), signal })
        .then(data => {
          if (!signal.aborted) setCurrent({ key, email: data?.types || [], whatsapp: data?.whatsappTypes || [], whatsappWatchCode: data?.whatsappWatchCode });
        })
        .catch(error => {
          if (signal.aborted) return;
          if (!account && [400, 422].includes(error.status)) {
            productAlertSubscriptions.clearContact();
            setCurrent({ key, email: [], whatsapp: [] });
          } else setCurrent({ key, error: true, email: [], whatsapp: [] });
        });
    };
    refresh();
    window.addEventListener('daja:product-alerts-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      request?.abort();
      window.removeEventListener('daja:product-alerts-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [key, account, authReady, productId, variantId]);

  return current?.key === key ? current : { email: [], whatsapp: [] };
}
