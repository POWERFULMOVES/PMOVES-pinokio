// pmoves-hermes start.js — bootstrap + launch the PMOVES Hermes Agent.
// Chain: hermes-pmoves (repo script) → make hermes-bootstrap (profile + MCP +
// CHIT + verification) → hermes gateway on :7700.
//
// Mirrors pmoves-agent-zero's pattern: read repo-root.txt written by install,
// then shell.run against the repo with URL capture.
module.exports = {
  daemon: true,
  run: [{
    method: "fs.read",
    params: {
      path: "repo-root.txt",
      encoding: "utf8",
    },
  }, {
    method: "local.set",
    params: {
      repo_root: "{{input.trim()}}",
    },
  }, {
    method: "shell.run",
    params: {
      path: "{{path.resolve(local.repo_root)}}",
      message: [
        "# ensure the launcher is on PATH (installed by install.js if missing)",
        "command -v hermes-pmoves >/dev/null 2>&1 || export PATH=\"$HOME/.local/bin:$PATH\"",
        "# bootstrap + launch: profile pmoves-hermes-<node>, MCP from canonical",
        "# inventory, CHIT trail signing, then the gateway on :7700",
        "PMOVES_HERMES_PROFILE=\"${PMOVES_HERMES_PROFILE:-pmoves-hermes-elder}\" hermes-pmoves gateway run",
      ].join("\n"),
      on: [{
        // gateway banner prints its URL — capture it as the ready URL
        event: "/(https?:\\/\\/[0-9a-zA-Z.:\\-]+(?:\\/)?.*gateway|Gateway .*listening|:7700)/",
        done: false, // gateway keeps running; capture but don't kill the script
      }],
    },
  }, {
    method: "local.set",
    params: {
      url: "http://localhost:7700",
    },
  }],
}
