import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPinned, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ConsentContext } from './ConsentContext.jsx';
import CookieConsentModal from '../components/modals/CookieConsentModal.jsx';
import { privacyApi } from '../services/dajaPlatform.js';
import {
  clearOptionalStorage,
  readConsentRecord,
  setConsentStorageState,
  writeConsentRecord,
} from '../services/consentStorage.js';
import {
  loadCloudflareWebAnalytics,
  removeCloudflareWebAnalyticsScript,
} from '../services/cloudflareWebAnalytics.js';
import { unloadGoogleMaps } from '../services/googleMaps.js';

const FALLBACK_POLICY = {
  version: '2026-09-02-cookie-category-groups-draft',
  material: true,
  changeSummary: '',
  ready: false,
};

function normalizeCategories(value) {
  return {
    preferences: value?.preferences === true,
    externalGoogle: value?.externalGoogle === true,
    analytics: value?.analytics === true,
  };
}

export function ConsentProvider({ children }) {
  const { pathname } = useLocation();
  const [policy, setPolicy] = useState(FALLBACK_POLICY);
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [googleSaving, setGoogleSaving] = useState(false);
  const googleResolver = useRef(null);
  const analyticsWasAllowed = useRef(false);
  const isPolicyPage = pathname === '/privacy' || pathname === '/cookies';
  const isPolicyPageRef = useRef(isPolicyPage);
  const showConsentModal = !loading && (settingsOpen || (!decision && !isPolicyPage));

  useEffect(() => {
    isPolicyPageRef.current = isPolicyPage;
  }, [isPolicyPage]);

  const applyDecision = useCallback((nextDecision, { persist = true } = {}) => {
    const categories = normalizeCategories(nextDecision.categories);
    const normalized = {
      receipt: nextDecision.receipt,
      version: nextDecision.version,
      categories,
    };
    if (persist) writeConsentRecord(normalized);
    setDecision(normalized);
    setConsentStorageState({
      ready: true,
      preferences: categories.preferences,
      externalGoogle: categories.externalGoogle,
      analytics: categories.analytics,
    });
    if (!categories.preferences) clearOptionalStorage();
    if (!categories.externalGoogle) unloadGoogleMaps();
    if (analyticsWasAllowed.current && !categories.analytics) {
      // Cloudflare's beacon registers SPA listeners after it has loaded. A
      // clean reload is the reliable way to end a granted session immediately
      // when the visitor withdraws consent.
      removeCloudflareWebAnalyticsScript();
      window.setTimeout(() => window.location.reload(), 0);
    }
    analyticsWasAllowed.current = categories.analytics;
  }, []);

  useEffect(() => {
    setConsentStorageState({ ready: false, preferences: false, externalGoogle: false });
    let cancelled = false;
    privacyApi
      .current()
      .catch(() => FALLBACK_POLICY)
      .then((nextPolicy) => {
        if (cancelled) return;
        const resolvedPolicy = { ...FALLBACK_POLICY, ...(nextPolicy || {}) };
        setPolicy(resolvedPolicy);
        // Read at resolution time too: another open tab may have made a
        // choice while this first-party policy request was in flight.
        const saved = readConsentRecord();
        const canKeepSavedChoice = saved?.receipt && (
          saved.version === resolvedPolicy.version || !resolvedPolicy.material
        );
        if (canKeepSavedChoice) {
          applyDecision({
            receipt: saved.receipt,
            version: resolvedPolicy.version,
            categories: saved.categories,
          }, { persist: false });
        } else {
          // The rollout deliberately drops old optional browser state. A cart,
          // wishlist and an alert-management token are functional data and are
          // therefore kept until the customer explicitly removes them.
          // Legal notices must be readable without creating or mutating
          // browser storage before the visitor makes a choice.
          if (!isPolicyPageRef.current) clearOptionalStorage();
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyDecision]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== 'dajashop_privacy_receipt' || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue);
        if (next?.receipt) applyDecision(next, { persist: false });
      } catch {
        // A malformed storage value simply shows the choice modal next time.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [applyDecision]);

  useEffect(() => {
    if (isPolicyPage) {
      removeCloudflareWebAnalyticsScript();
      return;
    }
    if (decision?.categories?.analytics) loadCloudflareWebAnalytics();
  }, [decision?.categories?.analytics, isPolicyPage]);

  const save = useCallback(async (categories, action = 'granted') => {
    const response = await privacyApi.recordConsent(
      {
        receipt: decision?.receipt,
        policyVersion: policy.version,
        categories: normalizeCategories(categories),
        action,
      },
      // The very first choice remains an anonymous first-party request. A
      // later settings change may be tied to the already signed-in account.
      { authenticated: Boolean(decision?.receipt) },
    );
    const next = {
      receipt: response?.receipt || decision?.receipt,
      version: response?.version || policy.version,
      categories: response?.categories || normalizeCategories(categories),
    };
    if (!next.receipt) throw new Error('Server nije vratio dokaz izbora.');
    applyDecision(next);
    setSettingsOpen(false);
    return next;
  }, [applyDecision, decision?.receipt, policy.version]);

  const requestGooglePermission = useCallback(() => {
    if (decision?.categories?.externalGoogle) return Promise.resolve(true);
    setGooglePromptOpen(true);
    return new Promise((resolve) => {
      googleResolver.current = resolve;
    });
  }, [decision?.categories?.externalGoogle]);

  const respondGoogle = async (accepted) => {
    setGoogleSaving(true);
    try {
      if (accepted) {
        await save({ preferences: true, externalGoogle: true, analytics: normalizeCategories(decision?.categories).analytics }, 'updated');
      }
      setGooglePromptOpen(false);
      googleResolver.current?.(accepted);
      googleResolver.current = null;
    } catch {
      // Keep the explicit Google dialog open when the proof cannot be saved.
    } finally {
      setGoogleSaving(false);
    }
  };

  const value = useMemo(() => ({
    loading,
    hasDecision: Boolean(decision),
    categories: normalizeCategories(decision?.categories),
    preferencesAllowed: decision?.categories?.preferences === true,
    googleAllowed: decision?.categories?.externalGoogle === true,
    analyticsAllowed: decision?.categories?.analytics === true,
    policy,
    openSettings: () => setSettingsOpen(true),
    saveSettings: (categories) => save(categories, 'updated'),
    withdrawOptional: () => save({ preferences: false, externalGoogle: false, analytics: false }, 'revoked'),
    requestGooglePermission,
  }), [decision, loading, policy, requestGooglePermission, save]);

  return (
    <ConsentContext.Provider value={value}>
      {children}
      <CookieConsentModal
        open={showConsentModal}
        policy={policy}
        forceSettings={Boolean(decision && settingsOpen)}
        initialCategories={decision?.categories}
        onCloseSettings={() => setSettingsOpen(false)}
        onAll={() => save({ preferences: true, externalGoogle: true, analytics: true })}
        onSave={(categories) => save(categories)}
      />
      {googlePromptOpen && (
        <GooglePermissionDialog
          onAccept={() => void respondGoogle(true)}
          onDecline={() => void respondGoogle(false)}
          saving={googleSaving}
        />
      )}
    </ConsentContext.Provider>
  );
}

function GooglePermissionDialog({ onAccept, onDecline, saving }) {
  return (
    <div className="google-consent" role="presentation">
      <section className="google-consent__dialog" role="dialog" aria-modal="true" aria-labelledby="google-consent-title">
        <button type="button" className="google-consent__close" onClick={onDecline} disabled={saving} aria-label="Zatvori"><X size={19} /></button>
        <div className="google-consent__icon"><MapPinned size={23} /></div>
        <h2 id="google-consent-title">Uključi funkcionalne usluge?</h2>
        <p>Ovim izborom uključujete pamćenje funkcionalnih podešavanja, Google mapu naše lokacije i predlog adrese. Google pri tome može obraditi tehničke podatke pregledača i adresu koju unesete. Možete nastaviti i ručnim unosom adrese.</p>
        <div className="google-consent__actions">
          <button type="button" className="google-consent__secondary" onClick={onDecline} disabled={saving}>Nastavi ručno</button>
          <button type="button" className="google-consent__primary" onClick={onAccept} disabled={saving}>{saving ? 'Čuvamo…' : 'Dozvoli funkcionalne usluge'}</button>
        </div>
      </section>
    </div>
  );
}
