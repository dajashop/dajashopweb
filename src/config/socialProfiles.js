function profileUrl(value, hosts) {
  try {
    const url = new URL((value || '').trim());
    const path = url.pathname.replace(/\/+$/, '');
    if (url.protocol !== 'https:' || !hosts.includes(url.hostname) || !path || url.username || url.password) return '';
    // Site homepages and sharing/login links are not business profiles.
    if (/^\/(?:login|accounts|reel|reels|p|stories|share|sharer|sharer\.php|dialog)(?:\/|$)/i.test(path)) return '';
    return url.href;
  } catch {
    return '';
  }
}

// Leave blank until the owner supplies the official profiles.
export const socialProfiles = [
  { name: 'Facebook', href: profileUrl(import.meta.env.VITE_FACEBOOK_PROFILE_URL, ['facebook.com', 'www.facebook.com', 'm.facebook.com']) },
  { name: 'Instagram', href: profileUrl(import.meta.env.VITE_INSTAGRAM_PROFILE_URL, ['instagram.com', 'www.instagram.com']) },
].filter(profile => profile.href);
