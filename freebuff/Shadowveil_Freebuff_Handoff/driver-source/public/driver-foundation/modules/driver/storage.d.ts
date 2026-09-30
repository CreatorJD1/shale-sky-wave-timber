import type { ProjectDoc } from './document.js';
/** One stable origin + one stable database name. Transaction completion is the save acknowledgement. */
export declare class ProjectStore {
    db: IDBDatabase | null;
    private chain;
    open(): Promise<void>;
    load(): Promise<unknown | null>;
    save(d: ProjectDoc): Promise<void>;
    flush(): Promise<void>;
    close(): void;
}
