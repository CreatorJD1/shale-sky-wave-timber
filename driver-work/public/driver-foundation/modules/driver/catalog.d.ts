/** Inert catalog import. Never executes HTML or routes through the 12 MiB guide importer. */
export declare const CATALOG_LIMIT: number;
export interface CatalogEntry {
    id: string;
    label: string;
    section: string;
    collection: string;
    assetId: string;
    status: string;
}
export interface CatalogSummary {
    kind: 'catalog-index';
    entries: number;
    assets: number;
    groups: number;
    sha256: string | null;
    selectedAssetId: string | null;
    binding: 'reference_available' | 'needs_review';
}
export interface QcMap {
    blocked: Record<string, {
        flags: string[];
    }>;
}
export declare function parseCatalogIndex(raw: unknown): {
    entries: CatalogEntry[];
    assets: number;
    groups: number;
};
/** Pulls the JSON data block only. Script bodies are never evaluated. */
export declare function inspectCatalogHTML(html: string): {
    entries: CatalogEntry[];
    assets: number;
    groups: number;
};
export declare function qcFlags(qc: QcMap | null, assetId: string): string[];
export declare function bindingBlocked(flags: string[]): boolean;
