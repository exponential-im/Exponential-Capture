const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { cleanPageText, MAX_PAGE_TEXT_CHARS } = require('../shared/page-text.js');

// Enough distinct lines to clear the 200-character minimum.
const filler = Array.from({ length: 12 }, (_, i) => `Filler line number ${i} of the listing`).join('\n');

describe('cleanPageText', () => {
    test('trims lines and drops empty ones', () => {
        const text = cleanPageText(`  Villa in Lanzarote  \n\n\n   \n€1,240 total\n${filler}`);
        assert.equal(text.split('\n')[0], 'Villa in Lanzarote');
        assert.equal(text.split('\n')[1], '€1,240 total');
        assert.ok(!text.includes('\n\n'));
    });

    test('drops a line identical to the line before it', () => {
        const text = cleanPageText(`Rare find!\nRare find!\n\nRare find!\n${filler}`);
        assert.equal(text.split('\n').filter((l) => l === 'Rare find!').length, 1);
    });

    test('keeps a repeated line at most three times', () => {
        const repeated = Array.from({ length: 10 }, (_, i) => `Rare find!\nReview ${i}`).join('\n');
        const text = cleanPageText(`${repeated}\n${filler}`);
        assert.equal(text.split('\n').filter((l) => l === 'Rare find!').length, 3);
        assert.ok(text.includes('Review 9'));
    });

    test('is never longer than 100,000 characters', () => {
        const long = Array.from({ length: 20000 }, (_, i) => `Unique line ${i} with some words in it`).join('\n');
        assert.equal(cleanPageText(long).length, MAX_PAGE_TEXT_CHARS);
    });

    test('is undefined for a page with almost no text', () => {
        assert.equal(cleanPageText('Sign in\nContinue'), undefined);
        assert.equal(cleanPageText(''), undefined);
        assert.equal(cleanPageText(undefined), undefined);
        // Many lines that collapse to almost nothing.
        assert.equal(cleanPageText(Array(500).fill('Loading...').join('\n')), undefined);
    });
});
