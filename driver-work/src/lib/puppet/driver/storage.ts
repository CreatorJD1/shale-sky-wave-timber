import type { ProjectDoc } from './document.js';
/** One stable origin + one stable database name. Transaction completion is the save acknowledgement. */
export class ProjectStore {
    db: IDBDatabase | null = null;
    private chain: Promise<void> = Promise.resolve();
    async open(): Promise<void> { this.db = await new Promise<IDBDatabase>((ok, no) => { if (!globalThis.indexedDB) {
        no(new Error('IndexedDB unavailable'));
        return;
    } const req = indexedDB.open('shadowveil-character-driver', 1); req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('projects'))
        req.result.createObjectStore('projects'); }; req.onblocked = () => no(new Error('Storage upgrade blocked by another editor tab')); req.onerror = () => no(req.error); req.onsuccess = () => ok(req.result); }); }
    async load(): Promise<unknown | null> { const db = this.db; if (!db)
        throw new Error('Storage not open'); return new Promise((ok, no) => { const tx = db.transaction('projects', 'readonly'), r = tx.objectStore('projects').get('active'); r.onsuccess = () => ok(r.result ?? null); r.onerror = () => no(r.error); }); }
    save(d: ProjectDoc): Promise<void> { const snapshot = structuredClone(d); const write = () => new Promise<void>((ok, no) => { if (!this.db) {
        no(new Error('Autosave unavailable; export your project'));
        return;
    } const tx = this.db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(snapshot, 'active'); tx.oncomplete = () => ok(); tx.onabort = () => no(tx.error ?? new Error('Save aborted')); tx.onerror = () => no(tx.error); }); const result = this.chain.then(write, write); this.chain = result.catch(() => { }); return result; }
    async flush() { await this.chain; }
    close() { this.db?.close(); this.db = null; }
}
