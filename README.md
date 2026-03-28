# after-effects-mcp

[![License: MIT](https://img.shields.io/github/license/maaz997/after-effects-mcp)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

Bridge between **Cursor, Claude Code, or any MCP client** and **Adobe After Effects**. You describe what you want in natural language; the client talks to this server; the server drops commands on disk; a small ScriptUI panel inside After Effects picks them up and runs ExtendScript. No CEP panel and no hacky keystroke automation—just a file-based queue both sides can trust.

Maintained by **[maaz997](https://github.com/maaz997)** — [github.com/maaz997/after-effects-mcp](https://github.com/maaz997/after-effects-mcp)

---

## Why this shape?

After Effects already speaks **ExtendScript**. The hard part is getting a *deterministic* path from an LLM to that runtime without embedding a full plugin stack. This project splits the problem:

| Piece | Role |
|--------|------|
| **Node (this repo)** | MCP server: validates commands, optional batching, optional `aerender` spawn. |
| **`~/Documents/ae-mcp-bridge/`** | Shared folder: `ae_command.json` in, `ae_mcp_result.json` out. |
| **`mcp-bridge-auto.jsx`** | Floating panel (required on **AE 25+**): watches the folder and executes allowlisted handlers. |

If the panel isn’t open, commands queue on disk until you open it—nothing silently fails in the Node process without you knowing.

---

## Requirements

- **After Effects** 2025 or **2026** (26.x tested). Older versions may work but the panel is built for current scripting APIs.
- **Node.js** 18+ (20 LTS recommended).
- **yarn** or npm.

---

## Quick start

```bash
git clone git@github.com:maaz997/after-effects-mcp.git
cd after-effects-mcp
yarn install
yarn build
yarn install-bridge
```

`install-bridge` copies `build/scripts/mcp-bridge-auto.jsx` into your After Effects **ScriptUI Panels** folder (may need admin rights on macOS/Windows).

Then:

1. Launch After Effects, open your project.
2. **Window →** the **MCP Bridge Auto** panel (floating window on AE 25+).
3. Enable **Auto-run commands** in the panel.
4. Start the MCP server from your editor config (below).

---

## Wire it to Cursor (or any MCP host)

Point `command` at the built entrypoint—use an **absolute path** on your machine:

```json
{
  "mcpServers": {
    "AfterEffectsMCP": {
      "command": "node",
      "args": ["/absolute/path/to/after-effects-mcp/build/index.js"]
    }
  }
}
```

Run `yarn start` manually only if you are debugging; normally the IDE launches the server.

---

## Environment variables (optional)

| Variable | Purpose |
|----------|---------|
| `AE_MCP_DEBUG=1` | Log bridge paths / file sizes on stderr. |
| `AE_MCP_IMPORT_ROOT` | Restrict `importFootage` paths to a single directory tree. |
| `AE_MCP_DENIED_COMMANDS` | Comma-separated bridge command names to block entirely. |
| `AE_AERENDER_PATH` | Full path to `aerender` if not next to a default AE 2026 install. |

---

## What it can drive

The server exposes many MCP tools (`run-script`, `get-results`, `get-help`, `bridge-status`, composition/layer helpers, `executeBatch`, `applySceneSpec`, expression snippets, optional `run-aerender`, etc.). The **source of truth** for names and parameters is whatever your client lists after install, or call **`get-help`** once the bridge is connected.

High-level capabilities include:

- Comps, layers (text, shape, solid, null, camera, light), parenting, mattes, masks, effects and effect stacks  
- Keyframes, expressions, time remap, markers, scene-style JSON specs, batched command lists  
- Footage import (with path checks), render queue queueing, and optional CLI render via `aerender`  

Recipe-style JSON lives under **`examples/recipes/`** as a starting point for `applySceneSpec`.

---

## Repo layout

```
src/index.ts              # MCP server (stdio)
src/bridge.ts             # Paths + result polling
src/constants.ts          # Allowlisted bridge command names
src/validate-bridge-command.ts
src/aerender-cli.ts
src/scripts/mcp-bridge-auto.jsx   # After Effects panel + ExtendScript API
install-bridge.js         # Copy panel into AE Scripts folder
build/                    # Produced by `yarn build` — what you ship / run
```

---

## License

MIT — see [LICENSE](LICENSE).
