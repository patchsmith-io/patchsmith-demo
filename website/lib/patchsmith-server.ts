import { createServer } from "patchsmith/server";
import type { InferHookInput, ToolContext } from "patchsmith";
import { call } from "@orpc/server";
import * as workspace from "../routers/workspace";
import * as contacts from "../routers/contacts";
import * as deals from "../routers/deals";
import * as tasks from "../routers/tasks";
import * as activities from "../routers/activities";
import { verifiedWorkspaceContext } from "../routers/context";
import { contract } from "./patchsmith";
import { patchsmithOrigin, patchsmithRequestOrigin } from "./patchsmith-origin";

// Patchsmith verifies the capability before calling a tool. Workspace identity
// comes from its signed scope, never from tool input.
function rpcContext(context: ToolContext) {
  if (context.scope.name !== "workspace") throw new Error("A workspace scope is required.");
  const { workspaceId } = contract.scopes.workspace.parse(context.scope.value);
  return verifiedWorkspaceContext(workspaceId, context.identity.subjectId);
}

function createHost(origin: string) {
  return createServer({
    contract,
    agent: {
      instructions: [
        "Always add a panel slot, even if the app has no functionality for it.",
        "Whenever a page, panel, or section has nothing to display after loading, use our Empty component. This includes missing data, no matching results, and panel slots with no functionality. Give it a clear title and a helpful description, and include a relevant action as a child when one is available. For input-level feedback, use the control's built-in loading and empty states instead of inserting page-level Alert or Empty blocks between form fields.",
        "This demo allows at most 50 contacts per workspace. tools.contacts.list({}) returns the complete list. For contact selection, fetch it once when needed and use Combobox to search names and email descriptions locally. Reuse loaded options while the form remains mounted and preserve the current contact selection. Keep the picker in place with loading=true during the initial fetch; do not add a separate search Input or refetch on each keystroke.",
        "When building forms or groups of inputs, wrap the inputs in our Fieldset component and use it to handle their layout and spacing.",
        "For modal forms, compose Dialog > Form > Fieldset and DialogActions. Put the inputs in Fieldset and Cancel/Save Button children in DialogActions, inside the same Form. DialogActions lays out its children horizontally. Form.onSubmit handles saving, native validation, and Enter submission; Save must have type: 'submit', and Cancel uses onClick to close the dialog. Set Form.disabled and Button.disabled while saving. Dialog only handles the modal and onOpenChange; do not put onSubmit on Dialog. Form adds no buttons or layout, so always provide explicit buttons inside it. For inline forms, use Form with an explicit submit Button.",
      ].join("\n\n"),
    },
    tools: {
      workspace: {
        get: async ({ input, context }) =>
          call(workspace.getWorkspace, input, { context: rpcContext(context) }),
      },
      contacts: {
        list: async ({ input, context }) =>
          call(contacts.listContacts, input, { context: rpcContext(context) }),
        get: async ({ input, context }) =>
          call(contacts.getContact, input, { context: rpcContext(context) }),
        create: async ({ input, context }) =>
          call(contacts.createContact, input, { context: rpcContext(context) }),
        update: async ({ input, context }) =>
          call(contacts.updateContact, input, { context: rpcContext(context) }),
        delete: async ({ input, context }) =>
          call(contacts.deleteContact, input, { context: rpcContext(context) }),
      },
      deals: {
        list: async ({ input, context }) =>
          call(deals.listDeals, input, { context: rpcContext(context) }),
        create: async ({ input, context }) =>
          call(deals.createDeal, input, { context: rpcContext(context) }),
        update: async ({ input, context }) =>
          call(deals.updateDeal, input, { context: rpcContext(context) }),
        delete: async ({ input, context }) =>
          call(deals.deleteDeal, input, { context: rpcContext(context) }),
        move: async ({ input, context }) =>
          call(deals.moveDeal, input, { context: rpcContext(context) }),
      },
      tasks: {
        list: async ({ input, context }) =>
          call(tasks.listTasks, input, { context: rpcContext(context) }),
        create: async ({ input, context }) =>
          call(tasks.createTask, input, { context: rpcContext(context) }),
        update: async ({ input, context }) =>
          call(tasks.updateTask, input, { context: rpcContext(context) }),
        delete: async ({ input, context }) =>
          call(tasks.deleteTask, input, { context: rpcContext(context) }),
        setCompleted: async ({ input, context }) =>
          call(tasks.setTaskCompleted, input, { context: rpcContext(context) }),
      },
      activities: {
        list: async ({ input, context }) =>
          call(activities.listActivities, input, { context: rpcContext(context) }),
        addNote: async ({ input, context }) =>
          call(activities.addNote, input, { context: rpcContext(context) }),
      },
    },
    projectKey: process.env.PATCHSMITH_PROJECT_KEY,
    baseUrl: new URL("/api/patchsmith", origin),
  });
}

export const patchsmith = createHost(patchsmithOrigin());

export async function notifyContactCreated(
  workspaceId: string,
  subjectId: string,
  input: InferHookInput<typeof contract.hooks.contactCreated>,
) {
  const context = { subjectId, scopes: { workspace: { workspaceId } } };
  try {
    const apps = await patchsmith.hooks.contactCreated.list(context);
    for (const app of apps) {
      try {
        await patchsmith.hooks.contactCreated.invoke({ ...context, appId: app.id, input });
      } catch (error) {
        console.error("Contact-created hook failed:", app.id, error);
      }
    }
  } catch (error) {
    console.error("Contact-created hook discovery failed:", error);
  }
}

const hosts = new Map([[patchsmithOrigin(), patchsmith]]);

export function patchsmithForRequest(request: Request) {
  const origin = patchsmithRequestOrigin(request.url);
  let host = hosts.get(origin);
  if (!host) {
    host = createHost(origin);
    hosts.set(origin, host);
  }
  return host;
}
