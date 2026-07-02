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
