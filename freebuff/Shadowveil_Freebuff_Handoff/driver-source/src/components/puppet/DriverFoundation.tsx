import { useEffect, useRef } from 'react';
import type { DriverAPI } from '@/lib/puppet/driver/app';
/** Opt-in adapter. The existing v5 route remains unchanged until activation. */
export function DriverFoundation() {
    const host = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const target = host.current;
        if (!target)
            return;
        const abort = new AbortController();
        let api: DriverAPI | undefined;
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = '/driver-foundation/style.css';
        document.head.append(style);
        const moduleURL = '/driver-foundation/modules/driver/app.js';
        Promise.all([import(/* @vite-ignore */ moduleURL), fetch('/driver-foundation/assets.json', { signal: abort.signal }).then(r => { if (!r.ok)
                throw new Error('Driver assets unavailable'); return r.json(); })])
            .then(([module, resources]) => { if (abort.signal.aborted)
            return; return module.mount(target, { ...resources, signal: abort.signal }); })
            .then((mounted: DriverAPI | undefined) => { api = mounted; if (abort.signal.aborted)
            api?.destroy(); })
            .catch((error: unknown) => { if (!abort.signal.aborted)
            target.textContent = 'Driver foundation failed: ' + String(error); });
        return () => { abort.abort(); api?.destroy(); style.remove(); };
    }, []);
    return <div ref={host} aria-label="Shadowveil character driver foundation">Loading character project…</div>;
}
