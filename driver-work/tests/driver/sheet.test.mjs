import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    packetForYaw,
    armChain,
    armWeightAudit,
    armOwnsOnly,
    ARM_PACKETS,
    lifePhase,
} from '../../public/driver-foundation/modules/driver/arm-views.js';
import {
    parseCatalogIndex,
    inspectCatalogHTML,
    bindingBlocked,
} from '../../public/driver-foundation/modules/driver/catalog.js';
import { createProject, validateProject } from '../../public/driver-foundation/modules/driver/document.js';
import { neutralDriver, withAngle, provisionalRig } from '../../public/driver-foundation/modules/driver/driver.js';

const ARM_IDS = ['clavicle-R', 'upper-R', 'forearm-R', 'hand-R'];
const rig = provisionalRig();
const neutral = neutralDriver(rig);

function near(a, b, eps = 0.01) {
    assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);
}

test('packetForYaw selects front, three-quarter, and profile only — no mirror', () => {
    assert.equal(packetForYaw(0)?.id, 'front');
    assert.equal(packetForYaw(45)?.id, 'three-quarter-R');
    assert.equal(packetForYaw(90)?.id, 'profile-R');
    assert.equal(packetForYaw(180), null);
    assert.equal(packetForYaw(-90), null);
});

test('neutral armChain elbow and wrist match packet landmarks', () => {
    for (const packet of ARM_PACKETS) {
        const chain = armChain(packet, neutral);
        near(chain.elbow.x, packet.elbow.x);
        near(chain.elbow.y, packet.elbow.y);
        near(chain.wrist.x, packet.wrist.x);
        near(chain.wrist.y, packet.wrist.y);
    }
});

test('forearm-R z -30 moves the wrist and leaves the shoulder fixed', () => {
    const bent = withAngle(neutral, 'forearm-R', 'z', -30);
    for (const packet of ARM_PACKETS) {
        const rest = armChain(packet, neutral);
        const posed = armChain(packet, bent);
        assert.equal(posed.shoulder.x, rest.shoulder.x);
        assert.equal(posed.shoulder.y, rest.shoulder.y);
        assert.equal(posed.elbow.x, rest.elbow.x);
        assert.equal(posed.elbow.y, rest.elbow.y);
        assert.ok(Math.hypot(posed.wrist.x - rest.wrist.x, posed.wrist.y - rest.wrist.y) > 8);
    }
});

test('arm weight audit is normalized and ownership is only the right arm', () => {
    const audit = armWeightAudit();
    assert.equal(audit.normalized, true);
    assert.equal(audit.invalid, 0);
    const influences = audit.influences ?? audit.bones;
    if (influences) {
        assert.deepEqual([...influences], ARM_IDS);
        for (const id of ['thorax', 'pelvis', 'upper-L'])
            assert.equal(influences.includes(id), false);
    }
    const owns = armOwnsOnly();
    assert.deepEqual(owns, ARM_IDS);
    for (const id of ['thorax', 'pelvis', 'upper-L'])
        assert.equal(owns.includes(id), false);
    for (const packet of ARM_PACKETS)
        assert.deepEqual([...packet.bones], ARM_IDS);
});

test('lifePhase returns blink, mouth, and hair; blink is closed at t=0', () => {
    const life = lifePhase(0);
    assert.equal(typeof life.blink, 'number');
    assert.equal(typeof life.mouth, 'number');
    assert.equal(typeof life.hair, 'number');
    assert.ok(Number.isFinite(life.blink) && Number.isFinite(life.mouth) && Number.isFinite(life.hair));
    assert.equal(life.blink, 0);
});

test('catalog HTML is parsed inertly and keeps the 230-entry index', () => {
    const json = fs.readFileSync('/workspace/driver-work/public/catalog/index.json', 'utf8');
    const index = JSON.parse(json);
    const parsed = parseCatalogIndex(index);
    assert.equal(parsed.entries.length, 230);
    assert.equal(parsed.assets, 190);
    assert.equal(parsed.groups, 20);
    const html = `<html><script>throw new Error('executed')</script><script id="catalog-data" type="application/json">${json}</script></html>`;
    let inspected;
    try {
        inspected = inspectCatalogHTML(html);
    }
    catch (err) {
        assert.notEqual(String(err && err.message), 'executed');
        throw err;
    }
    assert.equal(inspected.entries.length, 230);
});

test('EDGE_CLIPPED blocks binding and an empty flag list does not', () => {
    assert.equal(bindingBlocked(['EDGE_CLIPPED']), true);
    assert.equal(bindingBlocked([]), false);
});

test('project round-trips arm registration without changing pose; legacy keys restore null', async () => {
    const project = createProject('seed', 'src');
    const poseBefore = structuredClone(project.pose);
    const round = await validateProject(structuredClone(project), 'seed', 'src');
    assert.equal(round.armRegistration.packets.length, 3);
    assert.deepEqual(round.armRegistration.packets.map(p => p.id), ['front', 'three-quarter-R', 'profile-R']);
    assert.deepEqual(round.pose, project.pose);
    assert.deepEqual(project.pose, poseBefore);

    const legacy = structuredClone(project);
    delete legacy.catalog;
    delete legacy.armRegistration;
    const restored = await validateProject(legacy, 'seed', 'src');
    assert.equal(restored.catalog, null);
    assert.equal(restored.armRegistration, null);
    assert.deepEqual(restored.pose, project.pose);
});
