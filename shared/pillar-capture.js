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

    const api = { projectsForPillars, pillarsAfterProjectChoice };
    globalThis.ExpoPillarCapture = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
