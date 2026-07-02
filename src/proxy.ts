import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = new Set(["/login", "/cadastro", "/recuperar-senha"]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth");
}

export default async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Preserva os cookies de sessão renovados pelo Supabase.
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user && !isPublicPath(pathname)) {
    return redirectTo("/login");
  }

  if (user && (pathname === "/" || PUBLIC_PATHS.has(pathname))) {
    return redirectTo("/dashboard");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
