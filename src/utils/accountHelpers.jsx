// src/utils/accountHelpers.js

import {
  MapPin,
  Home,
  Briefcase,
  Heart,
  Star,
  Sun,
  Coffee,
  Gamepad2,
  GraduationCap,
  Building2,
  Dumbbell,
} from 'lucide-react';
import { getFlagUrl as firstPartyFlagUrl } from './flags.js';
import { PHONE_COUNTRIES } from '../data/phoneCountries.js';

// --- CONFIGURATION CONSTANTS ---
export const ADDRESS_ICONS = {
  home: { label: 'Kuća', icon: Home },
  briefcase: { label: 'Posao', icon: Briefcase },
  mapPin: { label: 'Lokacija', icon: MapPin },
  heart: { label: 'Omiljeno', icon: Heart },
  star: { label: 'Važno', icon: Star },
  sun: { label: 'Vikendica', icon: Sun },
  coffee: { label: 'Kafić', icon: Coffee },
  gamepad: { label: 'Zabava', icon: Gamepad2 },
  school: { label: 'Škola', icon: GraduationCap },
  building: { label: 'Zgrada', icon: Building2 },
  gym: { label: 'Trening', icon: Dumbbell },
};

export const ADDRESS_ICON_ORDER = [
  'home',
  'briefcase',
  'mapPin',
  'heart',
  'star',
  'sun',
  'coffee',
  'gamepad',
  'school',
  'building',
  'gym',
];

export const COUNTRY_CODES = PHONE_COUNTRIES;

// --- HELPER FUNCTIONS ---

export const getFlagUrl = firstPartyFlagUrl;

export const renderIcon = (iconKey, size = 20) => {
  const IconComponent = ADDRESS_ICONS[iconKey]?.icon || MapPin;
  return <IconComponent size={size} />;
};

export const getInitials = (user) => {
  const name = user.displayName;
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  return user.email?.[0]?.toUpperCase() || 'U';
};
