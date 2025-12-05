import { Product } from '../types';

const DB_NAME = 'ProductLensDB';
const DB_VERSION = 1;
const STORE_NAME = 'products';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
        reject("IndexedDB not supported");
        return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (event) => reject('Database error: ' + (event.target as any).error);
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveProductsToDB = async (products: Product[]): Promise<void> => {
  try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        products.forEach(product => store.put(product));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
  } catch (e) {
      console.error("DB Save Error", e);
      return Promise.resolve(); // Fail silently to not crash app
  }
};

export const getProductsFromDB = async (): Promise<Product[]> => {
  try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
  } catch (e) {
      console.error("DB Read Error", e);
      return Promise.resolve([]);
  }
};