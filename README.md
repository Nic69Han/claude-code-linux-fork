# Claude Code — Linux Fork

> Community Linux port of Anthropic's Claude Code CLI, based on the source published on 2026-03-31.

Claude Code is a terminal AI assistant built by Anthropic that lets you interact with Claude directly from the command line to perform software engineering tasks — editing files, running commands, searching codebases, managing git workflows, and more.

- **Language**: TypeScript (strict)
- **Runtime**: [Bun](https://bun.sh)
- **Terminal UI**: React + [Ink](https://github.com/vadimdemedes/ink)
- **Scale**: ~1,900 files, 512,000+ lines of code

---

## Requirements

| Dependency | Version | Install |
|---|---|---|
| [Bun](https://bun.sh) | ≥ 1.1 | `curl -fsSL https://bun.sh/install \| bash` |
| [ripgrep](https://github.com/BurntSushi/ripgrep) | any | `sudo apt install ripgrep` / `brew install ripgrep` |
| Node.js (optional) | ≥ 18 | only needed if you prefer `node` tooling |

> **Linux users**: a supported terminal emulator is required to use the GUI launcher (`gnome-terminal`, `xterm`, `konsole`, `xfce4-terminal`, `lxterminal`, or `tilix`).

---

## Installation rapide (one-liner)

```bash
curl -fsSL https://raw.githubusercontent.com/Nic69Han/claude-code-linux-fork/master/install.sh | bash
```

Ce script :
- Clone le dépôt dans `~/.local/share/claude-code`
- Installe Bun si absent
- Lance `bun install` + build
- Crée le raccourci desktop
- Ajoute `claude-code` dans votre `$PATH`

Options disponibles :
```bash
./install.sh --dir /custom/path   # répertoire d'installation personnalisé
./install.sh --no-desktop         # sans raccourci GUI
./install.sh --no-build           # sans build (juste clone + deps)
```

---

## Installation manuelle

### 1. Clone the repository

```bash
git clone https://github.com/Nic69Han/claude-code-linux-fork.git
cd claude-code-linux-fork
```

### 2. Install Bun (if not already installed)

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc   # or restart your terminal
```

### 3. Install dependencies

```bash
bun install
```

### 4. Configure API key

```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

### 5. Build

```bash
bun run build
# output: dist/claude-code.js
```

### 6. Run

```bash
# From the project root:
./claude-code.sh

# Or directly:
bun dist/claude-code.js
```

The `claude-code.sh` script:
- Loads `.env` automatically if present
- Detects Bun automatically (no hardcoded paths)
- Builds the app if `dist/claude-code.js` is missing
- Runs inline in terminal, or opens a new terminal window from a GUI shortcut

### Update

```bash
./claude-code.sh --update
# Pulls latest commits + reinstalls deps + rebuilds
```

---

## GUI Shortcut (Linux Desktop)

To add a clickable shortcut in your Linux desktop environment:

```bash
# Create the .desktop launcher (adjust paths as needed)
cat > ~/.local/share/applications/claude-code.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Claude Code
Comment=Claude Code CLI — Linux Fork
Exec=/path/to/claude-code-linux-fork/claude-code.sh
Terminal=false
Categories=Development;Utility;
StartupNotify=true
EOF

update-desktop-database ~/.local/share/applications/
```

Replace `/path/to/claude-code-linux-fork/` with the actual path where you cloned the repo.

---

## GitHub Copilot CLI

`gh copilot` is GitHub's AI assistant for the shell — complementary to Claude Code. It suggests and explains terminal commands in natural language.

### Install

```bash
# Install GitHub CLI if not already present
sudo apt install gh          # Debian/Ubuntu
brew install gh              # macOS

# Login
gh auth login

# Install the Copilot extension (one-time)
./copilot-cli.sh --install
# or: gh extension install github/gh-copilot
```

### Usage

```bash
./copilot-cli.sh                              # interactive menu
./copilot-cli.sh suggest "compress a folder"  # get a shell command
./copilot-cli.sh explain "tar -czf ..."       # explain a command
```

A desktop shortcut **GitHub Copilot CLI** is also created by `install.sh`.

| Tool | Best for |
|---|---|
| **Claude Code** (`./claude-code.sh`) | Full coding sessions, file editing, multi-step tasks |
| **GitHub Copilot CLI** (`./copilot-cli.sh`) | Quick one-off shell commands and explanations |

---

## LiteLLM — Third-Party Model Support

[LiteLLM](https://github.com/BerriAI/litellm) acts as an Anthropic-compatible proxy that routes Claude Code's API calls to any supported backend: OpenAI, GitHub Copilot, Mistral, Ollama (local), and more.

### How it works

```
Claude Code  →  LiteLLM proxy (port 4000)  →  OpenAI / Copilot / Ollama / …
              (speaks Anthropic API)          (translates to target provider)
```

### Quick start

**1. Install LiteLLM**

```bash
pip install 'litellm[proxy]'
```

**2. Configure your backend**

Edit `litellm/config.yaml` and uncomment the block for your provider.

| Backend | Env var required | Comment block to uncomment |
|---|---|---|
| Anthropic (default) | `ANTHROPIC_API_KEY` | Already active |
| OpenAI | `OPENAI_API_KEY` | `# ── OpenAI` section |
| GitHub Copilot | `GITHUB_TOKEN` | `# ── GitHub Copilot` section |
| Ollama (local) | none | `# ── Ollama` section |
| Mercury AI (Inception) | `INCEPTION_API_KEY` | `# ── Mercury AI` section |
| Mistral AI | `MISTRAL_API_KEY` | `# ── Mistral AI` section |
| Azure OpenAI | `AZURE_API_KEY` + `AZURE_API_BASE` | `# ── Azure OpenAI` section |
| Groq | `GROQ_API_KEY` | `# ── Groq` section |
| AWS Bedrock | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION_NAME` | `# ── AWS Bedrock` section |

**3. Start the proxy**

```bash
./litellm/start.sh                       # Anthropic backend (default)
./litellm/start.sh --backend openai
./litellm/start.sh --backend openai
./litellm/start.sh --backend copilot
./litellm/start.sh --backend ollama
./litellm/start.sh --backend mercury
./litellm/start.sh --backend mistral
./litellm/start.sh --backend azure
./litellm/start.sh --backend groq
./litellm/start.sh --backend bedrock
./litellm/start.sh --port 8080        # custom port
```

**4. Launch Claude Code via the proxy**

```bash
./claude-code.sh --litellm
./claude-code.sh --litellm --litellm-port 8080   # custom port
```

Or manually:

```bash
ANTHROPIC_BASE_URL=http://localhost:4000 bun dist/claude-code.js
```

### Mercury AI (Inception Labs)

```bash
export INCEPTION_API_KEY=your_key   # https://platform.inceptionlabs.ai/
# Uncomment the "── Mercury AI" section in litellm/config.yaml
./litellm/start.sh --backend mercury
./claude-code.sh --litellm
```

> **Models**: `mercury-coder-small`, `mercury-edit-2` — diffusion-based coding models from Inception Labs with 10M free tokens on signup.

### Mistral AI

```bash
export MISTRAL_API_KEY=your_key   # https://console.mistral.ai/
# Uncomment the "── Mistral AI" section in litellm/config.yaml
./litellm/start.sh --backend mistral
./claude-code.sh --litellm
```

### Azure OpenAI

```bash
export AZURE_API_KEY=your_key
export AZURE_API_BASE=https://my-resource.openai.azure.com/
# Edit litellm/config.yaml: uncomment "── Azure OpenAI", replace <deployment-name>
./litellm/start.sh --backend azure
./claude-code.sh --litellm
```

### Groq (ultra-fast inference)

```bash
export GROQ_API_KEY=your_key   # https://console.groq.com/
# Uncomment the "── Groq" section in litellm/config.yaml
./litellm/start.sh --backend groq
./claude-code.sh --litellm
```

### AWS Bedrock via LiteLLM

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION_NAME=us-east-1
# Uncomment the "── AWS Bedrock" section in litellm/config.yaml
./litellm/start.sh --backend bedrock
./claude-code.sh --litellm
```

> **Note**: Claude models on Bedrock can also be used natively (without LiteLLM) via `CLAUDE_CODE_USE_BEDROCK=1` in your `.env`.

### GitHub Copilot setup

```bash
# Get a GitHub token with copilot scope
# https://github.com/settings/tokens → New token → check "copilot"
export GITHUB_TOKEN=ghp_your_token_here

# Uncomment the "── GitHub Copilot" section in litellm/config.yaml
./litellm/start.sh --backend copilot
./claude-code.sh --litellm
```

### Ollama (fully local, no API key)

```bash
# Install Ollama from https://ollama.com then pull a model
ollama pull llama3.2

# Uncomment the "── Ollama" section in litellm/config.yaml
./litellm/start.sh --backend ollama
./claude-code.sh --litellm
```

---

## Logging & Cost Tracking

All requests through the LiteLLM proxy are logged automatically.

| File | Description |
|---|---|
| `litellm/logs/requests.log` | JSON log, one entry per request (rotates at 10 MB, keeps 5 files) |
| `litellm/logs/litellm.db` | SQLite database used by the dashboard UI |

### View cost summary

```bash
python3 litellm/log_viewer.py              # last 20 requests
python3 litellm/log_viewer.py --all        # full history
python3 litellm/log_viewer.py --summary    # cost summary only
```

### Dashboard UI

Open **http://localhost:4000/ui** in your browser while the proxy is running.
Login with the master key: `sk-litellm-proxy` (change it in `litellm/config.yaml`).

---

## NPM / Bun Scripts

| Script | Command | Description |
|---|---|---|
| `start` | `bun run src/entrypoints/cli.tsx` | Run from source (dev, no build step) |
| `build` | `bun run build` | Production build to `dist/claude-code.js` |
| `build:dev` | `bun run build:dev` | Dev build with inline source maps |
| `typecheck` | `bun run typecheck` | TypeScript type-check only (no emit) |

---

## Overview

---

## Directory Structure

```
src/
├── main.tsx                 # Entrypoint (Commander.js-based CLI parser)
├── commands.ts              # Command registry
├── tools.ts                 # Tool registry
├── Tool.ts                  # Tool type definitions
├── QueryEngine.ts           # LLM query engine (core Anthropic API caller)
├── context.ts               # System/user context collection
├── cost-tracker.ts          # Token cost tracking
│
├── commands/                # Slash command implementations (~50)
├── tools/                   # Agent tool implementations (~40)
├── components/              # Ink UI components (~140)
├── hooks/                   # React hooks
├── services/                # External service integrations
├── screens/                 # Full-screen UIs (Doctor, REPL, Resume)
├── types/                   # TypeScript type definitions
├── utils/                   # Utility functions
│
├── bridge/                  # IDE integration bridge (VS Code, JetBrains)
├── coordinator/             # Multi-agent coordinator
├── plugins/                 # Plugin system
├── skills/                  # Skill system
├── keybindings/             # Keybinding configuration
├── vim/                     # Vim mode
├── voice/                   # Voice input
├── remote/                  # Remote sessions
├── server/                  # Server mode
├── memdir/                  # Memory directory (persistent memory)
├── tasks/                   # Task management
├── state/                   # State management
├── migrations/              # Config migrations
├── schemas/                 # Config schemas (Zod)
├── entrypoints/             # Initialization logic
├── ink/                     # Ink renderer wrapper
├── buddy/                   # Companion sprite (Easter egg)
├── native-ts/               # Native TypeScript utils
├── outputStyles/            # Output styling
├── query/                   # Query pipeline
└── upstreamproxy/           # Proxy configuration
```

---

## Core Architecture

### 1. Tool System (`src/tools/`)

Every tool Claude Code can invoke is implemented as a self-contained module. Each tool defines its input schema, permission model, and execution logic.

| Tool | Description |
|---|---|
| `BashTool` | Shell command execution |
| `FileReadTool` | File reading (images, PDFs, notebooks) |
| `FileWriteTool` | File creation / overwrite |
| `FileEditTool` | Partial file modification (string replacement) |
| `GlobTool` | File pattern matching search |
| `GrepTool` | ripgrep-based content search |
| `WebFetchTool` | Fetch URL content |
| `WebSearchTool` | Web search |
| `AgentTool` | Sub-agent spawning |
| `SkillTool` | Skill execution |
| `MCPTool` | MCP server tool invocation |
| `LSPTool` | Language Server Protocol integration |
| `NotebookEditTool` | Jupyter notebook editing |
| `TaskCreateTool` / `TaskUpdateTool` | Task creation and management |
| `SendMessageTool` | Inter-agent messaging |
| `TeamCreateTool` / `TeamDeleteTool` | Team agent management |
| `EnterPlanModeTool` / `ExitPlanModeTool` | Plan mode toggle |
| `EnterWorktreeTool` / `ExitWorktreeTool` | Git worktree isolation |
| `ToolSearchTool` | Deferred tool discovery |
| `CronCreateTool` | Scheduled trigger creation |
| `RemoteTriggerTool` | Remote trigger |
| `SleepTool` | Proactive mode wait |
| `SyntheticOutputTool` | Structured output generation |

### 2. Command System (`src/commands/`)

User-facing slash commands invoked with `/` prefix.

| Command | Description |
|---|---|
| `/commit` | Create a git commit |
| `/review` | Code review |
| `/compact` | Context compression |
| `/mcp` | MCP server management |
| `/config` | Settings management |
| `/doctor` | Environment diagnostics |
| `/login` / `/logout` | Authentication |
| `/memory` | Persistent memory management |
| `/skills` | Skill management |
| `/tasks` | Task management |
| `/vim` | Vim mode toggle |
| `/diff` | View changes |
| `/cost` | Check usage cost |
| `/theme` | Change theme |
| `/context` | Context visualization |
| `/pr_comments` | View PR comments |
| `/resume` | Restore previous session |
| `/share` | Share session |
| `/desktop` | Desktop app handoff |
| `/mobile` | Mobile app handoff |

### 3. Service Layer (`src/services/`)

| Service | Description |
|---|---|
| `api/` | Anthropic API client, file API, bootstrap |
| `mcp/` | Model Context Protocol server connection and management |
| `oauth/` | OAuth 2.0 authentication flow |
| `lsp/` | Language Server Protocol manager |
| `analytics/` | GrowthBook-based feature flags and analytics |
| `plugins/` | Plugin loader |
| `compact/` | Conversation context compression |
| `policyLimits/` | Organization policy limits |
| `remoteManagedSettings/` | Remote managed settings |
| `extractMemories/` | Automatic memory extraction |
| `tokenEstimation.ts` | Token count estimation |
| `teamMemorySync/` | Team memory synchronization |

### 4. Bridge System (`src/bridge/`)

A bidirectional communication layer connecting IDE extensions (VS Code, JetBrains) with the Claude Code CLI.

- `bridgeMain.ts` — Bridge main loop
- `bridgeMessaging.ts` — Message protocol
- `bridgePermissionCallbacks.ts` — Permission callbacks
- `replBridge.ts` — REPL session bridge
- `jwtUtils.ts` — JWT-based authentication
- `sessionRunner.ts` — Session execution management

### 5. Permission System (`src/hooks/toolPermission/`)

Checks permissions on every tool invocation. Either prompts the user for approval/denial or automatically resolves based on the configured permission mode (`default`, `plan`, `bypassPermissions`, `auto`, etc.).

### 6. Feature Flags

Dead code elimination via Bun's `bun:bundle` feature flags:

```typescript
import { feature } from 'bun:bundle'

// Inactive code is completely stripped at build time
const voiceCommand = feature('VOICE_MODE')
  ? require('./commands/voice/index.js').default
  : null
```

Notable flags: `PROACTIVE`, `KAIROS`, `BRIDGE_MODE`, `DAEMON`, `VOICE_MODE`, `AGENT_TRIGGERS`, `MONITOR_TOOL`

---

## Key Files in Detail

### `QueryEngine.ts` (~46K lines)

The core engine for LLM API calls. Handles streaming responses, tool-call loops, thinking mode, retry logic, and token counting.

### `Tool.ts` (~29K lines)

Defines base types and interfaces for all tools — input schemas, permission models, and progress state types.

### `commands.ts` (~25K lines)

Manages registration and execution of all slash commands. Uses conditional imports to load different command sets per environment.

### `main.tsx`

Commander.js-based CLI parser + React/Ink renderer initialization. At startup, parallelizes MDM settings, keychain prefetch, and GrowthBook initialization for faster boot.

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Language | TypeScript (strict) |
| Terminal UI | [React](https://react.dev) + [Ink](https://github.com/vadimdemedes/ink) |
| CLI Parsing | [Commander.js](https://github.com/tj/commander.js) (extra-typings) |
| Schema Validation | [Zod v4](https://zod.dev) |
| Code Search | [ripgrep](https://github.com/BurntSushi/ripgrep) (via GrepTool) |
| Protocols | [MCP SDK](https://modelcontextprotocol.io), LSP |
| API | [Anthropic SDK](https://docs.anthropic.com) |
| Telemetry | OpenTelemetry + gRPC |
| Feature Flags | GrowthBook |
| Auth | OAuth 2.0, JWT, macOS Keychain |

---

## Notable Design Patterns

### Parallel Prefetch

Startup time is optimized by prefetching MDM settings, keychain reads, and API preconnect in parallel — before heavy module evaluation begins.

```typescript
// main.tsx — fired as side-effects before other imports
startMdmRawRead()
startKeychainPrefetch()
```

### Lazy Loading

Heavy modules (OpenTelemetry ~400KB, gRPC ~700KB) are deferred via dynamic `import()` until actually needed.

### Agent Swarms

Sub-agents are spawned via `AgentTool`, with `coordinator/` handling multi-agent orchestration. `TeamCreateTool` enables team-level parallel work.

### Skill System

Reusable workflows defined in `skills/` and executed through `SkillTool`. Users can add custom skills.

### Plugin Architecture

Built-in and third-party plugins are loaded through the `plugins/` subsystem.

---

## Dependency Documentation

### Runtime — Bun

[Bun](https://bun.sh) is a fast all-in-one JavaScript runtime (bundler, package manager, test runner). It is required to build and run this project.

- Replaces Node.js for execution
- Used for bundling (`bun build`) with compile-time `--define` macros
- Install: `curl -fsSL https://bun.sh/install | bash`

### Terminal UI — Ink + React

[Ink](https://github.com/vadimdemedes/ink) is a React renderer for the terminal. Claude Code's entire UI is built with React components that render to the terminal instead of a browser DOM. React 19 is used.

### API — Anthropic SDK

`@anthropic-ai/sdk` handles all communication with the Anthropic API (claude-3-x, claude-opus, etc.). Bedrock and Vertex AI variants are also bundled for enterprise deployments.

### CLI Parsing — Commander.js

`commander` + `@commander-js/extra-typings` provides the CLI argument parser with full TypeScript inference.

### Schema Validation — Zod

`zod` is used throughout for runtime schema validation of tool inputs, config files, and API responses.

### Protocols

- `@modelcontextprotocol/sdk` — MCP (Model Context Protocol) server connection
- `vscode-languageserver-protocol` — LSP integration for code intelligence

### Telemetry — OpenTelemetry

Full OpenTelemetry stack (traces, metrics, logs) with exporters for gRPC, HTTP, and Prometheus. Used for optional self-hosted observability.

### Search — ripgrep

The `GrepTool` relies on the `ripgrep` binary being present on the system PATH. Install via your system package manager (`apt install ripgrep`, `brew install ripgrep`, etc.).

### Feature Flags — GrowthBook

`@growthbook/growthbook` provides runtime feature flag evaluation. Some features (voice, proactive mode, agent triggers) are gated behind flags.

### Image Processing — Sharp

`sharp` (native module) is used for image resizing and format conversion when passing screenshots or images to the model.

---

## Disclaimer

This repository is based on source code published from Anthropic's npm registry on **2026-03-31**. All original source code is the property of [Anthropic](https://www.anthropic.com). This fork is maintained for educational and Linux compatibility purposes.
