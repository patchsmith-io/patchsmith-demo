"use client";

import Link from "next/link";
import { useEffect, useState, type AnchorHTMLAttributes } from "react";
import type { ChatStatus, DynamicToolUIPart } from "ai";
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CheckIcon,
  ChevronRightIcon,
  ListTodoIcon,
  MousePointer2Icon,
  SquareIcon,
  SquarePenIcon,
  SparklesIcon,
} from "lucide-react";
import type { CrmAgentMessage } from "@/lib/agents/crm-agent";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { FEATURE_PROMPT } from "@/components/demo-intro/demo-intro-provider";

type AppToolPart = Extract<
  CrmAgentMessage["parts"][number],
  { type: "tool-listApps" | "tool-createApp" | "tool-editApp" }
>;
type ToolPart = Exclude<
  Extract<CrmAgentMessage["parts"][number], { type: `tool-${string}` }>,
  AppToolPart
>;
const toolTitles: Record<ToolPart["type"], string> = {
  "tool-getWorkspace": "View workspace",
  "tool-getContact": "View contact",
  "tool-createContact": "Add a contact",
  "tool-updateContact": "Edit a contact",
  "tool-deleteContact": "Delete a contact",
  "tool-updateDeal": "Edit a deal",
  "tool-deleteDeal": "Delete a deal",
  "tool-updateTask": "Edit a follow-up",
  "tool-deleteTask": "Delete a follow-up",
  "tool-listActivities": "View activity",
  "tool-addNote": "Add a note",
  "tool-listDeals": "View deals",
  "tool-listContacts": "Find contacts",
  "tool-createDeal": "Add a deal",
  "tool-moveDeal": "Move a deal",
  "tool-listTasks": "View follow-ups",
  "tool-createTask": "Add a follow-up",
  "tool-setTaskCompleted": "Update a follow-up",
};
const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function AgentLink({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return href?.startsWith("/") ? (
    <Link href={href} {...props}>
      {children}
    </Link>
  ) : (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
const markdownComponents = { a: AgentLink };

const patchsmithToolTitles: Record<string, string> = {
  listApps: "View apps",
  createApp: "Build an app",
  editApp: "Edit an app",
  patchsmith_list_apps: "View apps",
  patchsmith_create_app: "Build an app",
  patchsmith_edit_app: "Edit an app",
};

function AppToolResult({
  part,
  durationMs,
}: {
  part: DynamicToolUIPart | AppToolPart;
  durationMs?: number;
}) {
  const toolName = part.type === "dynamic-tool" ? part.toolName : part.type.slice(5);
  const preliminary = part.state === "output-available" && part.preliminary === true;
  const failed =
    part.state === "output-available" &&
    typeof part.output === "object" &&
    part.output !== null &&
    "isError" in part.output &&
    part.output.isError === true;
  const hasError = part.state === "output-error" || failed;
  const [open, setOpen] = useState(hasError);
  useEffect(() => {
    if (part.state === "output-error" || failed) setOpen(true);
  }, [part.state, failed]);
  return (
    <Tool className="mb-0" open={open} onOpenChange={setOpen}>
      <ToolHeader
        type="dynamic-tool"
        toolName={toolName}
        state={failed ? "output-error" : preliminary ? "input-available" : part.state}
        title={patchsmithToolTitles[toolName] ?? part.title ?? toolName}
      />
      <ToolContent durationMs={durationMs}>
        <p className="text-sm text-muted-foreground">
          {part.state === "output-error" || failed
            ? "The app request could not finish. Check your apps before repeating a change."
            : part.state === "output-available" && !preliminary
              ? "Finished. See the agent's response for details."
              : "Working on your apps. Building or editing can take a few minutes…"}
        </p>
      </ToolContent>
    </Tool>
  );
}

function ToolResult({ part, durationMs }: { part: ToolPart; durationMs?: number }) {
  return (
    <Tool className="mb-0" defaultOpen={part.state === "output-error"}>
      <ToolHeader type={part.type} state={part.state} title={toolTitles[part.type]} />
      <ToolContent durationMs={durationMs}>
        {part.state === "output-error" ? (
          <p className="text-sm text-destructive">{part.errorText}</p>
        ) : null}
        {part.state === "output-available" ? <CompletedTool part={part} /> : null}
        {part.state === "input-streaming" || part.state === "input-available" ? (
          <p className="text-sm text-muted-foreground">Working in your workspace…</p>
        ) : null}
      </ToolContent>
    </Tool>
  );
}

function CompletedTool({ part }: { part: ToolPart }) {
  if (part.state !== "output-available") return null;
  switch (part.type) {
    case "tool-getWorkspace":
      return (
        <p className="text-sm">
          {part.output.workspace.name} · {part.output.usage.contacts} contacts ·{" "}
          {part.output.usage.deals} deals · {part.output.usage.tasks} follow-ups
        </p>
      );
    case "tool-getContact":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {part.output.contact.name} · {part.output.contact.company}
          </p>
          <RecordLink href={part.output.href}>View contact</RecordLink>
        </div>
      );
    case "tool-createContact":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Added {part.output.contact.name}.</p>
          <RecordLink href={part.output.href}>View contact</RecordLink>
        </div>
      );
    case "tool-updateContact":
    case "tool-deleteContact":
    case "tool-updateDeal":
    case "tool-deleteDeal":
    case "tool-updateTask":
    case "tool-deleteTask":
    case "tool-addNote":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{toolTitles[part.type]} completed.</p>
          <RecordLink href={part.output.href}>View workspace</RecordLink>
        </div>
      );
    case "tool-listActivities":
      return (
        <div className="flex flex-col gap-3">
          {part.output.activities.length ? (
            part.output.activities.map((activity) => (
              <div key={activity.id} className="text-sm">
                <p className="font-medium">{activity.title}</p>
                <p className="text-muted-foreground">{activity.description}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
        </div>
      );
    case "tool-listDeals":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {part.output.count} deals · {money(part.output.totalValue)} total
          </p>
          {part.output.deals.length ? (
            part.output.deals.map((deal) => (
              <div key={deal.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{deal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {deal.company ?? "No linked contact"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span>{money(deal.value)}</span>
                  <Badge variant="outline">{deal.stage}</Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No matching deals.</p>
          )}
          <RecordLink href="/pipeline">View pipeline</RecordLink>
        </div>
      );
    case "tool-listContacts":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{part.output.count} matching contacts</p>
          {part.output.contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex flex-col gap-0.5 text-sm hover:underline"
            >
              <span>{contact.name}</span>
              <span className="text-xs text-muted-foreground">{contact.company}</span>
            </Link>
          ))}
          <RecordLink href="/contacts">View contacts</RecordLink>
        </div>
      );
    case "tool-listTasks":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{part.output.count} matching follow-ups</p>
          {part.output.tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{task.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {task.completed ? "Completed" : task.dueDate}
              </span>
            </div>
          ))}
          <RecordLink href="/tasks">View follow-ups</RecordLink>
        </div>
      );
    case "tool-createDeal":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {part.output.deal.title} · {money(part.output.deal.value)}
          </p>
          <RecordLink href="/pipeline">View deal in pipeline</RecordLink>
        </div>
      );
    case "tool-moveDeal":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Moved to {part.output.stage}.</p>
          <RecordLink href="/pipeline">View pipeline</RecordLink>
        </div>
      );
    case "tool-createTask":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {part.output.task.title} · Due {part.output.task.dueDate}
          </p>
          <RecordLink href="/tasks">View follow-up</RecordLink>
        </div>
      );
    case "tool-setTaskCompleted":
      return (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm">
            {part.output.task.completed ? <CheckIcon className="size-4" /> : null}
            {part.output.task.title} · {part.output.task.completed ? "Completed" : "Reopened"}
          </p>
          <RecordLink href="/tasks">View follow-up</RecordLink>
        </div>
      );
  }
}

function RecordLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button render={<Link href={href} />} variant="outline" size="sm" className="w-fit">
      {children}
      <ChevronRightIcon data-icon="inline-end" />
    </Button>
  );
}

export function AgentChat({
  chatTitle,
  messages,
  input,
  inputRef,
  onInputChange,
  onSubmit,
  status,
  error,
  onStop,
  onNewChat,
  docked,
}: {
  chatTitle: React.ReactNode;
  messages: CrmAgentMessage[];
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSubmit: (text: string) => Promise<void>;
  status: ChatStatus;
  error?: Error;
  onStop: () => void;
  onNewChat: () => void;
  docked: boolean;
}) {
  const busy = status === "submitted" || status === "streaming";
  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-slot="agent-chat">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <h2 className="min-w-0">{chatTitle}</h2>
        <div className="flex items-center gap-1">
          {messages.length ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New chat"
              title="New chat"
              disabled={busy}
              onClick={onNewChat}
            >
              <SquarePenIcon />
            </Button>
          ) : null}
        </div>
      </header>
      <div className="mx-2 mb-2 flex min-h-0 flex-1 flex-col rounded-xl bg-linear-to-b from-muted/70 to-transparent">
        <Conversation className="min-h-0" aria-label="Agent conversation">
          <ConversationContent className="gap-5 p-4 has-data-[slot=agent-welcome]:h-full">
            {!messages.length ? (
              <ConversationEmptyState
                data-slot="agent-welcome"
                className={cn(
                  "gap-4 px-1",
                  docked ? "justify-center py-8" : "justify-end pb-8 pt-12",
                )}
              >
                <MousePointer2Icon className="mb-1 size-7 text-muted-foreground" />
                <div className="flex flex-col gap-2 text-center">
                  <h3 className="text-lg font-semibold tracking-tight">
                    What would make this CRM yours?
                  </h3>
                  <p className="max-w-64 text-sm leading-relaxed text-muted-foreground">
                    Ask for a new feature, change an app, or get help with your workspace.
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Suggestion
                    suggestion={FEATURE_PROMPT}
                    onClick={(text) => {
                      onInputChange(text);
                      inputRef.current?.focus();
                    }}
                    size="default"
                  >
                    <SparklesIcon data-icon="inline-start" />
                    Add a Quick follow-up button
                  </Suggestion>
                  <Suggestion
                    suggestion="Show me my deals."
                    onClick={(text) => {
                      void onSubmit(text);
                    }}
                    size="default"
                  >
                    <BriefcaseBusinessIcon data-icon="inline-start" />
                    View deals
                  </Suggestion>
                  <Suggestion
                    suggestion="Show my incomplete follow-up tasks."
                    onClick={(text) => {
                      void onSubmit(text);
                    }}
                    size="default"
                  >
                    <ListTodoIcon data-icon="inline-start" />
                    View follow-ups
                  </Suggestion>
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id} className="max-w-full">
                  <MessageContent className="w-full">
                    {message.parts.map((part, index) => {
                      if (part.type === "text")
                        return (
                          <MessageResponse
                            key={index}
                            isAnimating={busy && message === messages.at(-1)}
                            components={markdownComponents}
                          >
                            {part.text}
                          </MessageResponse>
                        );
                      if (
                        part.type === "dynamic-tool" ||
                        part.type === "tool-listApps" ||
                        part.type === "tool-createApp" ||
                        part.type === "tool-editApp"
                      )
                        return (
                          <AppToolResult
                            key={index}
                            part={part}
                            durationMs={message.metadata?.toolDurations?.[part.toolCallId]}
                          />
                        );
                      if (part.type.startsWith("tool-"))
                        return (
                          <ToolResult
                            key={index}
                            part={part as ToolPart}
                            durationMs={
                              message.metadata?.toolDurations?.[(part as ToolPart).toolCallId]
                            }
                          />
                        );
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))
            )}
            {busy ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Spinner />
                Thinking…
              </div>
            ) : null}
            {error ? (
              <Alert variant="error">
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="shrink-0 p-2">
          <form
            data-demo="agent-composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy && input.trim()) void onSubmit(input);
            }}
          >
            <InputGroup>
              <InputGroupTextarea
                ref={inputRef}
                aria-label="Message agent"
                placeholder="Ask a question or describe a feature…"
                value={input}
                onChange={(event) => onInputChange(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                maxLength={4000}
                className="text-left"
              />
              <InputGroupAddon align="block-end">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type={busy ? "button" : "submit"}
                        onClick={busy ? onStop : undefined}
                        aria-label={busy ? "Stop response" : "Send message"}
                        disabled={!busy && !input.trim()}
                        className="ml-auto rounded-full"
                        size="icon-sm"
                      />
                    }
                  >
                    {busy ? <SquareIcon /> : <ArrowRightIcon />}
                  </TooltipTrigger>
                  <TooltipPopup>{busy ? "Stop response" : "Send"}</TooltipPopup>
                </Tooltip>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </div>
      </div>
    </div>
  );
}
