#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Bootstrap único do Google Cloud para o Projetinho.ai (rodar no Cloud Shell:
# https://console.cloud.google.com/ → ícone de terminal → colar este script).
#
# Cria: Artifact Registry, service accounts (deploy + runtime), Workload
# Identity Federation para o GitHub Actions (deploy sem chaves JSON) e os
# segredos DATABASE_URL / DIRECT_URL no Secret Manager.
#
# Idempotente: pode ser executado mais de uma vez.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ID="projetinhoai"
REGION="southamerica-east1"
GITHUB_REPO="rafaellapipucos-svg/projetinho.ai"
AR_REPO="app"
POOL="github"
PROVIDER="github"
DEPLOY_SA="github-deploy"
RUNTIME_SA="app-runtime"

echo "▶ Projeto: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"

echo "▶ Habilitando APIs…"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  secretmanager.googleapis.com \
  sts.googleapis.com

echo "▶ Artifact Registry (${AR_REPO}, ${REGION})…"
gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" >/dev/null 2>&1 ||
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker --location="${REGION}" \
    --description="Imagens do Projetinho.ai"

echo "▶ Service accounts…"
gcloud iam service-accounts describe "${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "${DEPLOY_SA}" --display-name="GitHub Actions deploy"
gcloud iam service-accounts describe "${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "${RUNTIME_SA}" --display-name="Cloud Run runtime"

echo "▶ Papéis IAM…"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --quiet \
  --member="serviceAccount:${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin" >/dev/null
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --quiet \
  --member="serviceAccount:${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" >/dev/null
gcloud iam service-accounts add-iam-policy-binding \
  "${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com" --quiet \
  --member="serviceAccount:${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" >/dev/null
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --quiet \
  --member="serviceAccount:${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" >/dev/null

echo "▶ Workload Identity Federation (GitHub → GCP sem chaves)…"
gcloud iam workload-identity-pools describe "${POOL}" --location=global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create "${POOL}" \
    --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe "${PROVIDER}" \
  --location=global --workload-identity-pool="${POOL}" >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER}" \
    --location=global --workload-identity-pool="${POOL}" \
    --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'"
gcloud iam service-accounts add-iam-policy-binding \
  "${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" --quiet \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${GITHUB_REPO}" \
  --role="roles/iam.workloadIdentityUser" >/dev/null

echo "▶ Segredos (cole os valores; entrada oculta)…"
create_or_update_secret() {
  local name="$1"
  local value="$2"
  if gcloud secrets describe "${name}" >/dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets versions add "${name}" --data-file=-
  else
    printf '%s' "${value}" | gcloud secrets create "${name}" --data-file=- --replication-policy=automatic
  fi
}
read -r -s -p "DATABASE_URL (pooler 6543): " DATABASE_URL_VALUE; echo
read -r -s -p "DIRECT_URL (pooler 5432): " DIRECT_URL_VALUE; echo
create_or_update_secret "DATABASE_URL" "${DATABASE_URL_VALUE}"
create_or_update_secret "DIRECT_URL" "${DIRECT_URL_VALUE}"

echo "▶ Cloud Scheduler: lembretes de consulta (diário, 08:00 BRT)…"
gcloud services enable cloudscheduler.googleapis.com >/dev/null 2>&1 || true
SERVICE_URL="$(gcloud run services describe projetinho-staging --region="${REGION}" --format='value(status.url)' 2>/dev/null || true)"
if [ -n "${SERVICE_URL}" ]; then
  REMINDER_URL="${SERVICE_URL}/api/jobs/appointment-reminders"
  if gcloud scheduler jobs describe appointment-reminders --location="${REGION}" >/dev/null 2>&1; then
    gcloud scheduler jobs update http appointment-reminders --location="${REGION}" \
      --uri="${REMINDER_URL}" --http-method=POST \
      --oidc-service-account-email="${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
      --oidc-token-audience="${REMINDER_URL}"
  else
    gcloud scheduler jobs create http appointment-reminders --location="${REGION}" \
      --schedule="0 8 * * *" --time-zone="America/Sao_Paulo" \
      --uri="${REMINDER_URL}" --http-method=POST \
      --oidc-service-account-email="${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
      --oidc-token-audience="${REMINDER_URL}"
  fi
  echo "  Lembretes agendados. Defina JOBS_OIDC_AUDIENCE=${REMINDER_URL} no Cloud Run."
else
  echo "  Serviço ainda não existe — rode este script de novo após o 1º deploy."
fi

echo
echo "════════════════════════════════════════════════════════════════════════"
echo "✔ Bootstrap concluído. Configure estas 3 Variables no repositório GitHub"
echo "  (Settings → Secrets and variables → Actions → Variables), ou devolva"
echo "  os valores ao Claude para configurá-los por você:"
echo
echo "GCP_WIF_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
echo "GCP_DEPLOY_SA=${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "GCP_RUNTIME_SA=${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "════════════════════════════════════════════════════════════════════════"
