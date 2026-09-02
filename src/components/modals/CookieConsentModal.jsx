import { useEffect, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronDown,
  Cookie,
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
          <h1 id="cookie-consent-title" className="cookie-consent__sr-only">Detalji kolačića</h1>
          <div className="cookie-consent__detail-list">
            <CookieCategory
              id="necessary"
              title="Neophodni"
              count="Uvek"
              description="Neophodni kolačići omogućavaju osnovne funkcije sajta, uključujući čuvanje vašeg izbora privatnosti, prijavu, korpu i listu želja."
              expanded={expandedCategories.necessary}
              onToggle={() => toggleCategory('necessary')}
              control={<ConsentSwitch checked disabled label="Neophodni kolačići su uključeni" />}
            />
            <CookieCategory
              id="functional"
              title="Funkcionalni"
              count="2"
              description="Pamte temu, prijavu, prikaz newsletter ponude i poziciju u katalogu, a omogućavaju i Google mapu naše lokacije i predlog adrese. Google može obraditi tehničke podatke pregledača i adresu koju unesete."
              expanded={expandedCategories.functional}
              onToggle={() => toggleCategory('functional')}
              control={<ConsentSwitch checked={functionalEnabled} onChange={() => { setPreferences(!functionalEnabled); setExternalGoogle(!functionalEnabled); }} disabled={saving} label="Funkcionalni kolačići i usluge" />}
            />
            <CookieCategory
              id="analytics"
              title="Analitika"
              count="1"
              description="Cloudflare Web Analytics meri korišćenje i performanse sajta kako bismo ga unapredili. Ne koristi se za personalizovano oglašavanje."
              expanded={expandedCategories.analytics}
              onToggle={() => toggleCategory('analytics')}
              control={<ConsentSwitch checked={analytics} onChange={() => setAnalytics(!analytics)} disabled={saving} label="Analitika" />}
            />
            <CookieCategory
              id="marketing"
              title="Marketing"
              count="0"
              description="Trenutno ne koristimo marketinške kolačiće niti personalizovano oglašavanje. Prijava na newsletter daje se zasebno."
              expanded={expandedCategories.marketing}
              onToggle={() => toggleCategory('marketing')}
              control={<ConsentSwitch disabled label="Nema marketinških kolačića" />}
            />
            <CookieCategory
              id="uncategorized"
              title="Neklasifikovani"
              count="0"
              description="Trenutno nema kolačića koje još nismo svrstali u neku od kategorija."
              expanded={expandedCategories.uncategorized}
              onToggle={() => toggleCategory('uncategorized')}
              control={<ConsentSwitch disabled label="Nema neklasifikovanih kolačića" />}
            />
          </div>
        </div>
      );
    }

    if (panel === PANELS.about) {
      return (
        <div className="cookie-consent__panel cookie-consent__about" id="cookie-about-panel" role="tabpanel" aria-labelledby="cookie-about-tab">
          <div className="cookie-consent__panel-heading">
            <h1 id="cookie-consent-title">Vi kontrolišete svoj izbor</h1>
            <p>Kolačiće koristimo da bi DajaShop radio pouzdano i, uz vaš pristanak, da bismo unapredili iskustvo kupovine.</p>
          </div>
          <div className="cookie-consent__info-list">
            <div><ShieldCheck size={20} /><p><strong>Neophodno</strong> omogućava bezbedan rad korpe, naloga i vašeg izbora privatnosti.</p></div>
            <div><Settings2 size={20} /><p><strong>Funkcionalni</strong> pamte temu, prijavu, prikaz newsletter ponude i poziciju u katalogu, kao i omogućavaju Google mapu naše lokacije i predlog adrese.</p></div>
            <div><BarChart3 size={20} /><p><strong>Analitika</strong> nam pokazuje kako posetioci koriste sajt, bez prikazivanja oglasa.</p></div>
            <div><Info size={20} /><p><strong>Marketing i neklasifikovani kolačići</strong> trenutno se ne koriste na sajtu.</p></div>
          </div>
          <p className="cookie-consent__links">
            Pročitajte <a href="/cookies">politiku kolačića</a> i <a href="/privacy">politiku privatnosti</a>.
          </p>
          <p className="cookie-consent__version">Verzija politike: {policy?.version || 'u pripremi'}</p>
        </div>
      );
    }

    return (
      <div className="cookie-consent__panel" id="cookie-consent-panel" role="tabpanel" aria-labelledby="cookie-consent-tab">
        <div className="cookie-consent__panel-heading">
          <h1 id="cookie-consent-title">Vaša privatnost</h1>
          <p>Koristimo neophodne kolačiće za pouzdan rad sajta. Uz vašu dozvolu uključujemo funkcionalne opcije i analitiku radi boljeg iskustva kupovine. Funkcionalne opcije pamte vaša podešavanja i omogućavaju Google mapu i predlog adrese.</p>
        </div>
        <p className="cookie-consent__subcopy">Sve opcione kategorije možete uključiti, isključiti ili pregledati u Podešavanjima.</p>
      </div>
    );
  };

  return (
    <div className="cookie-consent" role="presentation">
      <section className="cookie-consent__dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
        <header className="cookie-consent__header">
          <div className="cookie-consent__brand" aria-label="DajaShop privatnost">
            <span className="cookie-consent__brand-mark"><Cookie size={22} /></span>
            <span><strong>Daja</strong>Shop<small>privatnost</small></span>
          </div>
          {forceSettings && (
            <button type="button" className="cookie-consent__close" onClick={onCloseSettings} disabled={saving} aria-label="Zatvori podešavanja">
              <X size={20} />
            </button>
          )}
        </header>

        <div className="cookie-consent__tabs" role="tablist" aria-label="Podešavanja kolačića">
          <button id="cookie-consent-tab" type="button" role="tab" aria-selected={panel === PANELS.consent} aria-controls="cookie-consent-panel" className={panel === PANELS.consent ? 'is-active' : ''} onClick={() => selectPanel(PANELS.consent)}>Saglasnost</button>
          <button id="cookie-details-tab" type="button" role="tab" aria-selected={panel === PANELS.details} aria-controls="cookie-details-panel" className={panel === PANELS.details ? 'is-active' : ''} onClick={() => selectPanel(PANELS.details)}>Detalji</button>
          <button id="cookie-about-tab" type="button" role="tab" aria-selected={panel === PANELS.about} aria-controls="cookie-about-panel" className={panel === PANELS.about ? 'is-active' : ''} onClick={() => selectPanel(PANELS.about)}>O kolačićima</button>
        </div>

        <div className={`cookie-consent__content ${panel === PANELS.details ? 'cookie-consent__content--details' : ''}`}>
          {renderPanel()}
          {error && <p className="cookie-consent__error" role="alert">{error}</p>}
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
                <Check size={18} /> {saving ? 'Čuvamo…' : 'Sačuvaj izbor'}
              </button>
              <button type="button" className="cookie-consent__primary" disabled={saving} onClick={() => run(onAll)}>
                {saving ? 'Čuvamo…' : 'Prihvati sve'}
              </button>
            </div>
          ) : (
            <div className="cookie-consent__actions">
              <button type="button" className="cookie-consent__secondary" disabled={saving} onClick={() => selectPanel(PANELS.details)}>
                <Settings2 size={18} /> Podešavanja
              </button>
              <button type="button" className="cookie-consent__primary" disabled={saving} onClick={() => run(onAll)}>
                {saving ? 'Čuvamo…' : 'Prihvati sve'}
              </button>
            </div>
          )}
        </footer>
      </section>
    </div>
  );
}

function CookieCategory({ id, title, count, description, expanded, onToggle, control }) {
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
          <span>{title}</span>
          <small>{count}</small>
        </button>
        {control}
      </div>
      {expanded && <p id={`cookie-category-${id}`} className="cookie-consent__detail-description">{description}</p>}
    </article>
  );
}

function ConsentSwitch({ checked = false, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`cookie-consent__switch ${checked ? 'is-on' : ''}`}
      onClick={onChange}
      disabled={disabled}
    >
      <span />
    </button>
  );
}
