# A page reaches the server only when it is saved

The Resources tab shows whether the page in front of you is already saved in Exponential. The
side panel stays open across tabs, so looking each page up on the server would send Exponential
the address of everything you visit while that tab is showing. Instead the extension downloads
the identities of the Resources you can see (your own, and those in Projects you can see) and
matches the current page against them in the browser. Nothing about a page leaves the browser
until you press Save, so the rule we can state to anyone using the extension is: Exponential only
learns about a page when you save it.

## Considered options

- **Look each page up on the server.** Simpler, and always current. Rejected: it turns an open
  side panel into a browsing log.

## Consequences

- The status line can be stale: a page a teammate filed a minute ago may still read "Not saved
  yet". The server enforces "once per Project" at save time and reports that the page is already
  there, so staleness costs a click and never a duplicate.
- The list is refreshed when the panel opens and after each save.
- Do not add a per-page lookup, analytics call or prefetch that sends the current tab's address
  anywhere before the user saves.
- The Track Time picker ("What's this for?") follows the tab within this rule
  (`ExpoTimerTarget.tabLookup`). It looks up a ticket or project page of the Exponential app the
  extension talks to on its own, because that server just served the page. A GitHub PR is looked
  up only when you click "Find this PR's ticket". No other page is sent. (2026-11-17)
- Suggested Pillars (exponential-app ADR-0086) are matched in the browser: the page's title and
  address are compared with the names and descriptions of the Pillars already downloaded with
  `pillar.list`. The app's `pillar.suggest` is never called with the open page. (2026-11-19)

Decided 2026-11-15. The Resource rules this relies on are in `exponential-app`: `CONTEXT.md`
("Resource", "Reading list", "Page text") and ADR-0082.
