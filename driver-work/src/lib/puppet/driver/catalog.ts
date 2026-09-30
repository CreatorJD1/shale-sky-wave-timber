/** Inert catalog import. Never executes HTML or routes through the 12 MiB guide importer. */

export const CATALOG_LIMIT = 80 * 1024 * 1024;
const BLOCK = new Set(['EDGE_CLIPPED', 'INTERNAL_CLIPPED', 'CROP_TARGET_MISSING']);

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

export interface QcMap { blocked: Record<string, { flags: string[] }> }

export function parseCatalogIndex(raw: unknown): { entries: CatalogEntry[]; assets: number; groups: number } {
    if (!raw || typeof raw !== 'object')
        throw new Error('Catalog index is not an object');
    const d = raw as { entries?: unknown; assets?: unknown };
    if (!Array.isArray(d.entries))
        throw new Error('Catalog entries missing');
    const entries: CatalogEntry[] = d.entries.map((e, i) => {
        if (!e || typeof e !== 'object')
            throw new Error('Bad catalog entry ' + i);
        const r = e as CatalogEntry;
        for (const k of ['id', 'label', 'section', 'collection', 'assetId', 'status'] as const) {
            if (typeof r[k] !== 'string')
                throw new Error('Catalog entry missing ' + k);
        }
        return { id: r.id, label: r.label, section: r.section, collection: r.collection, assetId: r.assetId, status: r.status };
    });
    const assets = d.assets && typeof d.assets === 'object' ? Object.keys(d.assets).length : new Set(entries.map(e => e.assetId)).size;
    const groups = new Set(entries.map(e => e.section)).size;
    if (entries.length !== 230 || assets !== 190 || groups !== 20)
        throw new Error('Catalog identity mismatch: expected 230 entries, 190 originals, 20 groups');
    return { entries, assets, groups };
}

/** Pulls the JSON data block only. Script bodies are never evaluated. */
export function inspectCatalogHTML(html: string): { entries: CatalogEntry[]; assets: number; groups: number } {
    const bytes = new TextEncoder().encode(html).length;
    if (bytes > CATALOG_LIMIT)
        throw new Error('Catalog exceeds 80 MiB');
    const m = /<script\s+id="catalog-data"\s+type="application\/json">([\s\S]*?)<\/script>/i.exec(html);
    if (!m)
        throw new Error('No catalog-data block. This is not the master sheet.');
    let parsed: unknown;
    try {
        parsed = JSON.parse(m[1]);
    }
    catch {
        throw new Error('Catalog data is not valid JSON');
    }
    return parseCatalogIndex(parsed);
}

export function qcFlags(qc: QcMap | null, assetId: string): string[] {
    return qc?.blocked[assetId]?.flags ?? [];
}

export function bindingBlocked(flags: string[]) {
    return flags.some(f => BLOCK.has(f));
}
