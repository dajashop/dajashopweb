import { useEffect, useState } from 'react';
import { firebasePhoneConfig } from '../services/firebasePhone.js';

export function useFirebasePhone() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    firebasePhoneConfig().then(config => { if (active) setAvailable(Boolean(config)); });
    return () => { active = false; };
  }, []);
  return available;
}
