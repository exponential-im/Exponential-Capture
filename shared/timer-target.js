// What the Track Time tab logs time against: one pick, a Ticket or a Project
// (exponential-app feature "Log timer time against Tickets"). Feature, Cycle
// and Goal are derived on the server and shown here as a read-only line,
// never chosen.
//
// A target is the server's `TimerTarget` shape, from `timeEntry.searchTargets`
// or `timeEntry.resolveTarget`:
//   { kind: 'ticket'|'project', id, title, label, status, context,
//     workspace: { id, slug }, url }
//
// A classic script on purpose: no imports and no DOM access, so the side
// panel loads it with a script tag and the tests load it with require().
(function () {
    // The `timeEntry.start` payload for a Play press. In order:
    //   1. an existing Action matched from the title autocomplete resumes it;
    //   2. a Ticket target logs on the person's timer Action for that Ticket,
    //      with the typed text as the entry's note (the server derives the
    //      workspace from the ticket's product);
    //   3. a Project target makes a new Action in that project, in the
    //      project's own workspace (a target resolved from a tab can live in
    //      another workspace than the one selected);
    //   4. otherwise a new Action in the selected workspace only.
    function buildStartPayload({ matchedAction, target, typedTitle, workspaceId }) {
        if (matchedAction && matchedAction.actionId) {
            return { actionId: matchedAction.actionId };
        }
        const title = (typedTitle || '').trim();
        if (target && target.kind === 'ticket') {
            return title ? { ticketId: target.id, typedTitle: title } : { ticketId: target.id };
        }
        if (target && target.kind === 'project') {
            return {
                typedTitle: title,
                projectId: target.id,
                workspaceId: (target.workspace && target.workspace.id) || workspaceId || null,
            };
        }
        return { typedTitle: title, projectId: null, workspaceId: workspaceId || null };
    }

    // The text a chosen target shows in the picker: "crisp.whale · Title" for
    // a ticket, the name for a project.
    function targetText(target) {
        if (!target) return '';
        return target.label ? `${target.label} · ${target.title}` : target.title;
    }

    // The read-only context line under the picker. A target from another
    // workspace says so, since Play will log there.
    function targetContext(target, selectedWorkspaceId) {
        if (!target) return '';
        const parts = [];
        if (target.context) parts.push(target.context);
        if (target.workspace && selectedWorkspaceId && target.workspace.id !== selectedWorkspaceId) {
            parts.push(`in ${target.workspace.slug}`);
        }
        return parts.join(' · ');
    }

    // The dropdown's rows: a header per non-empty group, then its targets.
    function pickerRows(result) {
        const rows = [];
        const tickets = (result && result.tickets) || [];
        const projects = (result && result.projects) || [];
        if (tickets.length) {
            rows.push({ type: 'header', text: 'Tickets' });
            tickets.forEach((t) => rows.push({ type: 'target', target: t }));
        }
        if (projects.length) {
            rows.push({ type: 'header', text: 'Projects' });
            projects.forEach((p) => rows.push({ type: 'target', target: p }));
        }
        return rows;
    }

    // A project target from the shared selector's cached project row, so the
    // picker can start on the project chosen there without a server call.
    function projectTarget(project, workspace) {
        if (!project || !project.id) return null;
        return {
            kind: 'project',
            id: project.id,
            title: project.name || 'Project',
            label: null,
            status: project.status || 'ACTIVE',
            context: null,
            workspace: workspace && workspace.id ? { id: workspace.id, slug: workspace.slug || '' } : null,
            url: null,
        };
    }

    // Whether a tab change may replace the current target. A choice the person
    // made by hand stays until they change it; a target that came from the
    // tab or from the shared project follows the tab.
    function tabMayReplace(source) {
        return source !== 'user';
    }

    // Whether, and how, the picker may look the current tab up on the server.
    // ADR 0001: an open side panel must not become a browsing log, so a page's
    // address leaves the browser only when the server already has it or the
    // person asks:
    //   'app'         — a ticket or project page of the Exponential app the
    //                   extension talks to (the server served that page);
    //                   looked up automatically.
    //   'pullRequest' — a GitHub PR; looked up only when the person clicks.
    //   null          — anything else; never sent.
    function tabLookup(rawUrl, appBaseURL) {
        let url;
        let app;
        try {
            url = new URL(rawUrl);
            app = new URL(appBaseURL);
        } catch (_) {
            return null;
        }
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
        if (url.origin === app.origin) {
            const segments = url.pathname.split('/').filter(Boolean);
            const isTicket = segments[0] === 'w' && segments[2] === 'products' && segments[4] === 'tickets'
                && segments[5] && segments[5] !== 'new';
            const isProject = segments[0] === 'w' && segments[2] === 'projects' && !!segments[3];
            return isTicket || isProject ? 'app' : null;
        }
        if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
            return /^\/[^/]+\/[^/]+\/pull\/\d+(\/|$)/.test(url.pathname) ? 'pullRequest' : null;
        }
        return null;
    }

    const api = { buildStartPayload, targetText, targetContext, pickerRows, projectTarget, tabMayReplace, tabLookup };
    globalThis.ExpoTimerTarget = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
