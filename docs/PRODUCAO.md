# Checklist de Produção

Estado do projeto ao fim da Fase 8. Marque cada item antes de abrir para
usuários reais.

## Infra (Timoneiro)

- [ ] `scripts/gcp/bootstrap.sh` executado no Cloud Shell (projeto `projetinhoai`).
- [ ] 3 Variables `GCP_*` configuradas no GitHub → deploy automático em staging.
- [ ] Serviço de produção no Cloud Run com `min-instances=1` (builder sem cold
      start) e healthcheck em `/api/health`.
- [ ] Rollback ensaiado: apontar o tráfego para a revisão anterior.
- [ ] Segredos apenas no GCP Secret Manager (`DATABASE_URL`, `DIRECT_URL`,
      e, se usados, `RESEND_API_KEY`, `JOBS_OIDC_AUDIENCE`).
- [ ] Cloud Scheduler `appointment-reminders` criado (roda o bootstrap de novo
      após o 1º deploy) e `JOBS_OIDC_AUDIENCE` definido no serviço.

## Segurança e LGPD (Sentinela)

- [ ] RLS deny-all confirmado em todas as tabelas do app (Data API bloqueada).
- [ ] Bucket `attachments` privado; policies `is_org_member` / `is_patient_self`
      testadas (org não vê arquivo de outra org; paciente só vê o próprio).
- [ ] Rate limiting ativo no endpoint tRPC (`src/lib/rate-limit.ts`).
      Upgrade para Upstash/Redis se produção tiver várias instâncias.
- [ ] Exportação LGPD (`/api/pacientes/[id]/exportar`) e consentimento revisados.
- [ ] Nenhum dado clínico em logs/telemetria (checar Sentry e Cloud Logging).
- [ ] Rotação do PAT do GitHub e da senha do banco (foram usados no setup).

## Dados e backups (Átlas)

- [ ] Seeds de catálogo aplicados (`npm run db:seed`).
- [ ] TACO importada (`npm run import:taco`) — 597 alimentos.
- [ ] PITR do Supabase ativo; dump agendado com restore ensaiado.

## Observabilidade

- [ ] `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` configurados (opcional; inerte se vazio).
- [ ] Logs estruturados (pino) com `orgId` chegando ao Cloud Logging.

## Integrações futuras (pós-produção)

- Google Calendar e WhatsApp dependem de aprovações/custos de API de terceiros
  (fora do escopo atual; e-mail cobre lembretes).
