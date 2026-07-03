import { expect, test } from "@playwright/test";
import { messages } from "../src/messages/pt-br";

test("raiz redireciona para /login e o formulário renderiza", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel(messages.auth.emailLabel)).toBeVisible();
  await expect(page.getByLabel(messages.auth.passwordLabel)).toBeVisible();
  await expect(
    page.getByRole("button", { name: messages.auth.loginButton }),
  ).toBeVisible();
});

test("rota protegida sem sessão volta para /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("healthcheck responde 200 sem redirecionar (rota de API)", async ({
  request,
}) => {
  const response = await request.get("/api/health", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("manifest da PWA responde com nome e ícone", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    display: string;
    icons: Array<{ src: string }>;
  };
  expect(manifest.name).toBe(messages.app.name);
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThan(0);
});
