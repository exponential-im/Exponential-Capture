const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    keywords,
    suggestPillars,
    projectsForPillars,
    pillarsAfterProjectChoice,
    applySuggestions,
    forgetPageSuggestions,
    personToggled,
} = require('../shared/pillar-capture.js');

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

describe('suggested Pillars for the open page', () => {
    test('ticks suggestions not already ticked or declined, remembering they were automatic', () => {
        assert.deepEqual(
            applySuggestions({ ticked: ['gtm'], auto: [], declined: ['health'], suggested: ['ops', 'gtm', 'health'] }),
            { ticked: ['gtm', 'ops'], auto: ['ops'] },
        );
    });

    test('moving to another page takes back only the automatic ticks', () => {
        assert.deepEqual(forgetPageSuggestions({ ticked: ['gtm', 'ops'], auto: ['ops'] }), { ticked: ['gtm'], auto: [] });
    });

    test('a click makes the chip the person\'s own; an untick is declined for this page', () => {
        const unticked = personToggled({ ticked: ['gtm', 'ops'], auto: ['ops'], declined: [] }, 'ops');
        assert.deepEqual(unticked, { ticked: ['gtm'], auto: [], declined: ['ops'] });
        // Declined: the same suggestion does not tick it again on this page.
        assert.deepEqual(applySuggestions({ ...unticked, suggested: ['ops'] }).ticked, ['gtm']);
    });

    test('a suggestion the person keeps by clicking it twice stays theirs across pages', () => {
        let state = { ticked: ['ops'], auto: ['ops'], declined: [] };
        state = personToggled(state, 'ops');            // untick
        state = personToggled(state, 'ops');            // tick again: now the person's
        assert.deepEqual(forgetPageSuggestions(state).ticked, ['ops']);
    });
});

describe('matching the page against Pillars, in the browser', () => {
    const ops = { id: 'ops', name: 'DevOps', description: 'Deploys, backups, monitoring and on-call for production infrastructure.' };
    const gtm = { id: 'gtm', name: 'Go-to-market', description: 'Pricing, launches, positioning, sales and marketing campaigns.' };
    const health = { id: 'health', name: 'Health', description: null };

    test('keywords drop short words, stopwords, URL noise and words with digits', () => {
        assert.deepEqual([...keywords('https://www.example.com/the-backups-are-running-v2-2026')], ['example', 'backup', 'runn']);
    });

    test('suggests a Pillar named in the text', () => {
        assert.deepEqual(suggestPillars([ops, gtm, health], 'Health check for the new gym routine'), ['health']);
    });

    test('suggests a Pillar sharing two keywords with its description', () => {
        assert.deepEqual(suggestPillars([ops, gtm], 'Postgres backups failing in production https://example.com/x'), ['ops']);
    });

    test('does not suggest on a single shared keyword, or for empty text', () => {
        assert.deepEqual(suggestPillars([ops, gtm], 'Production of the school play'), []);
        assert.deepEqual(suggestPillars([ops], '   '), []);
    });
});
