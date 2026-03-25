import { db } from './firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDocs,
  where,
  limit,
  serverTimestamp,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getStorage,
} from 'firebase/storage';

const COL = 'products';
const storage = getStorage();

/**
 * Sluša promene na kolekciji 'products' u realnom vremenu.
 * @param {Object} options
 * @param {Function} options.onData - Callback sa nizom proizvoda
 * @param {Function} options.onError - Callback za grešku
 * @param {string} options.order - Polje za sortiranje (default: 'name')
 */
export function subscribeProducts({ onData, onError, order = 'name' } = {}) {
  const colRef = collection(db, COL);

  // Oslanjamo se na osnovno sortiranje baze.
  // Napredno filtriranje radimo na klijentu da izbegnemo "Missing Index" greške.
  const q = query(colRef, orderBy(order));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData?.(items);
    },
    (err) => {
      console.error('Firestore error:', err);
      onError?.(err);
    },
  );
}

// --- Ostale funkcije za admina (save, upload, delete) ostaju iste ---

// --- POPRAVLJENA FUNKCIJA ---
export async function saveProduct(partial) {
  // 1. Ako NEMA ID -> Kreiraj novi dokument (addDoc)
  if (!partial.id) {
    const colRef = collection(db, COL);
    const docRef = await addDoc(colRef, {
      ...partial,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id; // Vraćamo novi ID
  }

  // 2. Ako IMA ID -> Ažuriraj postojeći (updateDoc / setDoc)
  const refDoc = doc(db, COL, partial.id);
  try {
    await updateDoc(refDoc, { ...partial, updatedAt: serverTimestamp() });
  } catch (e) {
    // Ako dokument ne postoji, kreiraj ga sa tim ID-em (fallback)
    await setDoc(
      refDoc,
      {
        ...partial,
        createdAt: serverTimestamp(), // Ako je novi a ima ID
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
  return partial.id;
}

export async function uploadImages(productId, files, onProgress) {
  const uploads = Array.from(files).map(
    (file) =>
      new Promise((resolve, reject) => {
        const path = `products/${productId}/${Date.now()}_${file.name}`;
        const r = ref(storage, path);
        const task = uploadBytesResumable(r, file);

        let lastProgressUpdate = 0;
        const MIN_PROGRESS_INTERVAL = 100; // Osvežavamo max 10x po sekundi

        task.on(
          'state_changed',
          (snap) => {
            const now = Date.now();
            // Debounce: Emituj progress samo ako je prošlo dovoljno vremena
            if (now - lastProgressUpdate >= MIN_PROGRESS_INTERVAL) {
              const pct = Math.round(
                (snap.bytesTransferred / snap.totalBytes) * 100,
              );
              onProgress?.({ file, progress: pct });
              lastProgressUpdate = now;
            }
          },
          (err) => reject(err),
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve({ url, path });
          },
        );
      }),
  );
  return Promise.all(uploads);
}

export async function removeImagesByPaths(productId, paths = []) {
  await Promise.all(
    paths.map(async (p) => {
      try {
        const r = ref(storage, p);
        await deleteObject(r);
      } catch (e) {
        console.error('Delete failed:', p, e);
      }
    }),
  );
}

export async function fetchProductBySlug(slug) {
  try {
    const q = query(
      collection(db, 'products'),
      where('slug', '==', slug),
      limit(1),
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

// Nova funkcija za brisanje
export async function deleteProduct(id) {
  if (!id) throw new Error('ID proizvoda je obavezan');
  const refDoc = doc(db, 'products', id);
  await deleteDoc(refDoc);
}
