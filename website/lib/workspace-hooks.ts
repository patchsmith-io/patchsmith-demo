import type { InferHookInput } from "patchsmith";
import type { contract } from "./patchsmith";
import type { RpcContext, RpcTenant } from "../routers/context";

export type WorkspaceHookEvent = {
  [Name in keyof typeof contract.hooks]: {
    name: Name;
    input: InferHookInput<(typeof contract.hooks)[Name]>;
  };
}[keyof typeof contract.hooks];

// Call only after the database commit. Browser requests defer delivery until
// after the response; direct server and app-tool calls await bounded delivery.
export async function emitWorkspaceHook(
  context: Pick<RpcContext, "afterResponse" | "request"> & { tenant: RpcTenant },
  event: WorkspaceHookEvent,
) {
  if (!process.env.PATCHSMITH_PROJECT_KEY) return;
  const deliver = async () => {
    try {
      // The host imports the same domain procedures, so load it lazily.
      const { dispatchWorkspaceHook } = await import("./patchsmith-server");
      await dispatchWorkspaceHook(context.tenant.id, event, context.request);
    } catch {
      // A hook failure must never turn an already committed write into a retry.
      console.error("Patchsmith hook delivery failed:", event.name);
    }
  };
  if (context.afterResponse) {
    try {
      context.afterResponse(deliver);
    } catch {
      await deliver();
    }
  } else {
    await deliver();
  }
}
