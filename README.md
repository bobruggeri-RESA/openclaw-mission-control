# OpenClaw Mission Control

A production-quality multi-agent dashboard for OpenClaw setups. Monitor all your agents, sessions, cron jobs, memory, and costs from one beautiful dark-mode interface.

## Features

- **Dashboard** — Agent status, system health, recent activity at a glance
- **Agents** — Detailed per-agent cards with session history and org chart
- **Sessions** — Combined session browser with full message history
- **Activity Feed** — Real-time reverse-chronological timeline with auto-refresh
- **Cron Manager** — Visual weekly calendar + create/edit/delete/trigger cron jobs
- **Memory Browser** — Browse and edit MEMORY.md / memory files for all agents
- **Tasks** — Kanban board (Backlog → In Progress → Review → Done) with drag and drop
- **Cost Tracking** — Token usage charts, cost breakdown by agent/model (Recharts)
- **Search** — Global search across sessions, memory, cron jobs (Cmd+K)
- **Settings** — Gateway config, connection testing

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Recharts (charts)
- Lucide React (icons)
- jose (JWT auth)
- date-fns

## Quick Start

### 1. Install dependencies

```bash
cd openclaw-mission-control
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your gateway tokens:

```env
# Nelson (local)
NELSON_GATEWAY_URL=http://127.0.0.1:18789
NELSON_GATEWAY_TOKEN=your-token-here

# Kitt (remote)
KITT_GATEWAY_URL=http://192.168.7.9:18789
KITT_GATEWAY_TOKEN=your-kitt-token

# Woodhouse (remote)
WOODHOUSE_GATEWAY_URL=http://192.168.7.11:18789
WOODHOUSE_GATEWAY_TOKEN=your-woodhouse-token

# Dashboard auth
ADMIN_PASSWORD=your-secure-password
AUTH_SECRET=at-least-32-characters-random-secret
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Default login: password is `changeme` (change in `.env.local`)

### 4. Build for production

```bash
npm run build
npm start
```

## Architecture

### Gateway Client (`src/lib/openclaw.ts`)

All gateway calls go server-side through Next.js API routes. The browser never sees tokens.

```
Browser → Next.js API Route → OpenClaw Gateway → Agent
```

The gateway wraps responses in an envelope:
```json
{
  "ok": true,
  "result": {
    "content": [{ "type": "text", "text": "..." }],
    "details": {}
  }
}
```

### Auth

Simple password auth using JWT cookies (httpOnly, secure in production).

### Config

Agents are defined in `src/config/agents.ts`. Gateway URLs/tokens come from environment variables.

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # All protected pages
│   ├── login/           # Login page
│   └── api/             # Server-side API routes
├── components/
│   ├── layout/          # TopBar
│   └── ui/              # Shared components
├── lib/
│   ├── openclaw.ts      # Gateway client
│   ├── auth.ts          # JWT auth
│   └── types.ts         # TypeScript types
└── config/
    └── agents.ts        # Agent definitions
```

## Agents

| Agent | Machine | Gateway |
|-------|---------|---------|
| Nelson | Local | http://127.0.0.1:18789 |
| Kitt | 192.168.7.9 | http://192.168.7.9:18789 |
| Woodhouse | 192.168.7.11 | http://192.168.7.11:18789 |

## Windows Notes

This project runs on Windows natively. No WSL or bash scripts required. All file operations use `path.join` for cross-platform compatibility.

## Getting Gateway Tokens

Run this in OpenClaw to get a token:
```
/token
```

Or check your agent's config file.
