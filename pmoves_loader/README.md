# PMOVES Bootstrap Loader for Pinokio (pmoves_loader/)

The Pinokio-fork side of the Mavis multi-agent harness v0. A pure Node.js
loader for the `pmoves.bootstrap/v1` CGP that the PMOVES.AI side writes
(see `pmoves/contracts/schemas/pmoves-bootstrap/` in the PMOVES.AI repo).

## Why this exists

The harness v0 (PR #2477 in PMOVES.AI) is a 3-repo coordinated slice:

1. **PMOVES.AI** (this fork's upstream-of-upstream) — the writer, owns
   the CGP schema + example, the orchestrator, the BPM cron, and the
   canonical `load_bootstrap.py`.
2. **PMOVES-hermes-agent** (NousResearch Hermes fork) — the agent
   runtime, subscribes to `pmoves.agent.task.v1` and publishes to
   `pmoves.agent.result.v1`.
3. **PMOVES-pinokio** (this fork) — the app launcher. When a Pinokio
   app with `pmoves: true` in its `pinokio.yml` is launched, Pinokio
   reads the CGP and applies it to the launched process's env.

This fork's role is the lightest of the three: read the CGP once at
launch time, export `PMOVES_BOOTSTRAP_*` env vars, and let the launched
app read those env vars instead of re-parsing the CGP.

## What this slice ships

- `pmoves_loader/index.js` — the loader (pure Node.js, no deps)
- `pmoves_loader/cgp_schema/v1.schema.json` — vendored copy of the
  PMOVES.AI schema
- `pmoves_loader/cgp_schema/example.cgp.json` — vendored copy of the
  PMOVES.AI example (JSON form, not YAML — see "Why JSON only" below)
- `pmoves_apps/example-pmoves-app/pinokio.yml` — starter manifest
- `pmoves_apps/example-pmoves-app/install.js` — install-time wiring
- `pmoves_apps/example-pmoves-app/start.js` — start-time wiring
- `pmoves_loader/test_pmoves_loader.js` — 22 tests, run with
  `node --test pmoves_loader/test_pmoves_loader.js`

## Non-breaking contract

The CGP is a **manifest**, not a config replacement. The consumer fork
is required to honor the 6 constraints baked into the CGP:

| Constraint | What it means for Pinokio |
|------------|---------------------------|
| `no-override-existing-config` | Pinokio's own config (electron-store, pinokiod.kernel.store) is never replaced by the CGP |
| `tagged-services-are-advisory` | The `services` block (Tailscale, RustDesk, Hostinger, Cloudflare) is a hint — missing services are skipped, not failed |
| `no-chit-bypass` | State-changing actions still go through `pmoves-chit-sign` (the CHIT MCP), not directly through the CGP |
| `no-force-push` | Lane rule (this fork's PRs use `--force-with-lease` or rebase, never raw `--force`) |
| `no-ci-bypass` | Lane rule (no `--admin` to skip CI; admin merge override is OK for already-green PRs) |
| `preserve-existing-tools` | Pinokio's existing app launcher (the `pinokiod` npm package) is preserved as the engine; this loader is an additive helper |

The non-breaking test pair:

- **No CGP present** → `loadPmovesCGP()` returns the stub Bootstrap
  (empty tools, empty services, all 6 constraints). The app launches
  with `PMOVES_BOOTSTRAP_AGENT=unknown` and zero tagged services.
  Existing Pinokio behavior is unchanged.
- **CGP present** → `loadPmovesCGP()` validates against the vendored
  schema (structural check, see "Why JSON Schema and no ajv" below)
  and returns a typed Bootstrap with the real identity, tools, MCPs,
  services, routing, and constraints.

## Usage

### In a Pinokio app's `pinokio.yml`

```yaml
pmoves: true
install:
  method: shell
  shell: "node install.js"
start:
  method: shell
  shell: "node start.js"
```

The `pmoves: true` flag is a hint to the loader; the real wiring is
in `install.js` and `start.js` (see the example).

### In a Pinokio app's `install.js` / `start.js`

```js
const { loadPmovesCGP, applyCgpToEnv } = require('../pmoves_loader');

const bs = loadPmovesCGP();   // stub if no CGP, real Bootstrap if CGP found
applyCgpToEnv(bs);            // sets PMOVES_BOOTSTRAP_* on process.env
console.log(bs.agent);        // "minimax" (or "unknown" for the stub)
console.log(bs.role);         // "implementer" (or "operator" for the stub)
```

### From the shell

```bash
# Use the default example
node -e "console.log(require('./pmoves_loader').loadPmovesCGP().agent)"
# -> "minimax"

# Use a custom CGP file
PMOVES_BOOTSTRAP_CGP_PATH=/path/to/your.cgp.json node -e "console.log(require('./pmoves_loader').loadPmovesCGP().agent)"

# Use a raw JSON string
PMOVES_BOOTSTRAP_CGP='{"spec":"pmoves.bootstrap/v1",...}' node -e "..."
```

## Resolution order (4 sources, 1 default)

In priority order, the first one that yields a parseable CGP wins:

1. `opts.path` arg (file path)
2. `opts.source` arg (raw JSON string)
3. `PMOVES_BOOTSTRAP_CGP` env var (raw JSON) or `PMOVES_BOOTSTRAP_CGP_PATH` env var (file path)
4. The vendored example at `pmoves_loader/cgp_schema/example.cgp.json`

If none of the above yield a CGP, the stub Bootstrap is returned.

## Why JSON only (no YAML)

The PMOVES.AI side writes the canonical CGP in YAML (for human editing)
and also accepts YAML in `load_bootstrap.py`. The Pinokio fork side
intentionally accepts **JSON only**, for two reasons:

1. **No new npm dep.** YAML parsing would mean adding `js-yaml` (130KB
   minified + transitive deps) just for a manifest loader. The CGP is
   already JSON Schema, so the canonical machine format is JSON.
2. **Validation is direct.** The vendored `v1.schema.json` is the
   source of truth; we read it + validate the CGP with built-in
   `JSON.parse` and a thin structural checker. No parser quirks.

The flow:

- PMOVES.AI writes the canonical CGP in YAML for humans.
- The operator (or PMOVES.AI's loader) converts YAML→JSON once.
- The fork side reads JSON only.
- The example in this fork is the YAML example from PMOVES.AI,
  converted to JSON. Same content, machine format.

If you need to convert YAML→JSON yourself, the one-liner is:

```bash
python -c "import yaml, json, sys; print(json.dumps(yaml.safe_load(sys.stdin)))" < file.yaml > file.json
```

or with `js-yaml` (if you have it installed already):

```bash
js-yaml file.yaml > file.json
```

## Why JSON Schema and no ajv

The vendored `v1.schema.json` (Draft 2020-12) is the source of truth.
We don't pull `ajv` (a JSON Schema validator) into the Pinokio fork
for the same reason we don't pull `js-yaml`: it would add a heavy dep
for a thin helper.

Instead, the loader does a **thin structural check** that covers:

- All required top-level fields are present
- `spec` is exactly `"pmoves.bootstrap/v1"` (the const)
- `meta.created_at`, `meta.operator`, `meta.source` are non-empty strings
- `meta.source` is one of the 5 enum values
- `identity.agent` is a non-empty string
- `identity.role` is one of the 6 enum values
- `tools`, `mcps`, `constraints` are arrays
- `services`, `routing` are objects
- `super_nodes` is exactly `[]` (the bootstrap is metadata, not a data packet)

If the strict JSON Schema validation is needed (e.g. for CHIT-signed
CGPs in a future slice), the operator can install `ajv` and run the
validation externally; the loader would just pass through the CGP
unchanged. The schema is the contract; the loader's structural check
is the fast-path 80% case.

## Tests

```bash
node --test pmoves_loader/test_pmoves_loader.js
```

24 tests, 7 test groups (A through F + Internal helpers):

- A. LoadFromExampleTests (5)
- B. LoadFromSourceTests (4)
- C. ValidationFailureTests (5)
- D. StubFallbackTests (2)
- E. ExportEnvTests (3)
- F. TypedAccessorTests (3)
- Internal helpers (`_validateCgp`, `_parseCgp`) (2)

## What this slice does NOT do (intentional, follow-up)

- **Wiring into `main.js` / `minimal.js`** — the actual integration
  point in Pinokio's Electron lifecycle is a follow-up. v0 ships the
  loader + the example app; the operator (or a future slice) wires
  the loader into the Pinokio UI's app-launch path.
- **Real `pinokiod` package integration** — the `pinokiod` npm
  package (the real app launcher, version 8.0.40) is where the
  per-app `pinokio.yml` is interpreted. v0 ships the manifest format
  + the example app, but the actual `pinokiod` integration (making
  Pinokio interpret `pmoves: true` in `pinokio.yml`) is a future
  slice that touches the `pinokiod` package.
- **NATS subscriber** — the v0 PMOVES.AI side publishes to
  `pmoves.agent.task.v1` and waits on `pmoves.agent.result.v1`. The
  Pinokio fork is an app launcher, not an agent runtime, so it
  doesn't subscribe to those subjects in v0. The PMOVES-hermes-agent
  fork is the agent subscriber.

## Cross-fork plan

This is the Pinokio-side of the 3-repo Mavis harness v0 slice.
The other two PRs are:

1. `POWERFULMOVES/PMOVES.AI` PR #2477 — the writer (load_bootstrap.py
   + orchestrator.py + bpm_cron.py + 56/56 tests)
2. `POWERFULMOVES/PMOVES-hermes-agent` PR (this PR's companion) — the
   agent subscriber (bootstrap_loader.py + tools_bridge.py +
   subscriber.py + tests)

All three follow the same CGP schema (`pmoves.bootstrap/v1`); the
schema is the contract that ties the three forks together.

## License

Same as the upstream Pinokio fork (MIT, per LICENSE in repo root).
