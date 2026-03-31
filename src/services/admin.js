import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { app, db } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

class CollectionService {
  constructor(collectionName) {
    this.colName = collectionName;
    this.ref = collection(db, collectionName);
  }

  subscribe(onData, onError) {
    const q = query(this.ref, orderBy('name', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        onData(items);
      },
      onError,
    );
  }

  async add(name, extraData = {}) {
    if (!name.trim()) throw new Error('Naziv ne može biti prazan.');
    return await addDoc(this.ref, {
      name: name.trim(),
      ...extraData,
      createdAt: serverTimestamp(),
    });
  }

  async update(id, newName, extraData = {}) {
    if (!newName.trim()) throw new Error('Naziv ne može biti prazan.');
    const docRef = doc(db, this.colName, id);
    return await updateDoc(docRef, {
      name: newName.trim(),
      ...extraData,
    });
  }

  async remove(id) {
    const docRef = doc(db, this.colName, id);
    return await deleteDoc(docRef);
  }
}

// --- SERVIS ZA PORUDŽBINE (ISPRAVLJEN) ---
export const ordersService = {
  subscribe: (onData, onError) => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          // 1. Uzimamo sve podatke porudžbine
          ...d.data(),
          // 2. [KLJUČNA IZMENA]: Koristimo human-readable ID (DAJA-xxxxxx) za prikaz
          id: d.data().displayId || d.id,
          // 3. Stari Firestore ID čuvamo kao 'docId' (za update statusa)
          docId: d.id,
        }));
        onData(items);
      },
      onError,
    );
  },

  // Ovde sada očekujemo pravi 'docId' (ArOc...), a ne 'DAJA-...'
  updateStatus: async (docId, newStatus) => {
    if (!docId) throw new Error('Nedostaje ID dokumenta za ažuriranje.');
    console.log(
      'Ažuriram status za dokument:',
      docId,
      'Novi status:',
      newStatus,
    );

    const docRef = doc(db, 'orders', docId);
    return await updateDoc(docRef, { status: newStatus });
  },

  markAsRead: async (docId) => {
    if (!docId) return;
    const docRef = doc(db, 'orders', docId);
    return await updateDoc(docRef, { isRead: true });
  },
};

// --- NOVO: SERVIS ZA SLIKE PREKO URL-A ---
export const uploadRemoteImage = async (url, productName) => {
  // Ovi logovi će se pojaviti u browser konzoli (F12)
  console.log('Pozivam Cloud Funkciju sa:', { url, productName });

  const functions = getFunctions(app, 'europe-west3');
  const saveImageFn = httpsCallable(functions, 'saveImageFromUrl');

  try {
    const result = await saveImageFn({
      url: url,
      productName: productName,
    });
    // Vraćamo sigurni, tokenizovani link
    return result.data;
  } catch (error) {
    console.error('Cloud function error:', error);
    // Vraćamo fallback objekat da frontend ne pukne
    return { url: url, results: [] };
  }
};

export const repairProductImageUrls = async (productId = '') => {
  const functions = getFunctions(app, 'europe-west3');
  const repairImagesFn = httpsCallable(functions, 'repairProductImageUrls');

  const payload = productId ? { productId } : {};
  const result = await repairImagesFn(payload);
  return result.data;
};

export const generateThumbnail = async (storagePath) => {
  if (!storagePath || !String(storagePath).trim()) {
    throw new Error('storagePath je obavezan.');
  }

  const functions = getFunctions(app, 'europe-west3');
  const generateThumbnailFn = httpsCallable(
    functions,
    'generateThumbnailFromStorage',
  );

  const result = await generateThumbnailFn({
    storagePath: String(storagePath).trim(),
  });

  return result.data;
};

export const brandService = new CollectionService('brands');
export const categoryService = new CollectionService('categories');
export const specKeyService = new CollectionService('spec_keys');
