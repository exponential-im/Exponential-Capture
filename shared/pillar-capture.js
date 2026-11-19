// Capture asks Workspace, then Pillars, then an optional Project
// (exponential-app ADR-0085). The pure rules of that picker, the same ones the
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

    const api = {
        projectsForPillars,
        pillarsAfterProjectChoice,
        applySuggestions,
        forgetPageSuggestions,
        personToggled,
    };
    globalThis.ExpoPillarCapture = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
