import { useStorefront } from '../localization/StorefrontContext.jsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPinned, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ConsentContext } from './ConsentContext.jsx';
import CookieConsentModal from '../components/modals/CookieConsentModal.jsx';
import { privacyApi } from '../services/dajaPlatform.js';
import {
  clearOptionalStorage,
  readConsentRecord,
  removeStoredValue,
  setConsentStorageState,
  writeConsentRecord,
  validConsentRecord,
  CONSENT_VERSION,
  CONSENT_MAX_AGE,
} from '../services/consentStorage.js';
import { clearCatalogDisk } from '../services/catalogDiskCache.js';
import {
  loadCloudflareWebAnalytics,
  removeCloudflareWebAnalyticsScript,
  stopAnalyticsOnPrivatePage,
} from '../services/cloudflareWebAnalytics.js';
import { unloadGoogleMaps } from '../services/googleMaps.js';

const FALLBACK_POLICY = {
  version: CONSENT_VERSION,
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
  const { t: translateText } = useStorefront();

  const { pathname } = useLocation();
  const [policy, setPolicy] = useState(FALLBACK_POLICY);
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [googleSaving, setGoogleSaving] = useState(false);
  const googleResolver = useRef(null);
  const googlePromptWasRequested = useRef(false);
  const analyticsWasAllowed = useRef(false);
  const isPolicyPage = ['/privacy', '/cookies', '/terms', '/withdrawal', '/whatsapp-privacy'].includes(pathname);
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
      expiresAt: nextDecision.expiresAt,
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
    // Remove history saved by older versions, regardless of consent choice.
    try { window.localStorage.removeItem('dajashop_search_history'); } catch { /* Storage may be unavailable. */ }
    setConsentStorageState({ ready: false, preferences: false, externalGoogle: false });
    // An unexpired receipt for this exact source version can enable the public
    // disk cache immediately. The policy request still reconciles the API version.
    const initial = readConsentRecord();
    if (validConsentRecord(initial)) applyDecision(initial, { persist: false });
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
        const canKeepSavedChoice = validConsentRecord(saved, resolvedPolicy.version) && saved.version === CONSENT_VERSION;
        if (canKeepSavedChoice) {
          applyDecision({
            receipt: saved.receipt,
            version: resolvedPolicy.version,
            categories: saved.categories,
            expiresAt: saved.expiresAt,
          }, { persist: false });
        } else {
          // Remove a superseded receipt before a possible analytics reload so
          // an API/web deployment mismatch cannot re-enable it in a loop.
          if (validConsentRecord(initial)) {
            removeStoredValue('dajashop_privacy_receipt');
            applyDecision({ categories: {}, expiresAt: 0 }, { persist: false });
          }
          setDecision(null);
          // The rollout deliberately drops old optional browser state. A cart,
          // wishlist and an alert-management token are functional data and are
          // therefore kept until the customer explicitly removes them.
          // Legal notices must be readable without creating or mutating
          // browser storage before the visitor makes a choice.
          if (!isPolicyPageRef.current) clearOptionalStorage();
          clearCatalogDisk();
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyDecision]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== 'dajashop_privacy_receipt' && event.key !== null) return;
      try {
        const next = readConsentRecord();
        if (validConsentRecord(next, policy.version) && next.version === CONSENT_VERSION) applyDecision(next, { persist: false });
        else {
          applyDecision({ categories: {}, expiresAt: 0 }, { persist: false });
          setDecision(null);
        }
      } catch {
        // A malformed storage value simply shows the choice modal next time.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [applyDecision, policy.version]);

  useEffect(() => {
    if (!decision?.expiresAt) return;
    const expire = () => {
      if (decision.expiresAt > Date.now()) return;
      applyDecision({ categories: {}, expiresAt: 0 }, { persist: false });
      setDecision(null);
    };
    // Short scheduling also handles a tab resumed after a long suspension.
    const timer = window.setInterval(expire, 60_000);
    window.addEventListener('focus', expire);
    return () => { clearInterval(timer); window.removeEventListener('focus', expire); };
  }, [decision?.expiresAt, applyDecision]);

  useEffect(() => {
    stopAnalyticsOnPrivatePage();
    if (isPolicyPage) {
      removeCloudflareWebAnalyticsScript();
      return;
    }
    if (decision?.categories?.analytics) loadCloudflareWebAnalytics();
  }, [decision?.categories?.analytics, isPolicyPage, pathname]);

  const save = useCallback(async (categories, action = 'granted') => {
    const normalized = normalizeCategories(categories);
    const refusal = !normalized.preferences && !normalized.externalGoogle && !normalized.analytics;
    const proposed = {
      receipt: decision?.receipt || crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''),
      version: CONSENT_VERSION, categories: normalized, expiresAt: Date.now() + CONSENT_MAX_AGE,
    };
    // Turning an optional purpose off takes effect before the network request.
    // Granting a new purpose still waits for the receipt to be recorded.
    if (refusal || decision) applyDecision({ ...proposed, categories: {
      preferences: Boolean(decision?.categories.preferences && normalized.preferences),
      externalGoogle: Boolean(decision?.categories.externalGoogle && normalized.externalGoogle),
      analytics: Boolean(decision?.categories.analytics && normalized.analytics),
    } });
    const response = await privacyApi.recordConsent(
      {
        receipt: proposed.receipt,
        policyVersion: CONSENT_VERSION,
        categories: normalized,
        action,
      },
      // The very first choice remains an anonymous first-party request. A
      // later settings change may be tied to the already signed-in account.
      { authenticated: Boolean(decision?.receipt) },
    ).catch(error => {
      if (!refusal) throw error;
      return proposed; // Refusal must work even while the API is unreachable.
    });
    if (!refusal && response?.version !== CONSENT_VERSION) {
      throw new Error('Politika privatnosti je ažurirana. Osvežite stranicu i ponovo izaberite dozvole.');
    }
    const next = {
      receipt: response?.receipt || decision?.receipt,
      version: response?.version || policy.version,
      categories: response?.categories || normalizeCategories(categories),
      expiresAt: proposed.expiresAt,
    };
    if (!next.receipt) throw new Error('Server nije vratio dokaz izbora.');
    applyDecision(next);
    setSettingsOpen(false);
    return next;
  }, [applyDecision, decision, policy.version]);

  const requestGooglePermission = useCallback(({ force = false } = {}) => {
    if (decision?.categories?.externalGoogle && validConsentRecord(readConsentRecord())) return Promise.resolve(true);
    // Focusing the address field should ask once, then always leave manual
    // entry usable. An explicit map button can still reopen the choice.
    if (!force && googlePromptWasRequested.current) return Promise.resolve(false);
    googlePromptWasRequested.current = true;
    setGooglePromptOpen(true);
    return new Promise((resolve) => {
      googleResolver.current = resolve;
    });
  }, [decision?.categories?.externalGoogle]);

  const respondGoogle = async (accepted) => {
    setGoogleSaving(true);
    try {
      if (accepted) {
        await save({ ...normalizeCategories(decision?.categories), externalGoogle: true }, 'updated');
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
      {translateText(children)}
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
  const { t: translateText } = useStorefront();

  return (
    <div className="google-consent" role="presentation">
      <section className="google-consent__dialog" role="dialog" aria-modal="true" aria-labelledby="google-consent-title">
        <button type="button" className="google-consent__close" onClick={onDecline} disabled={saving} aria-label={translateText("Zatvori")}><X size={19} /></button>
        <div className="google-consent__icon"><MapPinned size={23} /></div>
        <h2 id="google-consent-title">{translateText("Uključi Google usluge?")}</h2>
        <p>{translateText("Google mapa, predlog adrese i ocena prodavnice učitavaju se uz vašu dozvolu. Google može primiti IP adresu, podatke pregledača i adresu koju unesete. Ručni unos adrese i kupovina rade i bez toga. Ovaj izbor ne uključuje lokalno pamćenje ni analitiku.")}</p>
        <div className="google-consent__actions">
          <button type="button" className="google-consent__secondary" onClick={onDecline} disabled={saving}>{translateText("Nastavi bez Google usluga")}</button>
          <button type="button" className="google-consent__primary" onClick={onAccept} disabled={saving}>{translateText(saving ? 'Čuvamo…' : 'Dozvoli Google usluge')}</button>
        </div>
      </section>
    </div>
  );
}
