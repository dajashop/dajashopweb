const DATABASE_NAME = 'daja-admin-media-queue';
const STORE_NAME = 'jobs';
let databasePromise;

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Pregledač ne podržava bezbedno čuvanje reda slika.'));
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      let settled = false;
      const fail = error => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } };
      const timer = setTimeout(() => fail(new Error('Čuvanje reda slika je zastalo. Pokušajte ponovo.')), 15_000);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('scope', 'scope', { unique: false });
      };
      request.onsuccess = () => {
        if (settled) { request.result.close(); return; }
        settled = true; clearTimeout(timer);
        request.result.onversionchange = () => { request.result.close(); databasePromise = null; };
        resolve(request.result);
      };
      request.onerror = () => fail(request.error || new Error('Red slika nije mogao da se otvori.'));
      request.onblocked = () => fail(new Error('Zatvorite drugi DAJA admin tab da bi se red slika otvorio.'));
    }).catch(error => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

function transactionDone(transaction) {
  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { transaction.abort(); } catch { /* already completed */ }
      reject(new Error('Čuvanje reda slika je zastalo. Pokušajte ponovo.'));
    }, 15_000);
    transaction.oncomplete = () => { clearTimeout(timer); resolve(); };
    transaction.onabort = transaction.onerror = () => { clearTimeout(timer); reject(transaction.error || new Error('Čuvanje reda slika nije uspelo.')); };
  });
  // Reads await their request before the transaction. Handle early aborts
  // immediately while preserving rejection for the eventual await.
  void done.catch(() => {});
  return done;
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
  const done = transactionDone(transaction);
  const request = transaction.objectStore(STORE_NAME).index('scope').getAll(scope);
  const rows = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Sačuvani red slika nije mogao da se učita.'));
  });
  await done;
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
