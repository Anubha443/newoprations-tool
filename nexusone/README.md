# NexusOne

NexusOne is an integrated operations platform combining Communication, HRM, and CRM modules behind a unified API gateway and AI layer.

## Architecture

```
[Web App]
   |
 [Nginx] -- SSL/HTTP routing
   |
[API Gateway] ---- [Anthropic API]
   |   |   |
  Comm HRM CRM services
   \   |   /
    [PostgreSQL + pgvector]
          |
        [Redis]
```

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up --build
```

Production:

```bash
docker compose -f infra/docker-compose.prod.yml up --build -d
```

## Environment Variables

See `.env.example` for all required vars:
- DB: `POSTGRES_*`
- Auth: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- AI: `ANTHROPIC_API_KEY`, `AI_MAX_CONCURRENT`
- Infra: `REDIS_HOST`, `PORT`

## Module Overview

- **Communication**: channels, topics, DMs, realtime presence, thread summaries
- **HRM**: employee directory, leave, attendance, payroll, recruitment + AI screening
- **CRM**: contacts, companies, deals, pipelines, activities, forecasting
- **AI Layer**: chat, actions, embeddings, search, module-aware prompts

## Contributing

1. Create a feature branch.
2. Keep modules isolated by folder (`apps/*`, `packages/*`).
3. Add/update API + UI tests where possible.
4. Run local checks and submit PR with summary + verification commands.
