<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## AI implementation and CI

- Keep changes focused; do not weaken tests, lint/security rules, type checks, Knip, or bundle budgets to make CI pass.
- Knip covers the npm application and its scripts; Supabase Edge Functions use Deno's separate `npm:` import resolution and are checked by the existing security scans.
- After implementation, run the relevant local checks (`npm ci`, lint, typecheck, tests, Knip, dependency-cruiser, Pages build, and bundle check) before committing and pushing.
- After pushing, use `gh run watch --exit-status` when GitHub CLI is available. On failure, collect `gh run view --log-failed`, fix the underlying code or configuration cause, and repeat local checks → commit/push → CI verification.
- Limit automated repair cycles to three. If still failing, stop and report the failed check, error, likely cause, attempted fixes, and the decision needed from a human. Never suppress a finding or remove required code just to get a green check.
