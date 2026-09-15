# TL-TC-ORDER-FLOW-01 — Stages B–D binding/queue rework

- Exact substantive candidate: `c0c172e4189f1a53e1cd3dd35e9c504d9810ad44`
- Rework from: `b8623fd6fee5d0496e665bb718b774b663b82e26`
- Production: `NOT_AUTHORIZED`; remote resources untouched.

Closed findings from the prior critic:

- D1 order INSERT bindings now follow the column order: fulfillment, verification, payment, refund, source, then order data.
- The D1 test captures and asserts the workflow binding values, delivery fee and transfer holder.
- Admin actions expose payment report/reject, pending closure, no-show and refund actions; closed orders still render exception actions.
- The admin board exposes separate `PENDING` and `OPERATING` queue filters.

Validation: 33 tests PASS, clean generated-cache-isolated typecheck PASS, changed-file lint PASS, and exact-candidate vinext build PASS. Independent Critic must review this exact rework before staging.
