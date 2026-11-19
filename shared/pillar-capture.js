// Capture asks Workspace, then Pillars, then an optional Project
// (exponential-app ADR-0086). The pure rules of that picker, the same ones the
// app's CapturePlacement follows (src/app/_components/pillars/captureRules.ts).
//
// A project is the server's `project.getUserProjects` row:
//   { id, name, slug, pillarTagIds: string[] }   // active Pillars only
//
// A classic script on purpose: no imports and no DOM access, so the side
// panel loads it with a script tag and the tests load it with require().
(function () {
    // The projects to offer once Pillars are ticked: those under any ticked
    // Pillar. With none ticked, every project. A project from an older server
    // (no pillarTagIds) is under no Pillar.
    function projectsForPillars(projects, tickedIds) {
        if (!tickedIds || tickedIds.length === 0) return projects.slice();
        const ticked = new Set(tickedIds);
        return projects.filter(p => (p.pillarTagIds || []).some(id => ticked.has(id)));
    }

    // Choosing a project ticks its Pillars too, keeping what was already
    // ticked. Only Pillars the picker offers come along: a tick the person
    // cannot see could not be removed. Clearing the project changes nothing.
    function pillarsAfterProjectChoice(tickedIds, project, offeredIds) {
        const ticked = (tickedIds || []).slice();
        if (!project) return ticked;
        const offered = offeredIds ? new Set(offeredIds) : null;
        const fromProject = (project.pillarTagIds || []).filter(id => !offered || offered.has(id));
        return [...new Set([...ticked, ...fromProject])];
    }

    // Suggested Pillars for the open page (pillar.suggest). A suggestion ticks
    // a Pillar for the person to see and untick; it never files anything by
    // itself. `auto` is the Pillars ticked only because this page suggested
    // them; `declined` the suggestions the person unticked on this page, which
    // are not ticked again.
    function applySuggestions({ ticked, auto, declined, suggested }) {
        const nextTicked = (ticked || []).slice();
        const nextAuto = (auto || []).slice();
        const no = new Set(declined || []);
        for (const id of suggested || []) {
            if (nextTicked.includes(id) || no.has(id)) continue;
            nextTicked.push(id);
            nextAuto.push(id);
        }
        return { ticked: nextTicked, auto: nextAuto };
    }

    // Moving to another page takes back the ticks only the previous page's
    // suggestions made. Ticks the person made, or kept, stay.
    function forgetPageSuggestions({ ticked, auto }) {
        const fromPage = new Set(auto || []);
        return { ticked: (ticked || []).filter(id => !fromPage.has(id)), auto: [] };
    }

    // The person clicked a chip: it is theirs now, whichever way it went. An
    // untick of a page suggestion is remembered so it is not ticked again.
    function personToggled({ ticked, auto, declined }, id) {
        const wasTicked = (ticked || []).includes(id);
        const nextTicked = wasTicked ? ticked.filter(x => x !== id) : [...(ticked || []), id];
        const nextDeclined = (declined || []).slice();
        if (wasTicked && !nextDeclined.includes(id)) nextDeclined.push(id);
        return { ticked: nextTicked, auto: (auto || []).filter(x => x !== id), declined: nextDeclined };
    }

    // Which Pillars the open page probably belongs to: a keyword match of the
    // page's title and address against each Pillar's name and description,
    // run here in the browser on the Pillars already downloaded, so nothing
    // about the page leaves the browser before Save (docs/adr/0001). The same
    // rule as the app's suggestPillars (src/lib/pillars/suggestPillars.ts).
    const STOPWORDS = new Set([
        'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'our', 'your', 'you', 'are',
        'was', 'were', 'will', 'have', 'has', 'not', 'all', 'any', 'but', 'can', 'out', 'about',
        'what', 'when', 'where', 'which', 'who', 'how', 'why', 'its', "it's", 'they', 'them',
        'their', 'there', 'then', 'than', 'also', 'just', 'more', 'most', 'such', 'very', 'www',
        'http', 'https', 'com', 'org', 'net', 'html', 'good', 'looks', 'like', 'work',
    ]);

    // Lower-case word stems of three letters or more; stopwords and words with
    // digits (ids, dates, versions) dropped.
    function keywords(text) {
        const words = String(text || '')
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .split(/[^a-z0-9]+/)
            .filter(w => w.length >= 3 && !STOPWORDS.has(w) && !/[0-9]/.test(w))
            .map(w => w.replace(/(ing|ed|es|s)$/, ''))
            .filter(w => w.length >= 3);
        return new Set(words);
    }

    // Pillars to pre-tick for `text`, best first: a whole name in the text, or
    // two keywords shared with the name and description.
    function suggestPillars(pillars, text) {
        const words = keywords(text);
        if (words.size === 0) return [];
        const haystack = ` ${[...words].join(' ')} `;
        const scored = [];
        for (const pillar of pillars || []) {
            const nameWords = [...keywords(pillar.name)];
            const nameHit = nameWords.length > 0 && haystack.includes(` ${nameWords.join(' ')} `);
            const shared = [...keywords(`${pillar.name} ${pillar.description || ''}`)].filter(w => words.has(w)).length;
            if (nameHit || shared >= 2) scored.push({ id: pillar.id, score: (nameHit ? 10 : 0) + shared });
        }
        return scored.sort((a, b) => b.score - a.score).map(s => s.id);
    }

    const api = {
        keywords,
        suggestPillars,
        projectsForPillars,
        pillarsAfterProjectChoice,
        applySuggestions,
        forgetPageSuggestions,
        personToggled,
    };
    globalThis.ExpoPillarCapture = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
