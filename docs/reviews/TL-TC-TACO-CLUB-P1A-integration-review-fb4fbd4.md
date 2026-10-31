# Integration Review — Taco Club P1a

Candidate: `fb4fbd4ac2d9dd25b07b98839fb7a7fdde2ffb7f`  
Deployment: `abd27dc9-c1b6-4b48-8314-b3fb54ad7916`  
Verdict: `HUMAN_GATE`

- Exact staging deployment is active at 100% with the expected Worker/D1/GIS configuration.
- Health, menu, account route and guest/tracking surfaces respond; anonymous customer session is 401; admin/customer namespaces remain distinct.
- D1 aggregate is 2 Customer, 2 CustomerIdentity, 4 CustomerSession, 0 duplicate identity keys and 0 orphan customers.
- Authenticated customer cookie/session, logout invalidation, repeat login and authenticated admin/customer isolation were not independently reproducible in the available browser context.
- Real D1 provider concurrency is not proven; the local deterministic race harness is bounded but not equivalent.

The human report is retained as `HUMAN_REPORTED`, not upgraded to independent provider evidence. No contract defect observed. P1a remains below integration-ready status.
