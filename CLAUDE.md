# CLAUDE.md — PMOVES-pinokio

**The context for this repository lives in [`AGENTS.md`](./AGENTS.md). Read that.**

This file is a pointer, deliberately, rather than a second copy.

The convention elsewhere in the fleet duplicates the same body into both `CLAUDE.md` and `AGENTS.md` — `PMOVES-ClawZ` carries 279 identical lines in each. Two files holding one fact drift the moment someone edits one of them, which is the same defect class as a launcher whose config disagrees with the script that provisions it. PMOVES.AI adopted the AGENTS.md open format in #2646, so `AGENTS.md` is the canonical surface and this points at it.

Nothing here overrides the parent repo's guidance. Load in this order:

1. `PMOVES.AI/.claude/BOOTSTRAP.md` — flat foundation
2. `PMOVES.AI/.claude/PINOKIO_LAUNCHER_GUIDE.md` — **on-demand, and required before writing or modifying any launcher script**
3. [`AGENTS.md`](./AGENTS.md) — this fork

The one thing worth repeating here because it is the most common error: **launchers do not live in this repository.** They live under `PINOKIO_HOME` — `api/<name>` for an app, `plugin/<name>` for a reusable tool. Resolve `PINOKIO_HOME` before creating any launcher file, and never assume it is the current workspace.
