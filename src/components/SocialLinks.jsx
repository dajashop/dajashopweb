import { Facebook, Instagram } from 'lucide-react';
import { socialProfiles } from '../config/socialProfiles.js';

const icons = { Facebook, Instagram };

export default function SocialLinks({ className, size = 20 }) {
  if (!socialProfiles.length) return null;
  return (
    <div className={className}>
      {socialProfiles.map(({ name, href }) => {
        const Icon = icons[name];
        return (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`DajaShop na mreži ${name}`}>
            <Icon size={size} />
          </a>
        );
      })}
    </div>
  );
}
