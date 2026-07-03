# Configuração de Auth no Supabase

O código já traz o fluxo robusto de confirmação (`/auth/confirm` com
`verifyOtp`). Faltam ajustes no **painel do Supabase** (não dá para fazer por
código). Sem eles, o link do e-mail cai em `localhost` e/ou dá `otp_expired`.

Projeto: `vphtwrwbtwcywsvekman` · App: `https://projetinho-staging-774205716442.southamerica-east1.run.app`

## 1. Site URL e Redirect URLs (obrigatório)

Authentication → **URL Configuration**:

- **Site URL**: `https://projetinho-staging-774205716442.southamerica-east1.run.app`
- **Redirect URLs** (adicione as duas):
  - `https://projetinho-staging-774205716442.southamerica-east1.run.app/**`
  - `http://localhost:3000/**`

Isso resolve o link caindo em `localhost`.

## 2. Templates de e-mail (recomendado — resolve o `otp_expired`)

Authentication → **Emails** → templates. Troque o link para a rota robusta
`/auth/confirm` (usa `token_hash`, imune a prefetch de e-mail e a cookie de
outro navegador).

**Confirm signup**:

```html
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding"
>
  Confirmar meu e-mail
</a>
```

**Reset password**:

```html
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/atualizar-senha"
>
  Redefinir minha senha
</a>
```

## 3. Login com Google (opcional, mas recomendado)

Contorna a confirmação de e-mail por completo.

1. **Google Cloud Console** → APIs & Services → Credentials → Create OAuth
   client ID → **Web application**. Em _Authorized redirect URIs_:
   `https://vphtwrwbtwcywsvekman.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Providers → **Google** → cole Client ID e
   Client Secret → Enable.

## Atalho para testar já (sem e-mail)

O e-mail embutido do Supabase é limitadíssimo no plano free. Para testar sem
essa fricção: Authentication → Providers → **Email** → desmarque
**"Confirm email"**. O cadastro passa a logar na hora.

Para e-mail confiável em produção, configure SMTP próprio (ex.: Resend) em
Authentication → Emails → SMTP Settings.
