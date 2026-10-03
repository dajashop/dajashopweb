import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { transferGuestDrafts } from '../../services/engraving';
export default function EngravingSync() {
  const { user } = useAuth(); const userId = user?.id || user?.uid;
  const [error, setError] = useState('');
  const sync = () => transferGuestDrafts(userId).then(() => setError('')).catch((error) => setError(error.message));
  useEffect(() => { if (userId) sync(); else setError(''); }, [userId]);
  return error ? <div role="alert" style={{ position: 'fixed', bottom: 20, left: 20, right: 20, zIndex: 1000, background: '#fff', border: '1px solid #ddd', padding: 14, borderRadius: 14, boxShadow: '0 4px 30px #0002', fontSize: 13 }}>Nacrti gravure nisu preneti u nalog. Sačuvani su u ovom browseru. <span>{error}</span> <button onClick={sync}>Pokušaj ponovo</button> <button aria-label="Zatvori poruku" onClick={() => setError('')}>×</button></div> : null;
}
