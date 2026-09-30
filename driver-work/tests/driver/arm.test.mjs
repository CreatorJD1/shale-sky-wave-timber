import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as A from '../../public/driver-foundation/modules/driver/arm-views.js';
import * as C from '../../public/driver-foundation/modules/driver/catalog.js';
import * as D from '../../public/driver-foundation/modules/driver/document.js';
import * as R from '../../public/driver-foundation/modules/driver/driver.js';

const rig = R.provisionalRig();
const pose = R.neutralDriver(rig);

test('Rest arm chain matches authored landmarks', () => {
    for (const p of A.ARM_PACKETS) {
        const c = A.armChain(p, pose);
        assert.equal(c.shoulder.x, p.shoulder.x);
        assert.equal(c.elbow.y, p.elbow.y);
        assert.equal(c.wrist.x, p.wrist.x);
        assert.equal(c.tip.y, p.tip.y);
    }
});

test('View packets do not treat back or the opposite side as registered', () => {
    assert.equal(A.packetForYaw(0)?.id, 'front');
    assert.equal(A.packetForYaw(45)?.id, 'three-quarter-R');
    assert.equal(A.packetForYaw(90)?.id, 'profile-R');
    assert.equal(A.packetForYaw(180), null);
    assert.equal(A.packetForYaw(-90), null);
    assert.equal(A.packetForYaw(270), null);
});

test('Bending the forearm moves the wrist and not the shoulder', () => {
    const bent = R.withAngle(pose, 'forearm-R', 'z', -30);
    const p = A.ARM_PACKETS[0];
    const a = A.armChain(p, pose), b = A.armChain(p, bent);
    assert.equal(b.shoulder.x, a.shoulder.x);
    assert.ok(Math.hypot(b.wrist.x - a.wrist.x, b.wrist.y - a.wrist.y) > 8);
});

test('Arm weights stay normalized on the right-arm bones', () => {
    const audit = A.armWeightAudit();
    assert.equal(audit.invalid, 0);
    assert.equal(audit.normalized, true);
});

test('Catalog index identity is 230 / 190 / 20 and scripts are not executed', () => {
    const index = JSON.parse(fs.readFileSync(new URL('../../public/catalog/index.json', import.meta.url), 'utf8'));
    const parsed = C.parseCatalogIndex(index);
    assert.equal(parsed.entries.length, 230);
    assert.equal(parsed.assets, 190);
    assert.equal(parsed.groups, 20);
    const html = '<html><script>throw new Error("executed")</script><script id="catalog-data" type="application/json">' + JSON.stringify(index) + '</script></html>';
    const again = C.inspectCatalogHTML(html);
    assert.equal(again.entries.length, 230);
});

test('Clipped sources are blocked and old projects without packets stay unbound', async () => {
    assert.equal(C.bindingBlocked(['EDGE_CLIPPED']), true);
    assert.equal(C.bindingBlocked(['DETAIL_CROP']), false);
    const d = D.createProject('seed', 'src');
    const legacy = JSON.parse(JSON.stringify(d));
    delete legacy.catalog;
    delete legacy.armRegistration;
    const n = await D.validateProject(legacy, 'seed', 'src');
    assert.equal(n.catalog, null);
    assert.equal(n.armRegistration, null);
    const round = await D.validateProject(JSON.parse(JSON.stringify(d)), 'seed', 'src');
    assert.equal(round.armRegistration.packets.length, 3);
    assert.deepEqual(round.pose, d.pose);
});
