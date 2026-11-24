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

const OPTIONAL_SAVE_MESSAGE = 'Dodatne dozvole trenutno ne možemo da sačuvamo. Možete pokušati ponovo ili izabrati „Samo neophodni“ i nastaviti kupovinu.';

export function ConsentProvider({ children }) {
  const { t: translateText } = useStorefront();

  const { pathname } = useLocation();
  const [policy, setPolicy] = useState(FALLBACK_POLICY);
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [googleSaving, setGoogleSaving] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const googleResolver = useRef(null);
  const googlePromptWasRequested = useRef(false);
  const analyticsWasAllowed = useRef(false);
  const saveRevision = useRef(0);
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
    // The receipt belongs to the policy presented by this storefront. The
    // API confirms new grants, but its metadata cannot rename a saved choice.
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
        if (validConsentRecord(saved)) {
          applyDecision(saved, { persist: false });
        } else {
          if (validConsentRecord(initial)) applyDecision({ categories: {} }, { persist: false });
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
      saveRevision.current++;
      try {
        const next = readConsentRecord();
        if (validConsentRecord(next)) applyDecision(next, { persist: false });
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
  }, [applyDecision]);

  useEffect(() => {
    if (!decision?.expiresAt) return;
    const expire = () => {
      if (decision.expiresAt > Date.now()) return;
      saveRevision.current++;
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
    const revision = ++saveRevision.current;
    const normalized = normalizeCategories(categories);
    const refusal = !normalized.preferences && !normalized.externalGoogle && !normalized.analytics;
    const proposed = {
      receipt: validConsentRecord(decision)
        ? decision.receipt
        : crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''),
      version: CONSENT_VERSION, categories: normalized, expiresAt: Date.now() + CONSENT_MAX_AGE,
    };
    // Turning an optional purpose off takes effect before the network request.
    // Granting a new purpose still waits for the receipt to be recorded.
    if (decision && !refusal) applyDecision({ ...proposed, categories: {
      preferences: Boolean(decision?.categories.preferences && normalized.preferences),
      externalGoogle: Boolean(decision?.categories.externalGoogle && normalized.externalGoogle),
      analytics: Boolean(decision?.categories.analytics && normalized.analytics),
    } });
    const record = () => privacyApi.recordConsent(
      {
        receipt: proposed.receipt,
        policyVersion: CONSENT_VERSION,
        categories: normalized,
        action,
      },
      // The very first choice remains an anonymous first-party request. A
      // later settings change may be tied to the already signed-in account.
      { authenticated: Boolean(decision?.receipt) },
    );
    if (refusal) {
      applyDecision(proposed);
      setSettingsOpen(false);
      // Only the browser controls the refusal. A late API answer must not
      // replace it or change the version the visitor actually saw.
      void record().catch(() => {});
      return proposed;
    }

    const response = await record().catch(() => null);
    if (revision !== saveRevision.current) return null;
    const confirmed = normalizeCategories(response?.categories);
    if (response?.receipt !== proposed.receipt || response?.version !== proposed.version ||
        Object.keys(normalized).some(key => confirmed[key] !== normalized[key])) {
      throw new Error(OPTIONAL_SAVE_MESSAGE);
    }
    applyDecision(proposed);
    setSettingsOpen(false);
    return proposed;
  }, [applyDecision, decision]);

  const requestGooglePermission = useCallback(({ force = false } = {}) => {
    if (decision?.categories?.externalGoogle && validConsentRecord(readConsentRecord())) return Promise.resolve(true);
    // Focusing the address field should ask once, then always leave manual
    // entry usable. An explicit map button can still reopen the choice.
    if (!force && googlePromptWasRequested.current) return Promise.resolve(false);
    googlePromptWasRequested.current = true;
    setGoogleError('');
    setGooglePromptOpen(true);
    return new Promise((resolve) => {
      googleResolver.current = resolve;
    });
  }, [decision?.categories?.externalGoogle]);

  const respondGoogle = async (accepted) => {
    setGoogleSaving(true);
    setGoogleError('');
    try {
      if (accepted) {
        const result = await save({ ...normalizeCategories(decision?.categories), externalGoogle: true }, 'updated');
        accepted = Boolean(result?.categories.externalGoogle);
      }
      setGooglePromptOpen(false);
      googleResolver.current?.(accepted);
      googleResolver.current = null;
    } catch {
      setGoogleError('Google usluge trenutno ne možemo da uključimo. Možete nastaviti sa ručnim unosom adrese.');
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
        policy={{ ...policy, version: CONSENT_VERSION }}
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
          error={googleError}
        />
      )}
    </ConsentContext.Provider>
  );
}

function GooglePermissionDialog({ onAccept, onDecline, saving, error }) {
  const { t: translateText } = useStorefront();

  return (
    <div className="google-consent" role="presentation">
      <section className="google-consent__dialog" role="dialog" aria-modal="true" aria-labelledby="google-consent-title">
        <button type="button" className="google-consent__close" onClick={onDecline} disabled={saving} aria-label={translateText("Zatvori")}><X size={19} /></button>
        <div className="google-consent__icon"><MapPinned size={23} /></div>
        <h2 id="google-consent-title">{translateText("Uključi Google usluge?")}</h2>
        <p>{translateText("Google mapa, predlog adrese i ocena prodavnice učitavaju se uz vašu dozvolu. Google može primiti IP adresu, podatke pregledača i adresu koju unesete. Ručni unos adrese i kupovina rade i bez toga. Ovaj izbor ne uključuje lokalno pamćenje ni analitiku.")}</p>
        {error && <p role="alert">{translateText(error)}</p>}
        <div className="google-consent__actions">
          <button type="button" className="google-consent__secondary" onClick={onDecline} disabled={saving}>{translateText("Nastavi bez Google usluga")}</button>
          <button type="button" className="google-consent__primary" onClick={onAccept} disabled={saving}>{translateText(saving ? 'Čuvamo…' : 'Dozvoli Google usluge')}</button>
        </div>
      </section>
    </div>
  );
}
