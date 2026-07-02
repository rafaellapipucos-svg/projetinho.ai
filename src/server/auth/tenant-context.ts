import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db";
import { userRepo } from "@/server/repositories/user-repo";
import { organizationRepo } from "@/server/repositories/organization-repo";

export interface TenantUser {
  id: string;
  authId: string;
  name: string;
  email: string;
}

export interface TenantMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  roleKey: string;
  roleName: string;
}

export interface TenantContext {
  user: TenantUser;
  membership: TenantMembership | null;
}

/**
 * Resolve o contexto de tenant da requisição atual:
 * sessão Supabase → espelho em public.users → participação ativa em clínica.
 * Memoizado por requisição via React cache.
 */
export const getTenantContext = cache(
  async (): Promise<TenantContext | null> => {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const email = authUser.email ?? "";
    const metadataName = authUser.user_metadata?.name;
    const name =
      typeof metadataName === "string" && metadataName.trim().length > 0
        ? metadataName.trim()
        : (email.split("@")[0] ?? "");

    const user = await userRepo.ensureMirror(prisma, {
      authId: authUser.id,
      email,
      name,
    });

    const membership = await organizationRepo.findFirstMembershipByUser(
      prisma,
      user.id,
    );

    return {
      user: {
        id: user.id,
        authId: user.authId,
        name: user.name,
        email: user.email,
      },
      membership: membership
        ? {
            organizationId: membership.organizationId,
            organizationName: membership.organization.name,
            organizationSlug: membership.organization.slug,
            roleKey: membership.role.key,
            roleName: membership.role.name,
          }
        : null,
    };
  },
);
