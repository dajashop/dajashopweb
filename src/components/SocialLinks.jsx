import { useStorefront } from '../localization/StorefrontContext.jsx';
import { Instagram } from 'lucide-react';
import { socialProfiles } from '../config/socialProfiles.js';

const icons = { Instagram };

export default function SocialLinks({ className, size = 20 }) {
  const { t: translateText } = useStorefront();

  if (!socialProfiles.length) return null;
  return (
    <div className={className}>
      {socialProfiles.map(({ name, href }) => {
        const Icon = icons[name];
        return (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={translateText(`DajaShop na mreži ${name}`)}>
            <Icon size={size} />
          </a>
        );
      })}
    </div>
  );
}
