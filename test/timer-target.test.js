const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    buildStartPayload,
    targetText,
    targetContext,
    pickerRows,
    projectTarget,
    tabMayReplace,
    tabLookup,
} = require('../shared/timer-target.js');

const WS = { id: 'ws-1', slug: 'exponential' };
const TICKET = {
    kind: 'ticket',
    id: 't1',
    title: 'Timer can start on a Ticket',
    label: 'crisp.whale',
    status: 'IN_PROGRESS',
    context: 'Log timer time against Tickets · Ship time tracking',
    workspace: WS,
    url: '/w/exponential/products/exponential/tickets/crisp.whale',
};
const PROJECT = {
    kind: 'project',
    id: 'p1',
    title: 'MVP development',
    label: null,
    status: 'ACTIVE',
    context: 'Grow revenue',
    workspace: { id: 'ws-2', slug: 'clear' },
    url: '/w/clear/projects/mvp',
};

describe('buildStartPayload', () => {
    test('a matched existing Action wins over any target', () => {
        assert.deepEqual(
            buildStartPayload({ matchedAction: { actionId: 'a1' }, target: TICKET, typedTitle: 'x', workspaceId: 'ws-1' }),
            { actionId: 'a1' },
        );
    });

    test('a ticket target sends ticketId, with the typed text as the note', () => {
        assert.deepEqual(
            buildStartPayload({ target: TICKET, typedTitle: '  wiring the picker ', workspaceId: 'ws-1' }),
            { ticketId: 't1', typedTitle: 'wiring the picker' },
        );
        // Never projectId or workspaceId with a ticket: the server refuses the mix.
        assert.deepEqual(buildStartPayload({ target: TICKET, typedTitle: '', workspaceId: 'ws-1' }), { ticketId: 't1' });
    });

    test("a project target logs in the project's own workspace", () => {
        assert.deepEqual(
            buildStartPayload({ target: PROJECT, typedTitle: 'Planning', workspaceId: 'ws-1' }),
            { typedTitle: 'Planning', projectId: 'p1', workspaceId: 'ws-2' },
        );
    });

    test('no target logs in the selected workspace only', () => {
        assert.deepEqual(
            buildStartPayload({ target: null, typedTitle: 'Inbox', workspaceId: 'ws-1' }),
            { typedTitle: 'Inbox', projectId: null, workspaceId: 'ws-1' },
        );
    });
});

describe('display', () => {
    test('a ticket reads as label · title, a project as its name', () => {
        assert.equal(targetText(TICKET), 'crisp.whale · Timer can start on a Ticket');
        assert.equal(targetText(PROJECT), 'MVP development');
        assert.equal(targetText(null), '');
    });

    test('the context line is derived, and names another workspace', () => {
        assert.equal(targetContext(TICKET, 'ws-1'), 'Log timer time against Tickets · Ship time tracking');
        assert.equal(targetContext(PROJECT, 'ws-1'), 'Grow revenue · in clear');
        assert.equal(targetContext({ ...PROJECT, context: null }, 'ws-2'), '');
    });
});

describe('pickerRows', () => {
    test('a header per non-empty group, tickets first', () => {
        assert.deepEqual(pickerRows({ tickets: [TICKET], projects: [PROJECT] }), [
            { type: 'header', text: 'Tickets' },
            { type: 'target', target: TICKET },
            { type: 'header', text: 'Projects' },
            { type: 'target', target: PROJECT },
        ]);
        assert.deepEqual(pickerRows({ tickets: [], projects: [PROJECT] }), [
            { type: 'header', text: 'Projects' },
            { type: 'target', target: PROJECT },
        ]);
        assert.deepEqual(pickerRows(null), []);
    });
});

describe('projectTarget', () => {
    test("builds a target from the shared selector's cached project", () => {
        assert.deepEqual(projectTarget({ id: 'p9', name: 'Website' }, WS), {
            kind: 'project',
            id: 'p9',
            title: 'Website',
            label: null,
            status: 'ACTIVE',
            context: null,
            workspace: WS,
            url: null,
        });
        assert.equal(projectTarget(null, WS), null);
    });
});

describe('tabMayReplace', () => {
    test("a hand-made choice sticks; the tab's own or the shared project's follows the tab", () => {
        assert.equal(tabMayReplace('user'), false);
        assert.equal(tabMayReplace('tab'), true);
        assert.equal(tabMayReplace('project'), true);
        assert.equal(tabMayReplace(null), true);
    });
});

describe('tabLookup (ADR 0001: no browsing log)', () => {
    const APP = 'https://www.exponential.im';
    test('an Exponential ticket or project page of the configured app is looked up', () => {
        assert.equal(tabLookup('https://www.exponential.im/w/exponential/products/exponential/tickets/crisp.whale', APP), 'app');
        assert.equal(tabLookup('https://www.exponential.im/w/clear/projects/mvp-cmlf3zmw40005l804w0eg28p4?tab=tasks', APP), 'app');
        assert.equal(tabLookup('http://localhost:3000/w/x/products/y/tickets/12', 'http://localhost:3000'), 'app');
    });
    test('other app pages, and the same path on another host, are not', () => {
        assert.equal(tabLookup('https://www.exponential.im/w/exponential/today', APP), null);
        assert.equal(tabLookup('https://www.exponential.im/w/exponential/products/exponential/tickets/new', APP), null);
        assert.equal(tabLookup('https://evil.example/w/exponential/products/exponential/tickets/1', APP), null);
    });
    test('a GitHub PR only on request; everything else never', () => {
        assert.equal(tabLookup('https://github.com/exponential-im/exponential/pull/1175/files', APP), 'pullRequest');
        assert.equal(tabLookup('https://github.com/exponential-im/exponential/issues/3', APP), null);
        assert.equal(tabLookup('https://news.ycombinator.com/', APP), null);
        assert.equal(tabLookup('chrome://extensions', APP), null);
        assert.equal(tabLookup('not a url', APP), null);
    });
});
