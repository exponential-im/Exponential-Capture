// Page text: the visible text of a page that has no Article body (a listing,
// a search, a dashboard), kept so search and Zoe can read what the page said
// on the day it was saved. It is never shown in the reader.
//
// Pure, with no DOM access: the extractor injected into the tab hands this the
// page's `innerText` (readability-extract.js bundles this file), and the tests
// load it with require().
(function () {
    // Must match MAX_PAGE_TEXT_CHARS in exponential-app's resource router.
    const MAX_PAGE_TEXT_CHARS = 100000;
    // Below this a page has nothing worth searching: save it as a bare link.
    const MIN_PAGE_TEXT_CHARS = 200;
    // A line may appear this many times. Repeated banners ("Rare find!") and
    // calendar grids would otherwise drown the text that says what the page is.
    const MAX_LINE_REPEATS = 3;

    function cleanPageText(rawText) {
        const seen = new Map();
        const lines = [];
        let previous = null;
        for (const rawLine of String(rawText || '').split('\n')) {
            const line = rawLine.trim();
            if (!line) continue;
            const isRepeatOfPrevious = line === previous;
            previous = line;
            if (isRepeatOfPrevious) continue;
            const count = seen.get(line) || 0;
            if (count >= MAX_LINE_REPEATS) continue;
            seen.set(line, count + 1);
            lines.push(line);
        }
        const text = lines.join('\n').slice(0, MAX_PAGE_TEXT_CHARS);
        return text.length < MIN_PAGE_TEXT_CHARS ? undefined : text;
    }

    const api = { cleanPageText, MAX_PAGE_TEXT_CHARS, MIN_PAGE_TEXT_CHARS, MAX_LINE_REPEATS };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else globalThis.ExpoPageText = api;
})();
