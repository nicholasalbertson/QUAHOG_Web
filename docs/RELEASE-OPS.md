# Release ops (§17)

## Build targets (§17.1)

`stylized` / `earth` / `diagnostic` via Vite entries + `src/flags.ts`.

## Environments (§17.2)

| Env | Config |
|-----|--------|
| dev | `npm run dev`, URL flag overrides |
| staging | preview build + staging flags |
| prod | `npm run build`, flags locked |

## Versioning (§17.3)

Semver in `package.json`; changelog from conventional commits (`feat(§…)`).

## Error reporting (§17.4)

Sink via `src/telemetry/schema.ts`; scrub PII — no free-text user content.

## Analytics (§17.5)

Opt-in only; document in settings before enabling remote sink.

## Flag rollout (§17.6)

Canary: URL/dev flags → staging cohort → prod default in `flags.ts`.

## Rollback (§17.7)

Revert deploy + kill-switch flags for expensive subsystems.

## PWA / store (§17.8)

`manifest.webmanifest` + icons; store listing TBD when shipping native wrappers.
