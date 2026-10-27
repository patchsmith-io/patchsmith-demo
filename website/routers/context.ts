import { ORPCError } from "@orpc/server";
import { and, eq, gte } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/drizzle";
import { tenants } from "../lib/schema";
import { CURRENT_SETUP_VERSION } from "../lib/provision";

export type RpcTenant = Pick<typeof tenants.$inferSelect, "id" | "name" | "setupVersion">;

export async function tenantForUser(userId: string): Promise<RpcTenant> {
  const [tenant] = await db
    .select({ id: tenants.id, name: tenants.name, setupVersion: tenants.setupVersion })
    .from(tenants)
    .where(and(eq(tenants.userId, userId), gte(tenants.setupVersion, CURRENT_SETUP_VERSION)));
  if (!tenant) throw new ORPCError("FORBIDDEN", { message: "Workspace setup is not complete." });
  return tenant;
}

export async function tenantFromHeaders(headers: Headers): Promise<RpcTenant> {
  const session = await auth.api.getSession({ headers });
  if (!session)
    throw new ORPCError("UNAUTHORIZED", {
      message: "Your session expired. Refresh to create a demo workspace.",
    });
  return tenantForUser(session.user.id);
}

// Only trusted server callers use this with a session-derived tenant ID or a
// Patchsmith-verified workspace scope. The HTTP handler always uses cookie auth.
export async function tenantFromVerifiedId(id: string): Promise<RpcTenant> {
  const [tenant] = await db
    .select({ id: tenants.id, name: tenants.name, setupVersion: tenants.setupVersion })
    .from(tenants)
    .where(and(eq(tenants.id, id), gte(tenants.setupVersion, CURRENT_SETUP_VERSION)));
  if (!tenant) throw new ORPCError("NOT_FOUND", { message: "Workspace not found." });
  return tenant;
}

export type RpcContext = {
  subjectId?: string;
  request?: Request;
  afterResponse?: (work: () => Promise<void>) => void;
  resolveTenant: () => Promise<RpcTenant>;
  resolveUserId?: () => Promise<string>;
  tenant?: RpcTenant;
};

export function requestContext(headers: Headers): RpcContext {
  let user: Promise<string> | undefined;
  const resolveUserId = () =>
    (user ??= auth.api.getSession({ headers }).then((session) => {
      if (!session)
        throw new ORPCError("UNAUTHORIZED", {
          message: "Your session expired. Refresh to create a demo workspace.",
        });
      return session.user.id;
    }));
  return {
    resolveUserId,
    resolveTenant: async () => tenantForUser(await resolveUserId()),
  };
}

// Only use IDs resolved from a server session or verified Patchsmith identity/scope.
// Contact creation requires the creator's subjectId as well as the workspace.
// This capability does not grant access to session-only setup procedures.
export function verifiedWorkspaceContext(tenantId: string, subjectId?: string): RpcContext {
  return { subjectId, resolveTenant: () => tenantFromVerifiedId(tenantId) };
}
