# Taco Loco — staging catalog parity evidence

Classification: `STAGING_CATALOG_PARITY_PASS`  
Application candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`  
Repository: `sjo1848/taco-loco`  
Branch: `migration/cloudflare-native`  
Frozen catalog source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`  
Source artifact: `prisma/seed.ts`  
Staging Worker: `taco-loco-staging-20260913`  
Staging URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`  
Staging D1: `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`)

## Reconciliation safety

Before reconciliation staging contained one fixture category, one fixture product, one modifier group/option, three historical orders, five historical events and their associated lines. The historical orders/events were preserved. The fixture product was identified as noncanonical and was unpublished/archived rather than deleted. The existing staging admin identity/session setup was preserved.

Final D1 counts:

- Categories: 7 total, 7 active canonical.
- Products: 32 total; 31 canonical published products; 1 archived/unpublished historical fixture.
- Modifier groups: 3.
- Modifier options: 8 source-defined options; `Carne a elección` intentionally has no options because the frozen seed defines none.
- Product modifier associations: 4 canonical required associations; one historical association remains attached to the archived fixture.
- Orders: 4 total; historical orders/events preserved.
- Order lines: 7 total.
- Order events: 6 total.

## Deterministic source comparison

The comparison extracted category names, product tuples and modifier definitions directly from the frozen `prisma/seed.ts`, then compared them with ordered remote D1 query results.

Result:

```text
categories = 7
published canonical products = 31
modifier groups = 3
modifier options = 8
required canonical associations = 4
duplicate public canonical products = 0
missing = 0
mismatched = 0
```

Exact parity covered:

- category names and order;
- product IDs, names, descriptions, prices and global seed sort order;
- category association and published/archived state;
- Salsa options: Guacamole, Cheddar, Criolla, Picante, Roquefort;
- Daikiri options: Mango, Durazno, Frutilla;
- required associations for Taco x2 común, Uspallatina, Gordita mexicana and Daikiri.

No arbitrary image keys were added. The representative existing Static Asset `/products/taco-carne.jpg` remained available and returned `200 image/jpeg` with 21,160 bytes. Products without a proven mapping remain without an image.

## Public menu

The deployed `/menu` page rendered all seven sections and representative canonical products, including `Taco x2 común`, `Daikiri`, and `Gaseosa 1,5 L`. The representative Static Asset remained healthy. Missing images for products without a source-backed mapping were not treated as failures.

## Representative realistic order

Created one bounded public order using canonical products from multiple categories:

- Taco x2 común ×1, Salsa a elección → Guacamole, unit price `10000`;
- Nachos cheddar ×1, unit price `10000`;
- Gaseosa 1,5 L ×1, unit price `5000`;
- Daikiri ×1, Sabor de daikiri → Mango, unit price `7000`.

Remote result:

- order number `4`;
- subtotal/total `32000`;
- four persisted order lines;
- exact product names and price snapshots;
- exact modifier snapshots for Guacamole and Mango;
- creation event sequence `6`;
- exact retry returned `reused: true` for the same order ID/order number.

Admin order read returned `200` with the same lines, snapshots and total. Event replay after cursor `5` returned event `6` in order. Login, authenticated session lookup, logout and post-logout `401` remained healthy. Health returned `200`.

## Final conclusion

The existing staging environment now exposes the established 7-category / 31-product catalog with zero material source mismatches and no unintended duplicate public canonical products. The realistic multi-category order and modifier journey passed. No application source/configuration changed; the application candidate remains `6eccc3a`.

Production remains `NOT_AUTHORIZED`. The next step is a separate production-eligibility Human Gate after this staging result, not a production deployment.
