// pmoves-fleet status.js — live registry view from fleet-sentinel.
// Polls /registry.json every POLL_S seconds and renders the fleet table.
const SENTINEL = process.env.SENTINEL_URL || "http://localhost:8116"
const POLL_S = parseInt(process.env.SENTINEL_POLL_S || "10", 10)

const TIER_ICONS = {
  data: "fa-solid fa-database",
  api: "fa-solid fa-plug",
  llm: "fa-solid fa-brain",
  media: "fa-solid fa-film",
  agent: "fa-solid fa-robot",
  worker: "fa-solid fa-gears",
  app: "fa-solid fa-window-maximize",
  ui: "fa-solid fa-palette",
  unknown: "fa-solid fa-circle-question",
}

function iconFor(tier) {
  return TIER_ICONS[tier] || TIER_ICONS.unknown
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function render(registry) {
  const rows = (registry.services || []).map((s) => {
    const health =
      s.health === "healthy" ? "🟢" :
      s.health === "failing" ? "🔴" :
      s.health === "stale" ? "🟡" : "⚪"
    return `${health}  ${s.slug.padEnd(24)} ${String(s.tier).padEnd(8)} ${s.url || s.health_check || ""}`
  })
  console.clear()
  console.log(`╔══════════════════════════════════════════════════════════╗`)
  console.log(`║  PMOVES Fleet Registry  —  ${registry.generated || ""} `)
  console.log(`║  sentinel: ${SENTINEL}   services: ${(registry.services || []).length}`)
  console.log(`╚══════════════════════════════════════════════════════════╝`)
  if (!rows.length) {
    console.log("  (no services announced yet — waiting on services.announce.v1 ...)")
  } else {
    rows.forEach((r) => console.log("  " + r))
  }
  console.log(`\n  refreshing every ${POLL_S}s — ctrl+c to stop`)
}

async function main() {
  // First fetch outside the loop so a down sentinel reports clearly
  try {
    render(await fetchJson(`${SENTINEL}/registry.json`))
  } catch (e) {
    console.log(`sentinel unreachable at ${SENTINEL}: ${e.message}`)
    console.log(`start it with: make -C pmoves up-sentinel`)
  }
  while (true) {
    await new Promise((r) => setTimeout(r, POLL_S * 1000))
    try {
      render(await fetchJson(`${SENTINEL}/registry.json`))
    } catch {
      // transient — keep last frame
    }
  }
}

main()
