
import { OHLC } from '../types';

const DB_NAME = 'AlphaScreenerDB';
const DB_VERSION = 1;
const STOCK_STORE = 'stocks';
const META_STORE = 'metadata';

/**
 * Handles persistent storage of stock data using IndexedDB.
 */
class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STOCK_STORE)) {
          db.createObjectStore(STOCK_STORE);
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      };
    });
  }

  async saveStockData(symbol: string, data: OHLC[]): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STOCK_STORE], 'readwrite');
      const store = transaction.objectStore(STOCK_STORE);
      store.put(data, symbol);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getStockData(symbol: string): Promise<OHLC[] | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STOCK_STORE], 'readonly');
      const store = transaction.objectStore(STOCK_STORE);
      const request = store.get(symbol);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveMetadata(key: string, value: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([META_STORE], 'readwrite');
      const store = transaction.objectStore(META_STORE);
      store.put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getMetadata(key: string): Promise<any> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([META_STORE], 'readonly');
      const store = transaction.objectStore(META_STORE);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STOCK_STORE, META_STORE], 'readwrite');
      transaction.objectStore(STOCK_STORE).clear();
      transaction.objectStore(META_STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const storageService = new StorageService();
