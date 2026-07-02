import { redirect } from "next/navigation";

// O middleware redireciona "/" conforme a sessão; este fallback cobre
// qualquer caminho que escape do matcher.
export default function RootPage() {
  redirect("/login");
}
