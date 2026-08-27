import { describe, expect, it } from 'vitest';
import { loadFflate } from './exportVendors';

describe('loadFflate', () => {
    it('loads the fflate module and exposes zipSync', async () => {
        const mod = await loadFflate();
        expect(mod).toBeDefined();
        expect(typeof mod.zipSync).toBe('function');
    });

    it('produces a non-empty ZIP from a small payload', async () => {
        const { zipSync, strToU8 } = await loadFflate();
        const zipped = zipSync({
            'hello.txt': strToU8('hello world'),
            'nested/a.bin': new Uint8Array([1, 2, 3, 4])
        }, { level: 6 });
        expect(zipped.byteLength).toBeGreaterThan(0);
    });
});