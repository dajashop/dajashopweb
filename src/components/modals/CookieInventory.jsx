import { ChevronDown, ExternalLink } from 'lucide-react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { cookieInventory } from './cookieInventoryData.js';

export default function CookieInventory({ category }) {
  const { t } = useStorefront();
  const groups = cookieInventory[category];
  if (!groups?.length) return null;

  return (
    <div className="cookie-consent__inventory">
      {groups.map(({ id, title, entries, note, source }) => (
        <details className="cookie-consent__inventory-group" key={id}>
          <summary className="cookie-consent__inventory-summary">
            <span>{t(title)}</span>
            {entries.length > 0 && <small aria-hidden="true">{entries.length}</small>}
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="cookie-consent__inventory-body">
            {note && <p>{t(note)}</p>}
            {entries.length > 0 && (
              <ul className="cookie-consent__inventory-list">
                {entries.map(({ name, type, duration, purpose }) => (
                  <li className="cookie-consent__inventory-record" key={name}>
                    <code dir="ltr">{name}</code>
                    <p>{t(purpose)}</p>
                    <dl className="cookie-consent__inventory-meta">
                      <div><dt>{t('Tip zapisa')}</dt><dd>{t(type)}</dd></div>
                      <div><dt>{t('Trajanje')}</dt><dd>{t(duration)}</dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
            {source && (
              <a className="cookie-consent__inventory-source" href={source} target="_blank" rel="noopener noreferrer">
                {t('O pružaocu usluge')} <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
