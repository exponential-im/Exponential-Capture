const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { pageIdentity, savedAddress, isTrackingParam } = require('../shared/page-identity.js');

// The contract shared with the server, which matches saved pages by the same
// identity (`src/lib/resources/__tests__/identity.test.ts` in exponential-app).
// The first four rows are the table from ticket witty.otter; add a row there
// and add it here.
const IDENTITY_EXAMPLES = [
    {
        visited:
            'https://www.airbnb.com/rooms/53368445?adults=4&check_in=2027-01-25&check_out=2027-01-30&source_impression_id=p3_x',
        declared: 'https://www.airbnb.com/rooms/53368445',
        identity: 'https://www.airbnb.com/rooms/53368445',
    },
    {
        visited: 'https://www.google.com/travel/flights/search?tfs=ABC&utm_source=x',
        declared: 'https://www.google.com/travel/flights',
        identity: 'https://www.google.com/travel/flights/search?tfs=ABC',
    },
    {
        visited: 'https://Example.com/Article/?utm_campaign=a&b=2&a=1#section',
        declared: null,
        identity: 'https://example.com/Article?a=1&b=2',
    },
    {
        visited: 'https://shop.example.com/item/9?ref=home',
        declared: 'https://tracker.example.net/item/9',
        identity: 'https://shop.example.com/item/9?ref=home',
    },
];

describe('pageIdentity', () => {
    for (const { visited, declared, identity } of IDENTITY_EXAMPLES) {
        test(`${visited} → ${identity}`, () => {
            assert.equal(pageIdentity(visited, declared), identity);
        });
    }

    test('gives one identity to a listing opened with different dates, guests and tracking', () => {
        const declared = 'https://www.airbnb.com/rooms/53368445';
        const january = pageIdentity(
            'https://www.airbnb.com/rooms/53368445?adults=4&check_in=2027-01-25&check_out=2027-01-30',
            declared,
        );
        const march = pageIdentity(
            'https://www.airbnb.com/rooms/53368445?adults=2&check_in=2027-03-01&check_out=2027-03-05&utm_source=mail',
            declared,
        );
        assert.equal(march, january);
    });

    test('keeps two searches apart when the site declares one generic address for both', () => {
        const declared = 'https://www.google.com/travel/flights';
        const toLanzarote = pageIdentity('https://www.google.com/travel/flights/search?tfs=ACE', declared);
        const toMadeira = pageIdentity('https://www.google.com/travel/flights/search?tfs=FNC', declared);
        assert.notEqual(toLanzarote, toMadeira);
    });

    test('ignores a declared URL on another host or another path', () => {
        const visited = 'https://shop.example.com/item/9?size=m';
        assert.equal(pageIdentity(visited, 'https://other.example.com/item/9'), visited);
        assert.equal(pageIdentity(visited, 'https://shop.example.com/item'), visited);
        assert.equal(pageIdentity(visited, 'not a url'), visited);
        assert.equal(pageIdentity(visited, 'javascript:alert(1)'), visited);
    });

    test('accepts a declared URL that differs only by a leading www. or a trailing slash', () => {
        assert.equal(
            pageIdentity('https://example.com/post?ref=x', 'https://www.example.com/post/'),
            'https://www.example.com/post',
        );
        assert.equal(
            pageIdentity('https://www.example.com/post/?ref=x', 'https://example.com/post'),
            'https://example.com/post',
        );
    });

    test('does not depend on the order parameters arrive in, and keeps repeated names in order', () => {
        assert.equal(pageIdentity('https://example.com/s?b=2&a=1'), pageIdentity('https://example.com/s?a=1&b=2'));
        assert.equal(pageIdentity('https://example.com/s?tag=b&x=1&tag=a'), 'https://example.com/s?tag=b&tag=a&x=1');
    });

    test('keeps path case, the root slash and a port, and drops empty parameters', () => {
        assert.equal(pageIdentity('HTTPS://Example.COM:8443/Docs/Read?&a=1&'), 'https://example.com:8443/Docs/Read?a=1');
        assert.equal(pageIdentity('https://example.com'), 'https://example.com/');
        assert.equal(pageIdentity('https://example.com/?utm_source=x'), 'https://example.com/');
    });

    test('checks tracking on the name as written, with no percent-decoding', () => {
        // `utm%5Fsource` decodes to a tracking name but is not one as written.
        assert.equal(
            pageIdentity('https://example.com/p?utm%5Fsource=x&UTM_Medium=y'),
            'https://example.com/p?utm%5Fsource=x',
        );
    });

    test('is null for anything that is not a web address', () => {
        assert.equal(pageIdentity('chrome://extensions'), null);
        assert.equal(pageIdentity('file:///x'), null);
        assert.equal(pageIdentity('not a url'), null);
        assert.equal(pageIdentity(''), null);
        assert.equal(pageIdentity(undefined), null);
    });
});

describe('savedAddress', () => {
    test('removes tracking parameters and changes nothing else', () => {
        assert.equal(
            savedAddress(
                'https://www.airbnb.com/rooms/53368445?adults=4&check_in=2027-01-25&check_out=2027-01-30&source_impression_id=p3_x',
            ),
            'https://www.airbnb.com/rooms/53368445?adults=4&check_in=2027-01-25&check_out=2027-01-30',
        );
        assert.equal(
            savedAddress('https://Example.com/Article/?utm_campaign=a&b=2&a=1#section'),
            'https://Example.com/Article/?b=2&a=1#section',
        );
    });

    test('drops the question mark when only tracking parameters were there', () => {
        assert.equal(savedAddress('https://example.com/post?utm_source=x&fbclid=y#top'), 'https://example.com/post#top');
    });

    test('returns an address with nothing to remove exactly as it came', () => {
        const url = 'https://example.com/a/?federated_search_id=9&b=&&c';
        assert.equal(savedAddress(url), url);
        assert.equal(savedAddress('https://example.com/post'), 'https://example.com/post');
    });

    test('is null for anything that is not a web address', () => {
        assert.equal(savedAddress('chrome://extensions'), null);
        assert.equal(savedAddress('file:///x'), null);
        assert.equal(savedAddress('not a url'), null);
    });
});

describe('isTrackingParam', () => {
    test('knows the denylist, in any case', () => {
        for (const name of ['utm_source', 'UTM_Campaign', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid', 'source_impression_id']) {
            assert.equal(isTrackingParam(name), true, name);
        }
    });

    test('keeps everything else, because it may be meaningful', () => {
        for (const name of ['check_in', 'adults', 'ref', 'federated_search_id', 'utm', 'id', 'q']) {
            assert.equal(isTrackingParam(name), false, name);
        }
    });
});
