# Independent Critic — Taco Club P1a

Candidate: `fb4fbd4ac2d9dd25b07b98839fb7a7fdde2ffb7f`  
Deployment: `abd27dc9-c1b6-4b48-8314-b3fb54ad7916`  
Verdict: `REWORK`

- Nonce is required by the API schema and token verification; matching, missing and mismatched nonce tests pass. This is syntactic enforcement, not a server-side challenge store.
- Composite provider/subject uniqueness and conflict recovery are present. D1 aggregate evidence is 2 customers, 2 identities, 0 duplicate keys and 0 orphan customers.
- The deterministic fake-D1 race test passes, but real provider concurrency against D1 is not proven.
- Customer/admin cookie namespaces are separate and local isolation coverage passes; authenticated staging logout invalidation and cross-session isolation are not independently observed.
- Human same-account login/logout/relogin is recorded, but the available Codex browser is unauthenticated and aggregate counts do not prove raw Customer.id reuse across those logins.
- Guest/tracking smoke checks pass and no related routes changed; a full candidate-bound authenticated regression is not available.

`P1A_READY_FOR_INTEGRATION` is not justified.
