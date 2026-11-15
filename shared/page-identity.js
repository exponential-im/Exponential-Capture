// A page's two addresses, computed in the browser (docs/adr/0001).
//
// - Its identity answers "is this page already saved?" and nothing else: the
//   URL the page declares for itself when that can be trusted, else the URL
//   visited, normalised so two visits to one page compare equal.
// - Its saved address is what a Resource's link opens: the URL visited with
//   tracking parameters removed and nothing else changed.
//
// This mirrors `src/lib/resources/identity.ts` in exponential-app, which is
// the rule the server matches by. The example table in
// `test/page-identity.test.js` is the contract between the two: change the
// rule there and this file and its tests change in the same sitting.
//
// A classic script on purpose: no imports and no DOM access, so the side
// panel loads it with a script tag and the tests load it with require().
(function () {
    const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid']);

    // A query parameter that says how the visitor arrived, not what the page
    // is. A short denylist: anything not on it is kept, because it may be
    // meaningful (dates, guests, a search). The name is compared as written,
    // lowercased, with no percent-decoding.
    function isTrackingParam(name) {
        const lower = String(name).toLowerCase();
        return lower.startsWith('utm_') || lower.endsWith('_impression_id') || TRACKING_PARAMS.has(lower);
    }

    // The name of one `name=value` piece of a query string, as written.
    function paramName(part) {
        const eq = part.indexOf('=');
        return eq === -1 ? part : part.slice(0, eq);
    }

    function parseWebUrl(url) {
        if (!url || typeof url !== 'string') return null;
        try {
            const parsed = new URL(url.trim());
            return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
        } catch (_) {
            return null;
        }
    }

    // The visited URL with tracking parameters removed and nothing else
    // changed (parameter order, fragment and case are kept). Null when the
    // URL is not a web address.
    function savedAddress(visitedUrl) {
        if (!parseWebUrl(visitedUrl)) return null;
        const url = visitedUrl.trim();
        const hashAt = url.indexOf('#');
        const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
        const hash = hashAt === -1 ? '' : url.slice(hashAt);
        const queryAt = beforeHash.indexOf('?');
        if (queryAt === -1) return url;

        const parts = beforeHash.slice(queryAt + 1).split('&');
        const kept = parts.filter((part) => !isTrackingParam(paramName(part)));
        if (kept.length === parts.length) return url;
        const query = kept.length > 0 ? `?${kept.join('&')}` : '';
        return `${beforeHash.slice(0, queryAt)}${query}${hash}`;
    }

    function withoutWww(host) {
        return host.startsWith('www.') ? host.slice(4) : host;
    }

    function withoutTrailingSlash(path) {
        return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    }

    // The identity of the page at `visitedUrl`, or null when it is not a web
    // address.
    //
    // The declared URL (`og:url` or a canonical link) is used only when it
    // names the same host as the visited URL, ignoring a leading `www.`, and
    // the same path, ignoring a trailing slash. That guard keeps two searches
    // apart on a site that declares one generic address for every search.
    //
    // The chosen URL is then normalised: scheme and host lowercased, fragment
    // dropped, a trailing slash dropped from a non-root path, tracking
    // parameters removed, empty parameters dropped, and the rest sorted by
    // name as written (repeated names keep their order). Path case is kept.
    function pageIdentity(visitedUrl, declaredUrl) {
        const visited = parseWebUrl(visitedUrl);
        if (!visited) return null;
        const declared = parseWebUrl(declaredUrl);
        const chosen =
            declared &&
            withoutWww(declared.host) === withoutWww(visited.host) &&
            withoutTrailingSlash(declared.pathname) === withoutTrailingSlash(visited.pathname)
                ? declared
                : visited;

        const params = chosen.search
            .slice(1)
            .split('&')
            .filter((part) => part !== '' && !isTrackingParam(paramName(part)))
            .map((part, index) => ({ part, index, name: paramName(part) }))
            .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.index - b.index))
            .map(({ part }) => part);
        const query = params.length > 0 ? `?${params.join('&')}` : '';

        return `${chosen.protocol}//${chosen.host}${withoutTrailingSlash(chosen.pathname)}${query}`;
    }

    const api = { pageIdentity, savedAddress, isTrackingParam };
    globalThis.ExpoPageIdentity = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
