// PMOVES Crush — Pinokio PLUGIN launcher.
//
// Why a plugin and not an app launcher:
//   Crush is a tool used ACROSS folders, which is the guide's definition of a
//   plugin. `run` therefore targets {{args.cwd}} — the caller's project — not
//   this plugin's own directory.
//
// Why not edit plugin/code/crush:
//   That collection is upstream `pinokiocomputer/code`. Changes there are lost
//   on the next pull of that repo, and it runs `npx -y @charmland/crush@latest`
//   — UPSTREAM crush on a floating version, with none of the PMOVES wiring.
//   This launcher runs the PMOVES fork instead.
//
// What it runs:
//   PMOVES-crush is a submodule of PMOVES.AI tracking PMOVES.AI-Edition-Hardened.
//   Its `pmoves/scripts/crush-pmoves` wrapper runs crush-bootstrap (config +
//   CHIT + MCP) and then launches Crush with AGENT_TRAIL, agent signatures and
//   the MCP servers already configured.
//
// Path resolution:
//   Built with path.resolve from {{cwd}} (this plugin's folder) rather than a
//   chain of `..` segments. The fork's own app launcher walks five levels of
//   `..`, which only holds from one exact install location. PINOKIO_HOME/plugin
//   -> PINOKIO_HOME/api/PMOVES.AI is two levels and is the documented layout.
//   PMOVES_REPO can override it when the repo lives elsewhere.

module.exports = {
  menu: async (kernel, info) => {
    // The wrapper's absolute path, resolved once and reused by both branches.
    const repo = kernel.path.resolve(__dirname, "../../api/PMOVES.AI")
    const wrapper = kernel.path.resolve(repo, "pmoves/scripts/crush-pmoves")
    const fs = require("fs")

    // Fail VISIBLY rather than handing the user a menu item that dies in a
    // shell. A launcher that appears in the sidebar and then errors is the
    // same class of defect as a health check that cannot observe health.
    if (!fs.existsSync(wrapper)) {
      return [{
        icon: "fa-solid fa-triangle-exclamation",
        text: "PMOVES-Crush wrapper not found",
        description: `Expected ${wrapper}. Set PMOVES_REPO, or clone PMOVES.AI to PINOKIO_HOME/api/PMOVES.AI and run: git submodule update --init PMOVES-crush`
      }]
    }

    return [{
      icon: "fa-solid fa-terminal",
      text: "Start PMOVES Crush",
      description: "Bootstrap + launch Crush in this folder with full PMOVES context",
      href: "start.js"
    }]
  }
}
