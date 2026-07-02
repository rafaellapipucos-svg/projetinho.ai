/**
 * Fonte única das strings de UI em pt-BR (princípio 6 da arquitetura).
 * Nenhum texto de interface deve ser escrito solto em JSX.
 */
export const messages = {
  app: {
    name: "Projetinho.ai",
    description: "Plataforma de gestão nutricional para profissionais de saúde",
  },
  auth: {
    loginTitle: "Entrar",
    loginSubtitle: "Acesse sua conta para continuar",
    signupTitle: "Criar conta",
    signupSubtitle: "Comece a usar a plataforma em minutos",
    recoverTitle: "Recuperar senha",
    recoverSubtitle: "Enviaremos um link de redefinição para o seu e-mail",
    updatePasswordTitle: "Definir nova senha",
    updatePasswordSubtitle: "Escolha uma nova senha para a sua conta",
    emailLabel: "E-mail",
    passwordLabel: "Senha",
    passwordConfirmLabel: "Confirmar senha",
    nameLabel: "Nome completo",
    loginButton: "Entrar",
    signupButton: "Criar conta",
    recoverButton: "Enviar link",
    updatePasswordButton: "Salvar nova senha",
    noAccount: "Ainda não tem conta?",
    signupLink: "Cadastre-se",
    hasAccount: "Já tem conta?",
    loginLink: "Entrar",
    forgotPassword: "Esqueceu a senha?",
    checkEmailTitle: "Confira seu e-mail",
    checkEmailBody:
      "Se o cadastro foi criado, enviamos um link de confirmação para o endereço informado. Abra o link para ativar sua conta.",
    recoverSentTitle: "Link enviado",
    recoverSentBody:
      "Se existir uma conta com esse e-mail, você receberá um link para redefinir a senha.",
    passwordUpdated: "Senha atualizada com sucesso.",
    invalidCredentials: "E-mail ou senha incorretos.",
    emailNotConfirmed:
      "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
    linkInvalid: "O link de acesso é inválido ou expirou. Tente novamente.",
    genericError:
      "Não foi possível completar a ação. Tente novamente em instantes.",
    signOut: "Sair",
  },
  onboarding: {
    title: "Crie sua clínica",
    subtitle:
      "Este é o espaço de trabalho da sua equipe. Você poderá ajustar os dados depois, nas configurações.",
    orgNameLabel: "Nome da clínica ou consultório",
    orgNamePlaceholder: "Ex.: Clínica Vida Leve",
    submitButton: "Criar clínica",
    greeting: (name: string) => `Olá, ${name}!`,
  },
  dashboard: {
    title: "Dashboard",
    welcome: (name: string) => `Bem-vindo(a), ${name}`,
    orgCardTitle: "Sua clínica",
    orgRoleLabel: "Seu papel",
    orgSlugLabel: "Identificador",
    emptyStateTitle: "Fundação concluída",
    emptyStateBody:
      "A base do sistema está no ar: autenticação, clínica e permissões. Os módulos de alimentos, pacientes e planos alimentares chegam nas próximas fases.",
  },
  nav: {
    dashboard: "Dashboard",
  },
  validation: {
    required: "Campo obrigatório.",
    emailInvalid: "Informe um e-mail válido.",
    passwordMin: "A senha deve ter pelo menos 8 caracteres.",
    passwordConfirmMismatch: "As senhas não coincidem.",
    nameMin: "Informe seu nome completo.",
    orgNameMin: "O nome da clínica deve ter pelo menos 2 caracteres.",
    orgNameMax: "O nome da clínica deve ter no máximo 80 caracteres.",
  },
  errors: {
    unauthorized: "Sessão expirada. Entre novamente.",
    noOrganization: "Você ainda não participa de uma clínica.",
    alreadyInOrganization: "Você já participa de uma clínica.",
    internal: "Ocorreu um erro inesperado. Tente novamente.",
  },
} as const;
