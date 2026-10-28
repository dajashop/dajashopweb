import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronDown,
  Info,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
import './CookieConsentModal.css';

const PANELS = {
  consent: 'consent',
  details: 'details',
  about: 'about',
};

export default function CookieConsentModal({
  open,
  policy,
  forceSettings = false,
  initialCategories,
  onCloseSettings,
  onAll,
  onSave,
}) {
  const { t: translateText, localizePath } = useStorefront();

  const [panel, setPanel] = useState(PANELS.consent);
  const [preferences, setPreferences] = useState(false);
  const [externalGoogle, setExternalGoogle] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: true,
    uncategorized: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isPointerOverDialog, setIsPointerOverDialog] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPanel(forceSettings ? PANELS.details : PANELS.consent);
    setPreferences(initialCategories?.preferences === true);
    setExternalGoogle(initialCategories?.externalGoogle === true);
    setAnalytics(initialCategories?.analytics === true);
    setExpandedCategories({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      uncategorized: true,
    });
    setSaving(false);
    setError('');
  }, [forceSettings, initialCategories?.analytics, initialCategories?.externalGoogle, initialCategories?.preferences, open, policy?.version]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    if (isPointerOverDialog) body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isPointerOverDialog, open]);

  if (!open) return null;

  const run = async (action) => {
    setSaving(true);
    setError('');
    try {
      await action();
    } catch (requestError) {
      setError(requestError?.message || 'Izbor nije sačuvan. Pokušajte ponovo.');
      setSaving(false);
    }
  };

  const selectPanel = (nextPanel) => {
    if (!saving) setPanel(nextPanel);
  };

  const functionalEnabled = preferences && externalGoogle;

  const toggleCategory = (category) => {
    setExpandedCategories((current) => ({ ...current, [category]: !current[category] }));
  };

  const renderPanel = () => {
    if (panel === PANELS.details) {
      return (
        <div className="cookie-consent__panel cookie-consent__details-panel" id="cookie-details-panel" role="tabpanel" aria-labelledby="cookie-details-tab">
          <h2 id="cookie-consent-title" className="cookie-consent__sr-only">{translateText("Detalji kolačića")}</h2>
          <div className="cookie-consent__detail-list">
            <CookieCategory
              id="necessary"
              title={translateText("Neophodni")}
              count="Uvek"
              description={translateText("Neophodni kolačići omogućavaju osnovne funkcije sajta, uključujući čuvanje vašeg izbora privatnosti, prijavu, korpu i listu želja.")}
              expanded={expandedCategories.necessary}
              onToggle={() => toggleCategory('necessary')}
              control={<ConsentSwitch checked disabled label={translateText("Neophodni kolačići su uključeni")} />}
            />
            <CookieCategory
              id="functional"
              title={translateText("Funkcionalni")}
              count="2"
              description={translateText("Pamte temu, prijavu, prikaz newsletter ponude i poziciju u katalogu, a omogućavaju i Google mapu naše lokacije, predlog adrese i prikaz Google ocene prodavnice. Google može obraditi tehničke podatke pregledača i adresu koju unesete.")}
              expanded={expandedCategories.functional}
              onToggle={() => toggleCategory('functional')}
              control={<ConsentSwitch checked={functionalEnabled} onChange={() => { setPreferences(!functionalEnabled); setExternalGoogle(!functionalEnabled); }} disabled={saving} label={translateText("Funkcionalni kolačići i usluge")} />}
            />
            <CookieCategory
              id="analytics"
              title={translateText("Analitika")}
              count="1"
              description={translateText("Cloudflare Web Analytics meri korišćenje i performanse sajta kako bismo ga unapredili. Ne koristi se za personalizovano oglašavanje.")}
              expanded={expandedCategories.analytics}
              onToggle={() => toggleCategory('analytics')}
              control={<ConsentSwitch checked={analytics} onChange={() => setAnalytics(!analytics)} disabled={saving} label={translateText("Analitika")} />}
            />
            <CookieCategory
              id="marketing"
              title={translateText("Marketing")}
              count="0"
              description={translateText("Trenutno ne koristimo marketinške kolačiće niti personalizovano oglašavanje. Prijava na newsletter daje se zasebno.")}
              expanded={expandedCategories.marketing}
              onToggle={() => toggleCategory('marketing')}
              control={<ConsentSwitch disabled label={translateText("Nema marketinških kolačića")} />}
            />
            <CookieCategory
              id="uncategorized"
              title={translateText("Neklasifikovani")}
              count="0"
              description={translateText("Trenutno nema kolačića koje još nismo svrstali u neku od kategorija.")}
              expanded={expandedCategories.uncategorized}
              onToggle={() => toggleCategory('uncategorized')}
              control={<ConsentSwitch disabled label={translateText("Nema neklasifikovanih kolačića")} />}
            />
          </div>
        </div>
      );
    }

    if (panel === PANELS.about) {
      return (
        <div className="cookie-consent__panel cookie-consent__about" id="cookie-about-panel" role="tabpanel" aria-labelledby="cookie-about-tab">
          <div className="cookie-consent__panel-heading">
            <h2 id="cookie-consent-title">{translateText("Vi kontrolišete svoj izbor")}</h2>
            <p>{translateText("Kolačiće koristimo da bi DajaShop radio pouzdano i, uz vaš pristanak, da bismo unapredili iskustvo kupovine.")}</p>
          </div>
          <div className="cookie-consent__info-list">
            <div><ShieldCheck size={20} /><p><strong>{translateText("Neophodno")}</strong>{translateText(" omogućava bezbedan rad korpe, naloga i vašeg izbora privatnosti.")}</p></div>
            <div><Settings2 size={20} /><p><strong>{translateText("Funkcionalni")}</strong>{translateText(" pamte temu, prijavu, prikaz newsletter ponude i poziciju u katalogu, kao i omogućavaju Google mapu naše lokacije, predlog adrese i prikaz Google ocene prodavnice.")}</p></div>
            <div><BarChart3 size={20} /><p><strong>{translateText("Analitika")}</strong>{translateText(" nam pokazuje kako posetioci koriste sajt, bez prikazivanja oglasa.")}</p></div>
            <div><Info size={20} /><p><strong>{translateText("Marketing i neklasifikovani kolačići")}</strong>{translateText(" trenutno se ne koriste na sajtu.")}</p></div>
          </div>
          <p className="cookie-consent__links">{translateText("Pročitajte ")}<a href={localizePath('/cookies')}>{translateText("politiku kolačića")}</a>{translateText(" i ")}<a href={localizePath('/privacy')}>{translateText("politiku privatnosti")}</a>.
          </p>
          <p className="cookie-consent__version">{translateText("Verzija politike: ")}{translateText(policy?.version || 'u pripremi')}</p>
        </div>
      );
    }

    return (
      <div className="cookie-consent__panel" id="cookie-consent-panel" role="tabpanel" aria-labelledby="cookie-consent-tab">
        <div className="cookie-consent__panel-heading">
          <h2 id="cookie-consent-title">{translateText("Vaša privatnost")}</h2>
          <p>{translateText("Koristimo neophodne kolačiće za pouzdan rad sajta. Uz vašu dozvolu uključujemo funkcionalne opcije i analitiku radi boljeg iskustva kupovine. Funkcionalne opcije pamte vaša podešavanja i omogućavaju Google mapu, predlog adrese i prikaz Google ocene prodavnice.")}</p>
        </div>
        <p className="cookie-consent__subcopy">{translateText("Sve opcione kategorije možete uključiti, isključiti ili pregledati u Podešavanjima.")}</p>
      </div>
    );
  };

  return (
    <div className="cookie-consent" role="presentation">
      <section
        className="cookie-consent__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        onMouseEnter={() => setIsPointerOverDialog(true)}
        onMouseLeave={() => setIsPointerOverDialog(false)}
      >
        <header className="cookie-consent__header">
          <div className="cookie-consent__brand">
            <img className="cookie-consent__brand-logo" src="/images/dajashop-cookie-logo-compact.png" alt={translateText("DajaShop")} />
          </div>
          {forceSettings && (
            <button type="button" className="cookie-consent__close" onClick={onCloseSettings} disabled={saving} aria-label={translateText("Zatvori podešavanja")}>
              <X size={20} />
            </button>
          )}
        </header>

        <div className="cookie-consent__tabs" role="tablist" aria-label={translateText("Podešavanja kolačića")}>
          <button id="cookie-consent-tab" type="button" role="tab" aria-selected={panel === PANELS.consent} aria-controls="cookie-consent-panel" className={panel === PANELS.consent ? 'is-active' : ''} onClick={() => selectPanel(PANELS.consent)}>{translateText("Saglasnost")}</button>
          <button id="cookie-details-tab" type="button" role="tab" aria-selected={panel === PANELS.details} aria-controls="cookie-details-panel" className={panel === PANELS.details ? 'is-active' : ''} onClick={() => selectPanel(PANELS.details)}>{translateText("Detalji")}</button>
          <button id="cookie-about-tab" type="button" role="tab" aria-selected={panel === PANELS.about} aria-controls="cookie-about-panel" className={panel === PANELS.about ? 'is-active' : ''} onClick={() => selectPanel(PANELS.about)}>{translateText("O kolačićima")}</button>
        </div>

        <div className={`cookie-consent__content ${panel === PANELS.details ? 'cookie-consent__content--details' : ''}`}>
          {translateText(renderPanel())}
          {error && <p className="cookie-consent__error" role="alert">{translateText(error)}</p>}
        </div>

        <footer className="cookie-consent__footer">
          {panel === PANELS.details ? (
            <div className="cookie-consent__actions">
              <button
                type="button"
                className="cookie-consent__secondary"
                disabled={saving}
                onClick={() => run(() => onSave({ preferences: functionalEnabled, externalGoogle: functionalEnabled, analytics }))}
              >
                <Check size={18} /> {translateText(saving ? 'Čuvamo…' : 'Sačuvaj izbor')}
              </button>
              <button type="button" className="cookie-consent__primary" disabled={saving} onClick={() => run(onAll)}>
                {translateText(saving ? 'Čuvamo…' : 'Prihvati sve')}
              </button>
            </div>
          ) : (
            <div className="cookie-consent__actions">
              <button type="button" className="cookie-consent__secondary" disabled={saving} onClick={() => selectPanel(PANELS.details)}>
                <Settings2 size={18} />{translateText(" Podešavanja")}</button>
              <button type="button" className="cookie-consent__primary" disabled={saving} onClick={() => run(onAll)}>
                {translateText(saving ? 'Čuvamo…' : 'Prihvati sve')}
              </button>
            </div>
          )}
        </footer>
      </section>
    </div>
  );
}

function CookieCategory({ id, title, count, description, expanded, onToggle, control }) {
  const { t: translateText } = useStorefront();

  return (
    <article className="cookie-consent__detail-category">
      <div className="cookie-consent__detail-header">
        <button
          type="button"
          className="cookie-consent__detail-trigger"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`cookie-category-${id}`}
        >
          <ChevronDown className={expanded ? 'is-expanded' : ''} size={18} aria-hidden="true" />
          <span>{translateText(title)}</span>
          <small>{translateText(count)}</small>
        </button>
        {translateText(control)}
      </div>
      {expanded && <p id={`cookie-category-${id}`} className="cookie-consent__detail-description">{translateText(description)}</p>}
    </article>
  );
}

function ConsentSwitch({ checked = false, onChange, disabled = false, label }) {
  const { t: translateText } = useStorefront();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={translateText(label)}
      className={`cookie-consent__switch ${checked ? 'is-on' : ''}`}
      onClick={onChange}
      disabled={disabled}
    >
      <span />
    </button>
  );
}
