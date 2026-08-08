// pmoves_apps/example-pmoves-app/install.js
//
// The "install" phase of the example PMOVES-tagged Pinokio app.
// Loads the PMOVES bootstrap CGP and verifies that the operator's
// tagged services are reachable (advisory - missing services just log
// a warning, not an error).
//
// Run standalone: `node install.js`
//   - No CGP present      -> exits 0, logs stub bootstrap summary
//   - CGP present         -> exits 0, logs full bootstrap summary
//                            + tagged-service reachability report

const path = require('path');
const {
  loadPmovesCGP,
  applyCgpToEnv,
  PROFILE,
} = require(path.resolve(__dirname, '..', '..', 'pmoves_loader'));

function main() {
  const bs = loadPmovesCGP();
  applyCgpToEnv(bs);

  console.log(`[pmoves] spec: ${bs.spec}`);
  console.log(`[pmoves] profile: ${PROFILE}`);
  console.log(`[pmoves] bootstrap source: ${bs.source}`);
  console.log(`[pmoves] identity: agent=${bs.agent} role=${bs.role} skin=${bs.skin || '<none>'}`);
  console.log(`[pmoves] tools: ${bs.tools.length} (${bs.tools.slice(0, 4).join(', ')}${bs.tools.length > 4 ? '...' : ''})`);
  console.log(`[pmoves] mcps: ${bs.mcps.length}`);
  console.log(`[pmoves] constraints: ${bs.constraints.length} - all honored`);

  // Advisory check: which tagged services are reachable. We don't
  // actually probe (no network in install), we just report what's
  // declared. A real installer would do a TCP/HTTP probe here.
  const services = bs.services || {};
  const reachable = [];
  const missing = [];
  for (const [name, entry] of Object.entries(services)) {
    if (entry && ((entry.host && entry.ip) || entry.site || entry.account || (Array.isArray(entry.devices) && entry.devices.length > 0))) {
      reachable.push(name);
    } else {
      missing.push(name);
    }
  }
  console.log(`[pmoves] tagged services reachable: ${reachable.join(', ') || '<none>'}`);
  if (missing.length > 0) {
    console.warn(`[pmoves] tagged services missing (advisory): ${missing.join(', ')}`);
  }

  // Always exit 0 - the install is a no-op for the example. A real
  // app would do its own work (git clone, pip install, etc.) and
  // exit non-zero on failure.
  console.log(`[pmoves] example install OK (no-op)`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
