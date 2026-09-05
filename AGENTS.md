# AGENTS.md — PMOVES-pinokio

Fork of [pinokiocomputer/pinokio](https://github.com/pinokiocomputer/pinokio) (Pinokio 7.0.0), tracking `PMOVES.AI-Edition-Hardened`.

This is the **Pinokio application itself** — an Electron shell that runs launcher scripts. It is not a PMOVES service and has no compose entry. Agents most often arrive here by mistake, looking for a *launcher*; §2 says where those actually live.

---

## 1. What this repository is

| | |
|---|---|
| Kind | Electron desktop app (`main.js`, electron 39.2.3) |
| Upstream | `pinokiocomputer/pinokio` |
| Tracked branch | `PMOVES.AI-Edition-Hardened` |
| Consumed by | PMOVES.AI as the `PMOVES-pinokio` submodule |
| Runtime home | `PINOKIO_HOME` — **not** this directory |

`PINOKIO_HOME` on a PMOVES node is resolved, in order, from `~/.pinokio/config.json` → `home`, then `GET http://127.0.0.1:42000/pinokio/home`, then the `PINOKIO_HOME` environment variable. On B850 that is `/home/pmoves-knuckles/pinokio`. **Never assume the current workspace is the runtime home** — this fork is source, not state.

## 2. Launchers do not live here

The single most common mistake is editing this fork when the intent was to add or fix a launcher. Launchers are user content under `PINOKIO_HOME`:

| Kind | Location | Use for |
|---|---|---|
| **App launcher** | `PINOKIO_HOME/api/<name>` | one app, managed in its own folder |
| **Plugin launcher** | `PINOKIO_HOME/plugin/<name>` | a reusable tool used *across* folders |

A plugin's `run` step targets the **caller's** directory with `{{args.cwd}}`, not the plugin's own — that is what makes it reusable. `PINOKIO_HOME/plugin/code/` is a live example: one collection holding `claude`, `codex`, `crush`, `cursor`, `gemini`, `qwen`, `vscode`, `windsurf`.

Full API, the execution checklist, and the mandatory `start.js` URL-capture pattern: `PMOVES.AI/.claude/PINOKIO_LAUNCHER_GUIDE.md`, with `PINOKIO.md` in the Pinokio prototype as source of truth.

## 3. Working on the fork itself

```bash
npm install
npm start          # electron .
npm run pack       # electron-builder --dir  (unpacked, fastest to inspect)
npm run dist       # full distributable
```

VS Code configs ship in `.vscode/`: **Pinokio: Electron Main** launches `main.js` under the Electron binary with the main process debuggable, and **Pinokio: Main + Renderer** attaches to the renderer too. Tasks wrap `start`, `pack` and `dist` so they are one keystroke rather than remembered strings.

`npm run monkeypatch` rewrites files inside `node_modules/app-builder-lib` and is a **prerequisite of `dist`, not an optional step** — running `dist` on a fresh `node_modules` without it fails in electron-builder rather than in Pinokio, which sends people looking in the wrong place.

## 4. Fork discipline

This tracks upstream. Two rules keep that cheap:

1. **Prefer additive files over edits to upstream ones.** A new file rebases cleanly; a changed upstream line conflicts every sync.
2. **A PMOVES-specific change belongs in a launcher, not in the shell**, unless it genuinely cannot be expressed as one. The launcher layer exists precisely so the application stays upstream-clean.

The parent repo's gitlink must point at a commit **on** `PMOVES.AI-Edition-Hardened`. `submodule-gitlink-gate` enforces this on every PMOVES.AI PR that moves the pointer, and a branch-only edit is validated too — so a pointer to an unmerged feature branch fails there rather than silently shipping to clones.

## 5. Agents that will run here

Crush and Hermes are expected to operate in this tree. Both reach PMOVES services through MCP rather than direct calls; the fleet's MCP surface is federated by the Docker MCP Gateway (`make -C pmoves up-mcp-gateway`, one endpoint for every agent). Prefer a catalogued MCP tool over a bespoke integration — see `PMOVES.AI/pmoves/docs/architecture/MCP_GATEWAY_WIRING_RESEARCH.md`.

## 6. Before you claim something works

This fork's job is launching things, which makes "it started" a tempting stand-in for "it works". It is not one. A Pinokio script that opens a shell and never captures a URL still *runs*; a launcher pointed at a missing path still *appears* in the sidebar. Check the behaviour, and say plainly which part you verified and which you did not.
