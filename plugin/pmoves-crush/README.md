# PMOVES Crush — Pinokio plugin

Launches [PMOVES-crush](https://github.com/POWERFULMOVES/PMOVES-crush)
(the POWERFULMOVES fork of Charm's Crush, on `PMOVES.AI-Edition-Hardened`)
in the **caller's project folder** via the `pmoves/scripts/crush-pmoves`
wrapper, so every session starts with config + CHIT signing + MCP servers
already bootstrapped.

This is a PLUGIN, not an app launcher: Crush is a tool used across folders,
so `run` targets `{{args.cwd}}` (the project you invoked it from), per the
Pinokio plugin conventions.

## Requirements

- A PMOVES.AI checkout with the `PMOVES-crush` submodule initialized.
- Default location: `PINOKIO_HOME/api/PMOVES.AI` (two levels up from this
  plugin's folder). Override with the `PMOVES_REPO` environment variable
  when the checkout lives elsewhere.

## Files

- `pinokio.js` — dynamic menu (fails visibly when the wrapper is missing)
- `pinokio.json` — metadata
- `start.js` — launch script (interactive TUI; no URL capture because Crush
  is not a web server)

## ACP (Agent Client Protocol) — orchestrator integration

PMOVES-crush v0.91.2-pmoves.1 ships `crush acp`: a stable ACP v1
(JSON-RPC 2.0 over stdio) server. It is how Spynel, Zed, JetBrains and
other ACP clients drive Crush headlessly. ACP is not launched from the
Pinokio UI (it speaks stdio on a caller's pipes); orchestrators invoke:

```
crush acp
```

Configure the harness in Spynel (`harness: crush`) or point any ACP client
at that command. Session mappings persist in
`$XDG_CACHE_HOME/crush/acp-sessions.json` (`CRUSH_ACP_STATE` overrides;
`CRUSH_ACP_BIN` overrides the spawned binary). Tool permissions inside a
turn are auto-approved by the non-interactive runner — connect only
clients you trust with the configured crush environment.
