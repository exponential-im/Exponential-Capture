// Injected into a tab (bundled by build.sh) so the side panel can capture what
// a saved page says. An article yields its body as HTML, which the server
// turns into markdown (exponential-app ADR-0072), so we only extract here. A
// page that is not an article yields its visible text instead (Page text).
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import pageText from './page-text.js';

globalThis.__expoExtractArticle = function () {
    const meta = (selector) => document.querySelector(selector)?.getAttribute('content') || undefined;
    let article = null;
    try {
        // Readability mutates the DOM it is given, so hand it a copy.
        article = new Readability(document.cloneNode(true)).parse();
    } catch (e) {
        console.warn('[Exponential] Readability failed:', e);
    }
    const readerable = isProbablyReaderable(document);
    const content = article?.content || undefined;
    return {
        readerable,
        title: article?.title || document.title || undefined,
        content,
        // Only for a page that is not an article; the side panel sends a body
        // or Page text, never both.
        pageText: !readerable || !content ? pageText.cleanPageText(document.body?.innerText) : undefined,
        // The URL the page declares for itself. The server uses it to match
        // the page against Resources already saved, and only when it names
        // the same host and path as the address visited.
        declaredUrl: document.querySelector('link[rel="canonical"]')?.href || meta('meta[property="og:url"]') || undefined,
        excerpt: article?.excerpt || meta('meta[name="description"]') || undefined,
        byline: article?.byline || meta('meta[name="author"]') || undefined,
        publishedTime: article?.publishedTime || meta('meta[property="article:published_time"]') || undefined,
    };
};
