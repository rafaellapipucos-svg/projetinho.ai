# Projetinho.ai — Plataforma de Gestão Nutricional

SaaS multi-tenant para profissionais de saúde: banco de alimentos, planos alimentares,
prontuário e portal do paciente. **Documentos que governam o projeto:**

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — arquitetura aprovada (constituição)
- [`AGENTS.md`](AGENTS.md) — time de agentes e regras de engenharia

## Stack

Next.js (App Router) · TypeScript estrito · tRPC v11 · Prisma 7 (driver `pg`) ·
PostgreSQL (Supabase, São Paulo) · Supabase Auth · Tailwind v4 + shadcn/ui ·
Vitest · Playwright · Docker → Google Cloud Run (São Paulo).

## Desenvolvimento

Requisitos: Node.js ≥ 22.

```bash
cp .env.example .env   # preencha com as credenciais do Supabase
npm install            # roda prisma generate no postinstall
npm run db:migrate     # aplica migrations (usa DIRECT_URL)
npm run db:seed        # catálogos de sistema (papéis)
npm run dev            # http://localhost:3000
```

## Scripts

| Comando              | O que faz                            |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Servidor de desenvolvimento          |
| `npm run build`      | Build de produção (standalone)       |
| `npm run typecheck`  | TypeScript sem emitir                |
| `npm run lint`       | ESLint (inclui fronteiras de camada) |
| `npm run format`     | Prettier                             |
| `npm test`           | Testes unitários (Vitest)            |
| `npm run test:e2e`   | Testes end-to-end (Playwright)       |
| `npm run db:migrate` | `prisma migrate deploy`              |
| `npm run db:seed`    | Seed idempotente dos catálogos       |

## Deploy

CI (GitHub Actions) valida typecheck + lint + testes + build em todo PR.
Push na `main` constrói a imagem Docker, publica no Artifact Registry e faz deploy
no Cloud Run (staging) — exige o bootstrap único do GCP:
[`scripts/gcp/bootstrap.sh`](scripts/gcp/bootstrap.sh) (rodar no Cloud Shell).
