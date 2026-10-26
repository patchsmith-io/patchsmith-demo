"use client";

import { createContext, useContext, useEffect, useId, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { orpc } from "./orpc";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient, experimental_canvasRenderer, primitives } from "patchsmith/react";
import { contract, patchsmithTheme } from "./patchsmith";
import { skeletonWidths, skeletonHeights, skeletonRadii } from "./patchsmith-skeleton";
import dynamic from "next/dynamic";
import type { ChartConfig } from "@/components/ui/chart";
import type { AppChartProps } from "./patchsmith-charts";
import { toastManager } from "@/components/ui/toast";
import {
  patchsmithQueryKey,
  viewsQueryOptions,
  type ViewSlot,
  type ViewWorkspace,
} from "./patchsmith-queries";

import { cn } from "@/lib/utils";
import { installedAppPageHref } from "./app-pages";
import {
  CreditCardIcon,
  FileIcon,
  GamepadIcon,
  InboxIcon,
  RouteIcon,
  UsersIcon,
} from "lucide-react";
import { AppSlotButton } from "@/components/app/app-slot-button";
import { AppSlotCombobox } from "@/components/app/app-slot-combobox";
import { AppSlotTabs } from "@/components/app/app-slot-tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AppForm, AppDialog, AppDialogActions } from "@/components/app-form";

const textTones = {
  default: "text-inherit",
  muted: "text-muted-foreground",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  destructive: "text-destructive-foreground",
};
const textSizes = { xs: "text-xs", sm: "text-sm", base: "text-base", lg: "text-lg" };
const emptyIcons = {
  route: RouteIcon,
  gamepad: GamepadIcon,
  users: UsersIcon,
  "credit-card": CreditCardIcon,
  inbox: InboxIcon,
  file: FileIcon,
};
function LabeledControl({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </Field>
  );
}

type HostAction =
  | { type: "navigate"; href: string }
  | { type: "open-app-page"; appId: string; instanceKey: string }
  | { type: "open-panel"; appId: string }
  | { type: "refresh" }
  | { type: "theme"; theme: "light" | "dark" | "system" };
type HostActionDetail = { action: HostAction; handled: boolean; result?: Promise<void> };
const hostActionEvent = "patchsmith:host-action";
const AppChart = dynamic(loadAppChart, {
  loading: () => <Skeleton className="h-64 w-full" aria-hidden="true" />,
});
function dispatch(action: HostAction) {
  const detail: HostActionDetail = { action, handled: false };
  window.dispatchEvent(new CustomEvent(hostActionEvent, { detail }));
  if (!detail.handled) throw new Error("The workspace is not ready. Please try again.");
  return detail.result;
}

export const patchsmithClient = createClient({
  contract,
  theme: patchsmithTheme,
  baseUrl: new URL(
    "/api/patchsmith",
    typeof window === "undefined" ? "http://localhost:3000" : window.location.origin,
  ),
  components: {
    ...primitives,
    Canvas: experimental_canvasRenderer,
    AreaChart: ({ props }) => <AppChart {...props} type="area" />,
    BarChart: ({ props }) => <AppChart {...props} type="bar" />,
    Text: ({ props }) => (
      <p className={cn(textTones[props.tone ?? "default"], textSizes[props.size ?? "sm"])}>
        {props.text}
      </p>
    ),
    Heading: ({ props }) => {
      const Tag = props.level ?? "h2";
      return <Tag className="text-lg font-semibold tracking-tight">{props.text}</Tag>;
    },
    Button: ({ props }) => <AppSlotButton {...props} />,
    Tabs: ({ props, children }) => <AppSlotTabs {...props}>{children}</AppSlotTabs>,
    Badge: ({ props }) => <Badge variant={props.variant}>{props.text}</Badge>,
    Card: ({ props, children }) => (
      <Card>
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
          {props.description ? <CardDescription>{props.description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    ),
    Alert: ({ props }) => (
      <Alert variant={props.variant}>
        <AlertTitle>{props.title}</AlertTitle>
        {props.description ? <AlertDescription>{props.description}</AlertDescription> : null}
      </Alert>
    ),
    Empty: ({ props, children }) => {
      const Icon = props.icon ? emptyIcons[props.icon] : null;
      return (
        <Empty>
          <EmptyHeader>
            {Icon ? (
              <EmptyMedia variant="icon">
                <Icon aria-hidden="true" />
              </EmptyMedia>
            ) : null}
            <EmptyTitle>{props.title}</EmptyTitle>
            {props.description ? <EmptyDescription>{props.description}</EmptyDescription> : null}
          </EmptyHeader>
          {children ? <EmptyContent>{children}</EmptyContent> : null}
        </Empty>
      );
    },
    Form: ({ props, children }) => <AppForm {...props}>{children}</AppForm>,
    Fieldset: ({ props, children }) => (
      <Fieldset className="flex w-full flex-col gap-4" disabled={props.disabled}>
        {props.legend ? <FieldsetLegend>{props.legend}</FieldsetLegend> : null}
        {children}
      </Fieldset>
    ),
    Input: ({ props }) => (
      <LabeledControl label={props.label}>
        <Input
          aria-label={props.label}
          value={props.value}
          placeholder={props.placeholder}
          type={props.type}
          disabled={props.disabled}
          required={props.required}
          onChange={(event) => props.onChange?.({ value: event.currentTarget.value })}
        />
      </LabeledControl>
    ),
    Textarea: ({ props }) => (
      <LabeledControl label={props.label}>
        <Textarea
          aria-label={props.label}
          value={props.value}
          placeholder={props.placeholder}
          disabled={props.disabled}
          required={props.required}
          onChange={(event) => props.onChange?.({ value: event.currentTarget.value })}
          onKeyDown={(event) => {
            if (
              !props.submitOnEnter ||
              event.key !== "Enter" ||
              event.shiftKey ||
              event.ctrlKey ||
              event.altKey ||
              event.metaKey ||
              event.nativeEvent.isComposing ||
              event.nativeEvent.keyCode === 229
            )
              return;
            event.preventDefault();
            if (!event.repeat) event.currentTarget.form?.requestSubmit();
          }}
        />
      </LabeledControl>
    ),
    Select: ({ props }) => (
      <LabeledControl label={props.label}>
        <Select
          items={props.options}
          value={props.value}
          disabled={props.disabled}
          onValueChange={(value) => {
            if (value !== null) props.onChange?.({ value });
          }}
        >
          <SelectTrigger aria-label={props.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            <SelectGroup>
              {props.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectPopup>
        </Select>
      </LabeledControl>
    ),
    Combobox: ({ props }) => <AppSlotCombobox {...props} />,
    Checkbox: ({ props }) => (
      <Field className="flex-row items-center">
        <Checkbox
          aria-label={props.label}
          checked={props.checked}
          disabled={props.disabled}
          onCheckedChange={(checked) => props.onCheckedChange?.({ checked })}
        />
        <FieldLabel>{props.label}</FieldLabel>
      </Field>
    ),
    Switch: ({ props }) => (
      <Field className="flex-row items-center">
        <Switch
          aria-label={props.label}
          checked={props.checked}
          disabled={props.disabled}
          onCheckedChange={(checked) => props.onCheckedChange?.({ checked })}
        />
        <FieldLabel>{props.label}</FieldLabel>
      </Field>
    ),
    Progress: ({ props }) => <Progress aria-label={props.label} value={props.value} />,
    Separator: ({ props }) => <Separator orientation={props.orientation} />,
    Avatar: ({ props }) => (
      <Avatar aria-label={props.name}>
        <AvatarFallback>
          {props.name
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
    ),
    Spinner: ({ props }) => (
      <span role="status" className="inline-flex items-center gap-2">
        <Spinner />
        <span className="sr-only">{props.label}</span>
      </span>
    ),
    Skeleton: ({ props }) => (
      <Skeleton
        aria-hidden="true"
        className={cn(
          "max-w-full shrink-0 motion-reduce:animate-none",
          skeletonWidths[props.width ?? "full"],
          skeletonHeights[props.height ?? "5"],
          skeletonRadii[props.radius ?? "sm"],
        )}
      />
    ),
    Table: ({ props, children }) => <Table aria-label={props.label}>{children}</Table>,
    TableHeader: ({ children }) => <TableHeader>{children}</TableHeader>,
    TableBody: ({ children }) => <TableBody>{children}</TableBody>,
    TableRow: ({ children }) => <TableRow>{children}</TableRow>,
    TableHead: ({ props }) => <TableHead>{props.text}</TableHead>,
    TableCell: ({ children }) => <TableCell>{children}</TableCell>,
    Dialog: ({ props, children }) => <AppDialog {...props}>{children}</AppDialog>,
    DialogActions: ({ children }) => <AppDialogActions>{children}</AppDialogActions>,
  },
  tools: {
    ui: {
      navigate: ({ input }) => dispatch({ type: "navigate", href: input.href }),
      openAppPage: ({ input, context }) =>
        dispatch({
          type: "open-app-page",
          appId: context.identity.installationId,
          instanceKey: input.instanceKey,
        }),
      openPanel: ({ context }) =>
        dispatch({ type: "open-panel", appId: context.identity.installationId }),
      refresh: () => dispatch({ type: "refresh" }),
      setTheme: ({ input }) => dispatch({ type: "theme", theme: input.theme }),
      notify: ({ input }) => {
        toastManager.add(input);
      },
    },
  },
});

const WorkspaceContext = createContext<ViewWorkspace | null>(null);

// This hook only builds options. React Query owns requests, caching and errors.
export function useViewQueryOptions<TSlot extends ViewSlot>(slot: TSlot) {
  const workspace = useContext(WorkspaceContext);
  const pathname = usePathname();
  if (!workspace) throw new Error("App view queries require a workspace.");
  return viewsQueryOptions(patchsmithClient.api, workspace, slot, pathname);
}

export function PatchsmithProvider({
  children,
  workspace,
}: {
  children: ReactNode;
  workspace: ViewWorkspace;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  useEffect(() => {
    function handle(event: Event) {
      const { detail } = event as CustomEvent<HostActionDetail>;
      if (detail.action.type === "open-panel") return;
      detail.handled = true;
      switch (detail.action.type) {
        case "navigate":
          router.push(detail.action.href);
          break;
        case "open-app-page": {
          const { appId, instanceKey } = detail.action;
          const options = viewsQueryOptions(patchsmithClient.api, workspace, "page", pathname);
          detail.result = queryClient.fetchQuery(options).then((result) => {
            router.push(installedAppPageHref(options.select!(result), appId, instanceKey));
          });
          break;
        }
        case "refresh":
          void queryClient.invalidateQueries({ queryKey: orpc.key() });
          void queryClient.invalidateQueries({ queryKey: patchsmithQueryKey });
          break;
        case "theme":
          setTheme(detail.action.theme);
          break;
      }
    }
    window.addEventListener(hostActionEvent, handle);
    return () => window.removeEventListener(hostActionEvent, handle);
  }, [router, setTheme, queryClient, workspace, pathname]);
  return (
    <WorkspaceContext value={workspace}>
      <patchsmithClient.Provider>{children}</patchsmithClient.Provider>
    </WorkspaceContext>
  );
}

export function usePanelAction(openApp: (appId: string) => void) {
  useEffect(() => {
    function handle(event: Event) {
      const { detail } = event as CustomEvent<HostActionDetail>;
      if (detail.action.type !== "open-panel") return;
      openApp(detail.action.appId);
      detail.handled = true;
    }
    window.addEventListener(hostActionEvent, handle);
    return () => window.removeEventListener(hostActionEvent, handle);
  }, [openApp]);
}

export const { RenderSlot, useViewContext } = patchsmithClient;

export async function loadAppChart() {
  const [
    { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis },
    { ChartContainer, ChartTooltip, ChartTooltipContent },
  ] = await Promise.all([import("recharts"), import("@/components/ui/chart")]);
  return function AppChart({
    type,
    label,
    data,
    valueLabel = "Value",
    valueFormat = "number",
    currency = "USD",
  }: AppChartProps & { type: "area" | "bar" }) {
    const gradientId = `app-chart-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const numberOptions: Intl.NumberFormatOptions =
      valueFormat === "currency"
        ? { style: "currency", currency, maximumFractionDigits: 2 }
        : { maximumFractionDigits: 2 };
    const format = new Intl.NumberFormat("en-US", numberOptions);
    const compact = new Intl.NumberFormat("en-US", {
      ...numberOptions,
      notation: "compact",
      maximumFractionDigits: 1,
    });
    const config = { value: { label: valueLabel, color: "var(--chart-2)" } } satisfies ChartConfig;
    const minimum = Math.min(0, ...data.map(({ value }) => value));
    const axes = (
      <>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          minTickGap={20}
          padding={{ left: 8, right: 16 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          width={56}
          domain={[minimum, "auto"]}
          tickFormatter={(value: number) => compact.format(value)}
        />
        <ChartTooltip
          cursor={type === "area" ? false : undefined}
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{valueLabel}</span>
                  <span className="font-mono font-medium tabular-nums">
                    {typeof value === "number" ? format.format(value) : ""}
                  </span>
                </div>
              )}
            />
          }
        />
      </>
    );

    if (!data.length)
      return (
        <div
          className="flex h-64 items-center justify-center text-sm text-muted-foreground"
          role="status"
        >
          No data to display.
        </div>
      );

    return (
      <figure aria-label={label} className="min-w-0">
        <ChartContainer config={config} className="h-64 w-full aspect-auto">
          {type === "area" ? (
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              {axes}
              <Area
                dataKey="value"
                name={valueLabel}
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={data.length === 1}
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
            >
              {axes}
              <Bar
                dataKey="value"
                name={valueLabel}
                fill="var(--color-value)"
                radius={[6, 6, 0, 0]}
                maxBarSize={64}
                isAnimationActive={false}
              />
            </BarChart>
          )}
        </ChartContainer>
        <div className="sr-only">
          <table>
            <caption>{label}</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point, index) => (
                <tr key={index}>
                  <th scope="row">{point.label}</th>
                  <td>{format.format(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
    );
  };
}
