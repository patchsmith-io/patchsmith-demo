import { defineContract, experimental_canvas, hook, tool } from "patchsmith";
import { defaultBreakpoints, primitives, type PatchsmithTheme } from "patchsmith/zod";
import { z } from "zod";
import { schemas, stage, status } from "../routers/schemas";
import type { Contact, Deal, Workspace } from "./workspace";
import { skeletonWidths, skeletonHeights, skeletonRadii } from "./patchsmith-skeleton";
import { chartFields } from "./patchsmith-charts";

const siteHref = z
  .string()
  .regex(
    /^\/(?:contacts(?:\/[A-Za-z0-9-]+)?|pipeline|tasks|settings|apps\/(?!(?:\.|%2[eE]){1,2}\/)(?:[A-Za-z0-9_.!~*'()-]|%[0-9A-Fa-f]{2})+\/(?!(?:\.|%2[eE]){1,2}$)(?:[A-Za-z0-9_.!~*'()-]|%[0-9A-Fa-f]{2})+)?$/,
    "Choose a CRM page, contact detail URL, or app page URL.",
  );
// Component metadata uses Patchsmith's restricted JSON Schema dialect. Refinements
// preserve runtime limits without emitting unsupported string-length keywords.
const text = z.string().refine((value) => value.length <= 4000, "Maximum 4000 characters.");
const label = z
  .string()
  .refine((value) => value.length >= 1 && value.length <= 120, "Use 1–120 characters.");
const disabled = z.boolean().optional();
const buttonVariant = z.enum([
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "destructive-outline",
  "link",
]);
const externalHref = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return /^https?:\/\//i.test(value) && (url.protocol === "https:" || url.protocol === "http:");
  } catch {
    return false;
  }
}, "Use an absolute HTTP or HTTPS URL.");
const onChange = { input: z.object({ value: z.string() }) };
const onCheckedChange = { input: z.object({ checked: z.boolean() }) };
const tone = z.enum(["default", "info", "success", "warning", "error"]);
const serverTool = <I extends z.ZodType, O extends z.ZodType>(schema: { input: I; output: O }) =>
  tool.server().input(schema.input).output(schema.output);

// Pass the same theme to schema generation and the renderer so token names and
// their runtime CSS values cannot drift. Use SDK defaults for layout and spacing;
// semantic color variables follow light/dark mode.
export const patchsmithTheme = {
  // The renderer reads these directly when emitting responsive primitive CSS.
  breakpoints: defaultBreakpoints,
  tokens: {
    background: {
      default: "var(--background)",
      card: "var(--card)",
      popover: "var(--popover)",
      primary: "var(--primary)",
      secondary: "var(--secondary)",
      muted: "var(--muted)",
      accent: "var(--accent)",
      sidebar: "var(--sidebar)",
      transparent: "transparent",
      success: "color-mix(in srgb, var(--success) 8%, var(--background))",
      warning: "color-mix(in srgb, var(--warning) 8%, var(--background))",
      info: "color-mix(in srgb, var(--info) 8%, var(--background))",
      destructive: "color-mix(in srgb, var(--destructive) 8%, var(--background))",
    },
    borderColor: {
      default: "var(--border)",
      input: "var(--input)",
      ring: "var(--ring)",
      destructive: "var(--destructive)",
      transparent: "transparent",
    },
    textColor: {
      default: "var(--foreground)",
      muted: "var(--muted-foreground)",
      primary: "var(--primary)",
      onPrimary: "var(--primary-foreground)",
      onSecondary: "var(--secondary-foreground)",
      card: "var(--card-foreground)",
      popover: "var(--popover-foreground)",
      success: "var(--success-foreground)",
      warning: "var(--warning-foreground)",
      info: "var(--info-foreground)",
      destructive: "var(--destructive-foreground)",
    },
  },
} satisfies PatchsmithTheme;

// View metadata uses Patchsmith's restricted schema dialect. Keep fields and
// enums aligned with tool records, without unsupported formats or size limits.
const contact = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  company: z.string(),
  role: z.string(),
  status,
  createdAt: z.string(),
});
const deal = z.object({
  id: z.string(),
  title: z.string(),
  value: z.number(),
  stage,
  closeDate: z.string(),
  contactId: z.string().nullable(),
  createdAt: z.string(),
  position: z.number(),
});
const task = z.object({
  id: z.string(),
  title: z.string(),
  dueDate: z.string(),
  contactId: z.string().nullable(),
  completed: z.boolean(),
  createdAt: z.string(),
});
const activity = z.object({
  id: z.string(),
  contactId: z.string().nullable(),
  type: z.enum(["note", "contact", "deal", "task"]),
  title: z.string(),
  description: z.string(),
  createdAt: z.string(),
});
const currency = z.literal("USD");
const usage = schemas.workspace.get.output.shape.usage;

const views = {
  "/": z.object({ workspace: z.object({ id: z.string(), name: z.string() }), page: z.string() }),
  "/overview": z.object({
    contacts: z.array(contact),
    deals: z.array(deal),
    tasks: z.array(task),
    recentActivities: z.array(activity),
    summary: z.object({
      contacts: z.number(),
      customers: z.number(),
      activeAccounts: z.number(),
      openDeals: z.number(),
      pipelineValue: z.number(),
      revenue: z.number(),
      pendingTasks: z.number(),
    }),
    currency,
  }),
  "/contacts": z.object({
    contacts: z.array(contact),
    count: z.number(),
    filters: z
      .object({ query: z.string(), status: z.union([z.literal("all"), status]) })
      .optional(),
    sort: z
      .object({ field: z.enum(["name", "company", "email"]), direction: z.enum(["asc", "desc"]) })
      .optional(),
    pagination: z
      .object({ page: z.number(), pageSize: z.number(), totalPages: z.number(), total: z.number() })
      .optional(),
    visibleContactIds: z.array(z.string()).optional(),
    selectedContactIds: z.array(z.string()).optional(),
  }),
  "/contacts/detail": z.object({
    contact,
    deals: z.array(deal),
    tasks: z.array(task),
    activities: z.array(activity),
    activeTab: z.enum(["activity", "follow-ups", "opportunities"]),
    currency,
  }),
  "/pipeline": z.object({
    deals: z.array(deal),
    contacts: z.array(contact),
    filters: z.object({ query: z.string() }),
    stages: z.array(z.object({ stage, count: z.number(), totalValue: z.number() })),
    totalValue: z.number(),
    currency,
  }),
  "/tasks": z.object({
    tasks: z.array(task),
    contacts: z.array(contact),
    summary: z.object({ total: z.number(), pending: z.number(), completed: z.number() }),
  }),
  "/settings": z.object({ usage, currency }),
  "/app-pages": z.object({ appPage: z.object({ appId: z.string(), instanceKey: z.string() }) }),
};

const viewPaths = Object.keys(views) as (keyof typeof views)[];

export const contract = defineContract({
  scopes: { workspace: z.object({ workspaceId: z.string().min(1) }) },
  hooks: {
    "contacts.created": hook().input(
      z.object({ contact: schemas.contacts.create.output.shape.contact }),
    ),
    "deals.created": hook().input(z.object({ deal: schemas.deals.create.output.shape.deal })),
    "tasks.completed": hook().input(
      z.object({ task: schemas.tasks.setCompleted.output.shape.task }),
    ),
  },
  components: {
    ...primitives(patchsmithTheme),
    Canvas: experimental_canvas({
      maxPixels: 640 * 480,
      maxFramesPerSecond: 35,
      input: {
        pointer: true,
        keyboard: [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "KeyF",
          "KeyE",
          "KeyP",
          "Enter",
          "Space",
          "ShiftLeft",
          "ShiftRight",
          "Digit1",
          "Digit2",
          "Digit3",
          "Digit4",
          "Digit5",
          "Digit6",
          "Digit7",
        ],
      },
    }),
    Text: {
      fields: z.object({
        text,
        tone: z.enum(["default", "muted", "success", "warning", "destructive"]).optional(),
        size: z.enum(["xs", "sm", "base", "lg"]).optional(),
      }),
    },
    Heading: { fields: z.object({ text: label, level: z.enum(["h2", "h3", "h4"]).optional() }) },
    Button: {
      fields: z.object({
        label,
        variant: buttonVariant.optional(),
        size: z.enum(["xs", "sm", "default", "lg"]).optional(),
        disabled,
        href: externalHref.optional(),
        type: z.enum(["button", "submit", "reset"]).optional(),
      }),
      callbacks: { onClick: {} },
    },
    Badge: {
      fields: z.object({
        text: label,
        variant: z
          .enum([
            "default",
            "secondary",
            "outline",
            "info",
            "success",
            "warning",
            "error",
            "destructive",
          ])
          .optional(),
      }),
    },
    Card: { fields: z.object({ title: label, description: text.optional() }), children: true },
    Tabs: {
      fields: z.object({
        label,
        value: label,
        options: z
          .array(z.object({ label, value: label }))
          .refine((options) => options.length >= 2 && options.length <= 7, "Use 2–7 tabs.")
          .refine(
            (options) => new Set(options.map(({ value }) => value)).size === options.length,
            "Tab values must be unique.",
          ),
      }),
      children: true,
      callbacks: { onChange },
    },
    Alert: {
      fields: z.object({ title: label, description: text.optional(), variant: tone.optional() }),
    },
    Empty: {
      fields: z.object({
        title: label,
        description: text.optional(),
        icon: z.enum(["route", "gamepad", "users", "credit-card", "inbox", "file"]).optional(),
      }),
      children: true,
    },
    Form: {
      description:
        "Handles native form validation and submission through onSubmit. Add explicit Button children with type: 'submit'; Form adds no buttons or layout. When used inside a Dialog, wrap both the fields and DialogActions in this Form so a Button with type: 'submit' inside DialogActions submits the form. The submit button must be inside the Form.",
      fields: z.object({
        disabled,
      }),
      children: true,
      callbacks: { onSubmit: {} },
    },
    Fieldset: {
      fields: z.object({ legend: label.optional(), disabled }),
      children: true,
    },
    Input: {
      fields: z.object({
        label,
        value: text,
        placeholder: label.optional(),
        type: z.enum(["text", "email", "number", "date", "search", "url", "tel"]).optional(),
        disabled,
        required: z.boolean().optional(),
      }),
      callbacks: { onChange },
    },
    Textarea: {
      fields: z.object({
        label,
        value: text,
        placeholder: label.optional(),
        submitOnEnter: z.boolean().optional(),
        disabled,
        required: z.boolean().optional(),
      }),
      callbacks: { onChange },
    },
    Select: {
      description:
        "Choose one value from a short fixed list. For searchable record pickers such as contacts, use Combobox instead; it combines search and selection in one input.",
      fields: z.object({
        label,
        value: z.string().nullable(),
        options: z
          .array(
            z.object({ label, value: z.string().refine((v) => v.length >= 1 && v.length <= 200) }),
          )
          .max(100),
        disabled,
      }),
      callbacks: { onChange },
    },
    Combobox: {
      description:
        "A single searchable picker: typing filters the supplied option labels and descriptions locally in the host, without tool calls or sandbox round trips. Use for contact and other record selection instead of a separate search Input and Select. Fetch a complete, bounded option list once and pass options as { value: record.id, label: record.name, description: record.email }. value is the selected ID or null; onChange emits { value: id } on selection and { value: null } on clearing. Set loading during the initial fetch to keep the same input in place with a compact spinner; emptyMessage is shown inside the popup only after loading. clearable defaults to true; set required for mandatory selection.",
      fields: z.object({
        label,
        value: z.string().nullable(),
        options: z
          .array(
            z.object({
              label,
              value: z.string().refine((v) => v.length >= 1 && v.length <= 200),
              description: text.optional(),
            }),
          )
          .max(100),
        placeholder: label.optional(),
        emptyMessage: label.optional(),
        loading: z.boolean().optional(),
        clearable: z.boolean().optional(),
        required: z.boolean().optional(),
        disabled,
      }),
      callbacks: { onChange: { input: z.object({ value: z.string().nullable() }) } },
    },
    Checkbox: {
      fields: z.object({ label, checked: z.boolean(), disabled }),
      callbacks: { onCheckedChange },
    },
    Switch: {
      fields: z.object({ label, checked: z.boolean(), disabled }),
      callbacks: { onCheckedChange },
    },
    Progress: { fields: z.object({ label, value: z.number().min(0).max(100) }) },
    AreaChart: { fields: chartFields },
    BarChart: { fields: chartFields },
    Separator: { fields: z.object({ orientation: z.enum(["horizontal", "vertical"]).optional() }) },
    Avatar: { fields: z.object({ name: label }) },
    Spinner: { fields: z.object({ label }) },
    Skeleton: {
      fields: z.object({
        width: z.enum(Object.keys(skeletonWidths) as (keyof typeof skeletonWidths)[]).optional(),
        height: z.enum(Object.keys(skeletonHeights) as (keyof typeof skeletonHeights)[]).optional(),
        radius: z.enum(Object.keys(skeletonRadii) as (keyof typeof skeletonRadii)[]).optional(),
      }),
    },
    Table: { fields: z.object({ label }), children: true },
    TableHeader: { children: true },
    TableBody: { children: true },
    TableRow: { children: true },
    TableHead: { fields: z.object({ text: label }) },
    TableCell: { children: true },
    Dialog: {
      description:
        "Displays a modal with a title and optional description. Put Cancel and Save Button children in DialogActions to keep them inline. For a modal form, place Form inside Dialog and wrap both the fields and DialogActions in that Form. Set Save to type: 'submit', handle saving in Form.onSubmit, and close Cancel through its onClick. Dialog handles the modal and onOpenChange, not form submission.",
      fields: z.object({
        title: label,
        description: text.optional(),
        open: z.boolean(),
      }),
      children: true,
      callbacks: {
        onOpenChange: { input: z.object({ open: z.boolean() }) },
      },
    },
    DialogActions: { fields: z.object({}), children: true },
  },
  tools: {
    workspace: { get: serverTool(schemas.workspace.get) },
    contacts: {
      list: serverTool(schemas.contacts.list),
      get: serverTool(schemas.contacts.get),
      create: serverTool(schemas.contacts.create),
      update: serverTool(schemas.contacts.update),
      delete: serverTool(schemas.contacts.delete),
    },
    deals: {
      list: serverTool(schemas.deals.list),
      create: serverTool(schemas.deals.create),
      update: serverTool(schemas.deals.update),
      delete: serverTool(schemas.deals.delete),
      move: serverTool(schemas.deals.move),
    },
    tasks: {
      list: serverTool(schemas.tasks.list),
      create: serverTool(schemas.tasks.create),
      update: serverTool(schemas.tasks.update),
      delete: serverTool(schemas.tasks.delete),
      setCompleted: serverTool(schemas.tasks.setCompleted),
    },
    activities: {
      list: serverTool(schemas.activities.list),
      addNote: serverTool(schemas.activities.addNote),
    },
    ui: {
      navigate: tool.client().input(z.object({ href: siteHref })),
      openAppPage: tool.client().input(z.object({ instanceKey: z.string() })),
      openPanel: tool.client(),
      refresh: tool.client(),
      setTheme: tool.client().input(z.object({ theme: z.enum(["light", "dark", "system"]) })),
      notify: tool.client().input(
        z.object({
          title: label,
          description: text.optional(),
          type: z.enum(["success", "error", "info", "warning"]).optional(),
        }),
      ),
    },
  },
  views,
  slots: {
    navbar: { views: viewPaths },
    panel: { views: viewPaths },
    page: { views: ["/"], multiple: true },
  },
});

// Parse through the public record schemas to omit tenant IDs and normalize the
// snapshot's ISO timestamps into the calendar dates used by app tools.
function contactRecords(workspace: Workspace) {
  return workspace.contacts.map((row) => contact.parse(row));
}
function dealRecords(rows: Deal[]) {
  return rows.map((row) => deal.parse({ ...row, closeDate: row.closeDate.slice(0, 10) }));
}
function taskRecords(workspace: Workspace) {
  return workspace.tasks.map((row) => task.parse({ ...row, dueDate: row.dueDate.slice(0, 10) }));
}

export function overviewViewContext(workspace: Workspace) {
  const data = {
    contacts: contactRecords(workspace),
    deals: dealRecords(workspace.deals),
    tasks: taskRecords(workspace),
  };
  const openDeals = data.deals.filter((row) => row.stage !== "won" && row.stage !== "lost");
  return {
    ...data,
    recentActivities: workspace.activities.map((row) => activity.parse(row)),
    summary: {
      contacts: data.contacts.length,
      customers: data.contacts.filter((row) => row.status === "customer").length,
      activeAccounts: data.contacts.filter((row) => row.status !== "lead").length,
      openDeals: openDeals.length,
      pipelineValue: openDeals.reduce((sum, row) => sum + row.value, 0),
      revenue: data.deals
        .filter((row) => row.stage === "won")
        .reduce((sum, row) => sum + row.value, 0),
      pendingTasks: data.tasks.filter((row) => !row.completed).length,
    },
    currency: "USD" as const,
  };
}

export function contactsViewContext(workspace: Workspace) {
  return { contacts: contactRecords(workspace), count: workspace.contacts.length };
}

export function contactViewContext(
  workspace: Workspace,
  selected: Contact,
  activeTab: "activity" | "follow-ups" | "opportunities",
) {
  return {
    contact: contact.parse(selected),
    deals: dealRecords(workspace.deals.filter((row) => row.contactId === selected.id)),
    tasks: taskRecords(workspace).filter((row) => row.contactId === selected.id),
    activities: workspace.activities
      .filter((row) => row.contactId === selected.id)
      .map((row) => activity.parse(row)),
    activeTab,
    currency: "USD" as const,
  };
}

export function pipelineViewContext(workspace: Workspace, visibleDeals: Deal[], query: string) {
  const deals = dealRecords(visibleDeals);
  return {
    deals,
    contacts: contactRecords(workspace),
    filters: { query },
    stages: stage.options.map((value) => {
      const rows = deals.filter((row) => row.stage === value);
      return {
        stage: value,
        count: rows.length,
        totalValue: rows.reduce((sum, row) => sum + row.value, 0),
      };
    }),
    totalValue: deals.reduce((sum, row) => sum + row.value, 0),
    currency: "USD" as const,
  };
}

export function tasksViewContext(workspace: Workspace) {
  const tasks = taskRecords(workspace);
  const completed = tasks.filter((row) => row.completed).length;
  return {
    tasks,
    contacts: contactRecords(workspace),
    summary: { total: tasks.length, pending: tasks.length - completed, completed },
  };
}

export function settingsViewContext(workspace: Workspace) {
  return {
    usage: {
      contacts: workspace.contacts.length,
      deals: workspace.deals.length,
      tasks: workspace.tasks.length,
      limit: 50,
    },
    currency: "USD" as const,
  };
}
