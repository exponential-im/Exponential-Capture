# Issue tracker: Exponential

Tickets and PRDs for this repo live in [Exponential](https://www.exponential.im). Use the `exponential` CLI for all operations. Add `--json` to any command to get machine-readable output.

Local task tracking during a session still uses beads (`bd`) — see `CLAUDE.md`. Exponential holds the product-level Tickets and Features.

## This repo's coordinates

These are the defaults every CLI command in this repo should target.

- **Workspace**: `exponential` (`cmv2lygf10001l506o0hxqoes`)
- **Product**: `exponential-plugin` (`cmwi3d9yl000nl308zgeycbzs`)
- (Optional) **Default feature**: _none_ — pass `--feature <cuid>` per-ticket as needed.

`--product exponential-plugin --workspace exponential` (or the CUID) should be passed on every command unless `exponential workspaces set-default exponential` has been run.

## Hierarchy

`workspace → product → feature → ticket`. Epics are workspace-scoped and can group tickets across products.

## Conventions

- **Create a ticket**: `exponential tickets create --product exponential-plugin --type <TYPE> --status <STATUS> -t "<title>" -b "<body>" [--feature <cuid>] --json`
- **Read a ticket**: `exponential tickets get <ticket-cuid> --json`
- **List tickets**: `exponential tickets list --product exponential-plugin [--status <STATUS>] [--type <TYPE>] --json`
- **Comment on a ticket**: `exponential tickets comment add --id <ticket-cuid> -m "<body>"`
- **Change a ticket's status**: `exponential tickets update --id <ticket-cuid> --status <STATUS>`

### Ticket types

`BUG`, `FEATURE`, `CHORE`, `IMPROVEMENT`, `SPIKE`, `RESEARCH`.

### Ticket statuses

`BACKLOG`, `NEEDS_REFINEMENT`, `READY_TO_PLAN`, `COMMITTED`, `IN_PROGRESS`, `BLOCKED`, `QA`, `DONE`, `DEPLOYED`, `ARCHIVED`.

`DONE` is shipped work; `ARCHIVED` is won't-fix.
