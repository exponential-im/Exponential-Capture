const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { projectsForPillars, pillarsAfterProjectChoice } = require('../shared/pillar-capture.js');

const railway = { id: 'railway', name: 'Railway move', pillarTagIds: ['ops'] };
const launch = { id: 'launch', name: 'Launch week', pillarTagIds: ['gtm'] };
const both = { id: 'both', name: 'Status page', pillarTagIds: ['ops', 'gtm'] };
const loose = { id: 'loose', name: 'Loose', pillarTagIds: [] };
const legacy = { id: 'legacy', name: 'From an older server' };

describe('projectsForPillars', () => {
    test('offers every project while no Pillar is ticked', () => {
        assert.deepEqual(projectsForPillars([railway, launch, loose], []), [railway, launch, loose]);
    });

    test('narrows to projects under any ticked Pillar', () => {
        assert.deepEqual(projectsForPillars([railway, launch, both, loose], ['ops']), [railway, both]);
        assert.deepEqual(projectsForPillars([railway, launch, both, loose], ['ops', 'gtm']), [railway, launch, both]);
    });

    test('treats a project without pillarTagIds as under no Pillar', () => {
        assert.deepEqual(projectsForPillars([legacy, railway], ['ops']), [railway]);
    });
});

describe('pillarsAfterProjectChoice', () => {
    test("ticks the chosen project's Pillars, keeping existing ticks once each", () => {
        assert.deepEqual(pillarsAfterProjectChoice(['gtm'], both), ['gtm', 'ops']);
    });

    test('brings along only Pillars the picker offers', () => {
        assert.deepEqual(pillarsAfterProjectChoice([], both, ['gtm']), ['gtm']);
    });

    test('changes nothing when the project is cleared', () => {
        assert.deepEqual(pillarsAfterProjectChoice(['gtm'], null), ['gtm']);
    });
});
