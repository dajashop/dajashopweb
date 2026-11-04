const DATABASE_NAME = 'daja-admin-media-queue';
const STORE_NAME = 'jobs';
let databasePromise;

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Pregledač ne podržava bezbedno čuvanje reda slika.'));
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('scope', 'scope', { unique: false });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Red slika nije mogao da se otvori.'));
      request.onblocked = () => reject(new Error('Zatvorite drugi DAJA admin tab da bi se red slika otvorio.'));
    }).catch(error => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('Čuvanje reda slika nije uspelo.'));
  });
}

export async function saveMediaUploadJob(job) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const done = transactionDone(transaction);
  transaction.objectStore(STORE_NAME).put({ ...job, file: job.status === 'ready' ? null : job.file || null, preview: undefined });
  await done;
}

export async function saveMediaUploadJobs(jobs) {
  if (!jobs.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const done = transactionDone(transaction);
  const store = transaction.objectStore(STORE_NAME);
  for (const job of jobs) store.put({ ...job, file: job.status === 'ready' ? null : job.file || null, preview: undefined });
  await done;
}

export async function listMediaUploadJobs(scope) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const request = transaction.objectStore(STORE_NAME).index('scope').getAll(scope);
  const rows = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Sačuvani red slika nije mogao da se učita.'));
  });
  await transactionDone(transaction);
  return rows;
}

export async function listAllMediaUploadJobs() {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const done = transactionDone(transaction);
  const request = transaction.objectStore(STORE_NAME).getAll();
  const rows = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  await done;
  return rows;
}

export async function getMediaUploadJob(id) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const done = transactionDone(transaction);
  const request = transaction.objectStore(STORE_NAME).get(id);
  const row = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await done;
  return row;
}

export async function removeMediaUploadJob(id) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const done = transactionDone(transaction);
  transaction.objectStore(STORE_NAME).delete(id);
  await done;
}

export async function clearMediaUploadJobs(scope) {
  const jobs = await listMediaUploadJobs(scope);
  if (!jobs.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const done = transactionDone(transaction);
  const store = transaction.objectStore(STORE_NAME);
  for (const job of jobs) store.delete(job.id);
  await done;
}
