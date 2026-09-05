// pmoves-hermes install.js — record repo root + ensure hermes-pmoves launcher.
// Mirrors pmoves-agent-zero's install pattern.
module.exports = {
  run: [{
    method: "shell.run",
    params: {
      message: [
        "repo_root=\"$(pwd | sed 's|/pinokio/api.*||')\"",
        // The launcher lives in the PMOVES.AI checkout; when this app runs
        // from inside the repo (PMOVES-pinokio/api/pmoves-hermes), the repo
        // root is three levels up.
        "candidate=\"$(cd \"$(dirname \"$(dirname \"$(dirname \"$(pwd)\"))\")\" && pwd)\"",
        "[ -f \"$candidate/pmoves/Makefile\" ] && repo_root=\"$candidate\"",
        "echo \"$repo_root\" > repo-root.txt",
        "echo \"PMOVES.AI repo root: $repo_root\"",
        "# Install the fleet launcher if missing (installs to ~/.local/bin)",
        "if ! command -v hermes-pmoves >/dev/null 2>&1; then",
        "  mkdir -p ~/.local/bin",
        "  cp \"$repo_root/pmoves/scripts/hermes-pmoves\" ~/.local/bin/hermes-pmoves 2>/dev/null || true",
        "  chmod +x ~/.local/bin/hermes-pmoves 2>/dev/null || true",
        "  echo 'hermes-pmoves installed to ~/.local/bin'",
        "fi",
        "command -v hermes >/dev/null 2>&1 && hermes --version || echo 'NOTE: hermes core not on PATH — hermes-pmoves bootstrap will surface install guidance'",
      ].join("\n"),
      on: [{
        event: "/(repo root:|installed to|NOTE:)/",
        done: true,
      }],
    },
  }],
}
