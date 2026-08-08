// pmoves_loader/index.js
//
// PMOVES bootstrap CGP loader for the PMOVES-pinokio fork. Pure Node.js,
// no external dependencies (JSON.parse + fs only). Reads a
// pmoves.bootstrap/v1 CGP from file / env / default, validates it
// structurally (the vendored v1.schema.json is the source of truth, but
// we don't require an ajv dep at this fork), and exports a typed
// Bootstrap object. Also exports the relevant fields as PMOVES_BOOTSTRAP_*
// env vars so downstream code can read them without re-parsing the CGP.
//
// Non-breaking design: loadPmovesCGP() always returns a Bootstrap. When
// the CGP is absent or invalid, the stub Bootstrap has safe defaults
// (empty services, empty tools, all 6 constraints). The fork's native
// behavior is unchanged - pmoves: true in pinokio.yml opts in.
//
// CGP profile: pmoves.bootstrap/v1
// Canonical spec: pmoves/docs/PMOVESCHIT/CGP_v1.0_SPECIFICATION.md
// (PMOVES.AI side, in the PMOVES.AI repo).
//
// Schema: pmoves_loader/cgp_schema/v1.schema.json (vendored)
// Example: pmoves_loader/cgp_schema/example.cgp.json (vendored)

const fs = require('fs');
const path = require('path');

const PROFILE = 'pmoves.bootstrap/v1';
const SCHEMA_PATH = path.join(__dirname, 'cgp_schema', 'v1.schema.json');
const EXAMPLE_PATH = path.join(__dirname, 'cgp_schema', 'example.cgp.json');

const REQUIRED_TOP_KEYS = [
  'spec', 'meta', 'identity', 'tools', 'mcps', 'services', 'routing', 'constraints',
];

const VALID_ROLES = ['implementer', 'critic', 'renderer', 'curator', 'operator', 'dispatcher'];
const VALID_SOURCES = ['mavis', 'hermes', 'pinokio', 'operator', 'test'];
const VALID_CONSTRAINTS = [
  'no-override-existing-config',
  'tagged-services-are-advisory',
  'no-chit-bypass',
  'no-force-push',
  'no-ci-bypass',
  'preserve-existing-tools',
];

class BootstrapError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'BootstrapError';
    if (cause) this.cause = cause;
  }
}

// --- Internal helpers ---------------------------------------------------------

function readStdin() {
  // Reserved for future use. CGP can be passed as a raw string via the
  // 'source' arg or via PMOVES_BOOTSTRAP_CGP env var. The shell form
  // `echo "$CGP" | node ...` is intentionally not supported in v0
  // because the test pair only needs the 4 sources below.
  return null;
}

function readFromPath(filePath) {
  if (!filePath) return null;
  if (!fs.existsSync(filePath)) {
    throw new BootstrapError(`CGP file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return { raw, source: 'path:' + filePath };
}

function readFromSource(source) {
  if (!source) return null;
  return { raw: source, source: 'raw' };
}

function readFromEnv() {
  // First, the in-memory string form (PMOVES_BOOTSTRAP_CGP) takes priority
  // over the path form (PMOVES_BOOTSTRAP_CGP_PATH). This mirrors the
  // PMOVES.AI side resolution order.
  if (process.env.PMOVES_BOOTSTRAP_CGP) {
    return { raw: process.env.PMOVES_BOOTSTRAP_CGP, source: 'env:PMOVES_BOOTSTRAP_CGP' };
  }
  if (process.env.PMOVES_BOOTSTRAP_CGP_PATH) {
    return readFromPath(process.env.PMOVES_BOOTSTRAP_CGP_PATH);
  }
  return null;
}

function readDefault() {
  if (fs.existsSync(EXAMPLE_PATH)) {
    return readFromPath(EXAMPLE_PATH);
  }
  return null;
}

function parseCgp(raw) {
  if (typeof raw !== 'string') {
    throw new BootstrapError('CGP must be a string');
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new BootstrapError('CGP is not valid JSON: ' + err.message, err);
  }
  return parsed;
}

// Structural validation. The vendored v1.schema.json is the source of
// truth, but we don't pull ajv into the Pinokio fork. This checker
// covers the required fields + the const spec + the enum values. It's
// the same "thin structural fallback" pattern the PMOVES.AI side uses.
function validateCgp(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new BootstrapError('CGP must be a JSON object');
  }
  // Spec check runs first - if the spec is wrong, the producer has
  // bigger problems than missing fields (the CGP is for a different
  // profile entirely), so we surface that error before complaining
  // about the rest of the structure.
  if (obj.spec !== PROFILE) {
    throw new BootstrapError(
      `CGP spec must be "${PROFILE}", got ${JSON.stringify(obj.spec)}`,
    );
  }
  for (const key of REQUIRED_TOP_KEYS) {
    if (!(key in obj)) {
      throw new BootstrapError(`CGP missing required top-level field: ${key}`);
    }
  }
  if (!obj.meta || typeof obj.meta !== 'object') {
    throw new BootstrapError('CGP meta must be an object');
  }
  for (const mk of ['created_at', 'operator', 'source']) {
    if (!obj.meta[mk] || typeof obj.meta[mk] !== 'string') {
      throw new BootstrapError(`CGP meta.${mk} must be a non-empty string`);
    }
  }
  if (!VALID_SOURCES.includes(obj.meta.source)) {
    throw new BootstrapError(
      `CGP meta.source must be one of ${VALID_SOURCES.join(', ')}, got ${JSON.stringify(obj.meta.source)}`,
    );
  }
  if (!obj.identity || typeof obj.identity !== 'object') {
    throw new BootstrapError('CGP identity must be an object');
  }
  if (!obj.identity.agent || typeof obj.identity.agent !== 'string') {
    throw new BootstrapError('CGP identity.agent must be a non-empty string');
  }
  if (!VALID_ROLES.includes(obj.identity.role)) {
    throw new BootstrapError(
      `CGP identity.role must be one of ${VALID_ROLES.join(', ')}, got ${JSON.stringify(obj.identity.role)}`,
    );
  }
  if (!Array.isArray(obj.tools)) {
    throw new BootstrapError('CGP tools must be an array');
  }
  if (!Array.isArray(obj.mcps)) {
    throw new BootstrapError('CGP mcps must be an array');
  }
  if (!obj.services || typeof obj.services !== 'object') {
    throw new BootstrapError('CGP services must be an object');
  }
  if (!obj.routing || typeof obj.routing !== 'object') {
    throw new BootstrapError('CGP routing must be an object');
  }
  if (!Array.isArray(obj.constraints)) {
    throw new BootstrapError('CGP constraints must be an array');
  }
  for (const c of obj.constraints) {
    if (typeof c !== 'string' || !VALID_CONSTRAINTS.includes(c)) {
      // Open set: the schema says "the set is open - new constraints can
      // be added in minor versions". We log unknown values but don't
      // reject them. The schema validator (ajv on the PMOVES.AI side)
      // is the source of truth for strictness.
      if (typeof c !== 'string') {
        throw new BootstrapError('CGP constraints entries must be strings');
      }
    }
  }
  if (!('super_nodes' in obj)) {
    throw new BootstrapError('CGP must include super_nodes (use [] for the empty-geometry case)');
  }
  if (!Array.isArray(obj.super_nodes) || obj.super_nodes.length !== 0) {
    throw new BootstrapError('CGP super_nodes must be an empty array (the bootstrap is metadata, not a data packet)');
  }
  return true;
}

// --- Bootstrap object (typed accessor facade) --------------------------------

class Bootstrap {
  constructor(obj, source) {
    this._raw = obj;
    this._source = source;
  }

  get spec() { return this._raw.spec; }
  get meta() { return this._raw.meta; }
  get identity() { return this._raw.identity; }
  get agent() { return this._raw.identity.agent; }
  get role() { return this._raw.identity.role; }
  get skin() { return this._raw.identity.skin; }
  get tools() { return [...this._raw.tools]; }
  get mcps() { return [...this._raw.mcps]; }
  get services() { return this._raw.services; }
  get routing() { return this._raw.routing; }
  get constraints() { return [...this._raw.constraints]; }
  get super_nodes() { return [...this._raw.super_nodes]; }
  get source() { return this._source; }

  hasTool(toolId) {
    return this._raw.tools.includes(toolId);
  }

  hasMcp(mcpId) {
    return this._raw.mcps.includes(mcpId);
  }

  hasConstraint(constraintId) {
    return this._raw.constraints.includes(constraintId);
  }

  servicePath(name) {
    return this._raw.services[name] || null;
  }

  routingTarget(agent) {
    const entry = this._raw.routing[agent];
    if (!entry) return null;
    return {
      node: entry.node || null,
      target: entry.target || null,
      nats_subject: entry.nats_subject || 'pmoves.agent.task.v1',
    };
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this._raw));
  }
}

// --- Stub bootstrap (for the no-CGP path) ------------------------------------

function stubBootstrap() {
  return new Bootstrap(
    {
      spec: PROFILE,
      meta: {
        created_at: '1970-01-01T00:00:00+00:00',
        operator: 'unknown',
        source: 'pinokio',
        encoder_version: '0.0.0',
      },
      identity: {
        agent: 'unknown',
        role: 'operator',
        skin: 'default',
      },
      tools: [],
      mcps: [],
      services: {
        tailscale: null,
        rustdesk: { devices: [] },
        hostinger: { site: null, status: 'offline' },
        cloudflare: { account: null, zones: [] },
      },
      routing: {},
      constraints: VALID_CONSTRAINTS.slice(),
      super_nodes: [],
    },
    'stub:no-cgp',
  );
}

// --- Public API --------------------------------------------------------------

/**
 * Load a pmoves.bootstrap/v1 CGP from one of 4 sources (in priority order):
 *   1. opts.path      - file path (YAML not supported in v0; convert to JSON first)
 *   2. opts.source    - raw JSON string
 *   3. PMOVES_BOOTSTRAP_CGP env var (raw JSON) / PMOVES_BOOTSTRAP_CGP_PATH env var (file path)
 *   4. default example at pmoves_loader/cgp_schema/example.cgp.json
 *
 * Returns a Bootstrap. If no CGP can be found anywhere, returns the stub
 * Bootstrap (tagged-services-are-advisory + preserve-existing-tools
 * constraints satisfied, but everything else empty). Throws BootstrapError
 * only on parse/validation failures of a provided CGP.
 */
function loadPmovesCGP(opts = {}) {
  const sources = [
    () => readFromPath(opts.path),
    () => readFromSource(opts.source),
    () => readFromEnv(),
    () => readDefault(),
  ];
  let lastErr = null;
  for (const trySource of sources) {
    let result;
    try {
      result = trySource();
    } catch (err) {
      lastErr = err;
      // A provided source is not optional. If the user passed
      // opts.path (the file is missing) or opts.source (the raw
      // string failed to parse), surface the error immediately
      // rather than silently falling through to a lower-priority
      // source. The verifier's #1 finding: this used to apply only
      // to parse/validate failures, not to the "file not found" case.
      if (opts.path || opts.source) {
        throw err;
      }
      continue;
    }
    if (!result) continue;
    try {
      const obj = parseCgp(result.raw);
      validateCgp(obj);
      return new Bootstrap(obj, result.source);
    } catch (err) {
      lastErr = err;
      // A provided source is not optional: if the user passed
      // opts.path or opts.source, surface the parse/validation error
      // rather than silently falling through to a lower-priority
      // source. The PMOVES.AI side has the same behavior.
      if (opts.path || opts.source) {
        throw new BootstrapError(
          `CGP from ${result.source} failed to parse/validate: ${err.message}`,
          err,
        );
      }
    }
  }
  if (lastErr && (opts.path || opts.source)) {
    throw lastErr;
  }
  return stubBootstrap();
}

/**
 * Apply the Bootstrap to the current process's env. Sets the same
 * PMOVES_BOOTSTRAP_* env vars the PMOVES.AI side exports, so a Pinokio
 * app launcher that wants PMOVES services available can read them via
 * process.env without re-parsing the CGP. Idempotent.
 */
function applyCgpToEnv(bs, env = process.env) {
  if (!(bs instanceof Bootstrap)) {
    throw new BootstrapError('applyCgpToEnv: not a Bootstrap');
  }
  env.PMOVES_BOOTSTRAP_AGENT = bs.agent;
  env.PMOVES_BOOTSTRAP_ROLE = bs.role;
  env.PMOVES_BOOTSTRAP_SKIN = bs.skin || '';
  env.PMOVES_BOOTSTRAP_TOOLS = bs.tools.join(',');
  env.PMOVES_BOOTSTRAP_MCPS = bs.mcps.join(',');
  env.PMOVES_BOOTSTRAP_CONSTRAINTS = bs.constraints.join(',');

  const tailscale = bs.servicePath('tailscale');
  if (tailscale) {
    if (tailscale.host) env.PMOVES_BOOTSTRAP_TAILSCALE_HOST = tailscale.host;
    if (tailscale.ip) env.PMOVES_BOOTSTRAP_TAILSCALE_IP = tailscale.ip;
  }
  const rustdesk = bs.servicePath('rustdesk');
  if (rustdesk && Array.isArray(rustdesk.devices) && rustdesk.devices.length > 0) {
    env.PMOVES_BOOTSTRAP_RUSTDESK_DEVICES = rustdesk.devices.join(',');
  }
  const hostinger = bs.servicePath('hostinger');
  if (hostinger) {
    if (hostinger.site) env.PMOVES_BOOTSTRAP_HOSTINGER_SITE = hostinger.site;
    if (hostinger.status) env.PMOVES_BOOTSTRAP_HOSTINGER_STATUS = hostinger.status;
  }
  const cloudflare = bs.servicePath('cloudflare');
  if (cloudflare) {
    if (cloudflare.account) env.PMOVES_BOOTSTRAP_CLOUDFLARE_ACCOUNT = cloudflare.account;
    if (Array.isArray(cloudflare.zones) && cloudflare.zones.length > 0) {
      env.PMOVES_BOOTSTRAP_CLOUDFLARE_ZONES = cloudflare.zones.join(',');
    }
  }

  const kiloclaw = bs.routingTarget('kiloclaw');
  if (kiloclaw) env.PMOVES_BOOTSTRAP_TARGET_KILOCLAW = kiloclaw.target || '';
  const hermes = bs.routingTarget('hermes');
  if (hermes) env.PMOVES_BOOTSTRAP_TARGET_HERMES = hermes.target || '';

  return env;
}

/**
 * Convenience: load the CGP and apply to env in one call. Returns the
 * Bootstrap either way.
 */
function bootstrapAndApply(opts = {}) {
  const bs = loadPmovesCGP(opts);
  applyCgpToEnv(bs);
  return bs;
}

module.exports = {
  PROFILE,
  SCHEMA_PATH,
  EXAMPLE_PATH,
  Bootstrap,
  BootstrapError,
  loadPmovesCGP,
  applyCgpToEnv,
  bootstrapAndApply,
  stubBootstrap,
  // Exposed for tests:
  _validateCgp: validateCgp,
  _parseCgp: parseCgp,
  _readStdin: readStdin,
};
