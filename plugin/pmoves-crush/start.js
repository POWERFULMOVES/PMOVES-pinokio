// Launch PMOVES-Crush in the CALLER's folder.
//
// {{args.cwd}} is the project the user invoked the plugin from — that is what
// makes this a plugin rather than an app launcher, per the Pinokio guide:
// "When a plugin is meant to operate on the user's current project, its `run`
// step should target the caller's folder with {{args.cwd}}".
//
// No URL capture / local.set here on purpose: Crush is an interactive TUI, not
// a server. The mandatory start.js URL-capture pattern applies to launchers
// that surface a web UI; inventing a regex for a TUI that never prints a URL
// would leave the script waiting forever.

module.exports = {
  run: [
    {
      method: "shell.run",
      params: {
        // PMOVES_REPO lets a node whose PMOVES.AI checkout is not at
        // PINOKIO_HOME/api/PMOVES.AI point at the real one, instead of this
        // failing with a path nobody can adjust.
        message: [
          "echo '◇ PMOVES-Crush — fork on PMOVES.AI-Edition-Hardened'",
          "REPO=\"${PMOVES_REPO:-{{path.resolve(cwd, '../../api/PMOVES.AI')}}}\"",
          "WRAPPER=\"$REPO/pmoves/scripts/crush-pmoves\"",
          // Guard before running. Without this the failure is a bare
          // 'command not found' with no indication of what was expected.
          "test -x \"$WRAPPER\" || { echo \"ERROR: PMOVES-Crush wrapper not found or not executable at $WRAPPER\" >&2; echo \"Set PMOVES_REPO, or: git -C \\\"$REPO\\\" submodule update --init PMOVES-crush\" >&2; exit 1; }",
          "echo \"  wrapper: $WRAPPER\"",
          "echo \"  project: {{args.cwd}}\"",
          "echo ''",
          "\"$WRAPPER\""
        ],
        // The caller's project — Crush operates on THIS, not on the plugin dir.
        path: "{{args.cwd}}",
        // Interactive TUI: keep stdin attached and give it a real scrollback.
        input: true,
        buffer: 1024
      }
    }
  ]
}
