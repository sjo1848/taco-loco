# Issue #93 isolated QA

These manual runners target only the guarded Worker for synthetic QA. They do not invoke Wrangler, change Worker traffic or provision resources. Before running, verify the approved QA version, the isolated D1 binding, the unauthenticated health rejection, the remaining budget and the rollback. Supply the QA credential files through the authorized local mechanism with mode 0600. Never commit their contents.

- `node probe.mjs <qa-orders.json>` compares independent connections with a shared pool. The input lists five existing synthetic QA order IDs and their current states. `--ready-remainder` checks two synthetic READY orders and verifies duplicate transitions are rejected.
- `node lot.mjs PICKUP 5 <fresh-reference-file>` runs one bounded lot. Use `DELIVERY` with the approved synthetic payment fixture. The runner records references before writes so the operator can inspect the ledger even on an interrupted response. It does not retry a failed mutation.
- `browser-reconcile.js` and `browser-board.js` are Playwright CLI snippets for the authenticated local, synthetic order fixture. They deliberately discard responses to verify reconciliation.

After each run, compare D1 before and after against the captured references. Stop on the first timeout, unexpected HTTP response or inconsistent ledger. Respect the rate limit before starting another lot. Never reuse these scripts against normal staging or production.
