---
name: PMOVES Hermes Agent
description: |
  PMOVES-customized Hermes Agent as a Pinokio app — gateway, skills, MCP
  orchestration, CHIT trail signing. One-click bootstrap via hermes-pmoves.
keywords: hermes, agent, gateway, mcp, chit, orchestration, fleet
version: 1.0.0
category: Agents/Orchestration
tier: 1
agent_class: Specialized (Pmoves-)
agent_id: pmoves_hermes_launcher
---

# PMOVES Hermes (Pinokio app)

**Tier 1 orchestration agent** — the Hermes Agent gateway as a first-class
Pinokio citizen. Hermes IS a plugin in Pinokio8: this launcher bootstraps the
full PMOVES chain and runs the gateway.

## Launch chain
`install.js` (repo-root detection + hermes-pmoves to ~/.local/bin) →
`start.js` → `hermes-pmoves` → `make -C pmoves hermes-bootstrap`
(profile pmoves-hermes-<node> + MCP from canonical inventory + CHIT) →
`hermes gateway run` (:7700)

## Profiles
Default `pmoves-hermes-elder`; override with `PMOVES_HERMES_PROFILE` env
(fleet: pmoves-hermes-z890, -5090, -spark, -kvm).

## Related apps
- `pmoves-agent-zero` — the reference launcher this app mirrors
- `pmoves-fleet` — live registry view (fleet-sentinel)
- `pmoves-services` — compose-stack control center
