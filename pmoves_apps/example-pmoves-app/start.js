// pmoves_apps/example-pmoves-app/start.js
//
// The "start" phase of the example PMOVES-tagged Pinokio app.
// Loads the PMOVES bootstrap CGP, applies it to env, then runs a
// 1-second "alive" loop that logs the BPM/agent context so the
// operator can verify the CGP is wired through end-to-end.
//
// Run standalone: `node start.js`
//   - No CGP present      -> exits 0 after 1 log line (stub bootstrap)
//   - CGP present         -> exits 0 after 1 log line (real bootstrap)
//
// In a real Pinokio app, the start script would launch the actual
// service (a web server, a worker, a daemon, etc.). This example
// just demonstrates the wiring.

const path = require('path');
const {
  loadPmovesCGP,
  applyCgpToEnv,
} = require(path.resolve(__dirname, '..', '..', 'pmoves_loader'));

function main() {
  const bs = loadPmovesCGP();
  applyCgpToEnv(bs);

  const tailscale = bs.servicePath('tailscale');
  const rustdesk = bs.servicePath('rustdesk');
  const kiloclaw = bs.routingTarget('kiloclaw');
  const hermes = bs.routingTarget('hermes');

  console.log(`[pmoves:start] agent=${bs.agent} role=${bs.role} source=${bs.source}`);
  console.log(`[pmoves:start] routing.kiloclaw=${kiloclaw ? `${kiloclaw.target}@${kiloclaw.node}` : 'unset'}`);
  console.log(`[pmoves:start] routing.hermes=${hermes ? `${hermes.target}@${hermes.node}` : 'unset'}`);
  console.log(`[pmoves:start] services.tailscale.host=${tailscale ? tailscale.host : 'unset'}`);
  console.log(`[pmoves:start] services.rustdesk.devices=${rustdesk && Array.isArray(rustdesk.devices) ? rustdesk.devices.length : 0}`);
  console.log(`[pmoves:start] env: PMOVES_BOOTSTRAP_AGENT=${process.env.PMOVES_BOOTSTRAP_AGENT}`);
  console.log(`[pmoves:start] env: PMOVES_BOOTSTRAP_TOOLS=${process.env.PMOVES_BOOTSTRAP_TOOLS || '<empty>'}`);
  console.log(`[pmoves:start] example start OK (no-op, would launch the real service here)`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
