module.exports = {
  daemon: true,
  version: "1.0",
  title: "PMOVES Fleet Registry",
  description: "Live fleet view from fleet-sentinel /registry.json — every announced service with health + tier. Auto-refreshing.",
  icon: "icon.png",
  menu: async (kernel, info) => {
    let items = []
    let running = info.running("status.js")
    if (running) {
      items.push({
        default: true,
        icon: "fa-solid fa-satellite-dish",
        text: "Fleet Registry (Live)",
        href: "status.js",
      })
    } else {
      items.push({
        default: true,
        icon: "fa-solid fa-satellite-dish",
        text: "Scan Fleet (start live registry)",
        href: "status.js",
      })
    }
    items.push({
      icon: "fa-solid fa-heart-pulse",
      text: "Sentinel Health",
      href: "http://localhost:8116/healthz",
    })
    items.push({
      icon: "fa-solid fa-clock-rotate-left",
      text: "Self-Heal Actions",
      href: "http://localhost:8116/actions",
    })
    return items
  },
}
