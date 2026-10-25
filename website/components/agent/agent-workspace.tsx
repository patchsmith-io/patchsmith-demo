"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { agentTransport } from "@/lib/agents/agent-transport";
import { ChevronDownIcon, PanelsTopLeftIcon, PlusIcon } from "lucide-react";
import type { CrmAgentMessage } from "@/lib/agents/crm-agent";
import { orpc } from "@/lib/orpc";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type { AgentChatSummary } from "@/lib/agents/agent-chat-types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { AppMobileNavigation } from "@/components/app/app-mobile-navigation";
import { AppsPanelContext } from "./apps-panel-context";
import { AppsPanel } from "./apps-panel";
import {
  Drawer,
  DrawerContent,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgentChat } from "./agent-chat";
import { cn } from "@/lib/utils";
import { usePanelAction, useViewQueryOptions } from "@/lib/patchsmith-client";
import { patchsmithQueryKey } from "@/lib/patchsmith-queries";
import { DemoIntroTour } from "@/components/demo-intro/demo-intro-tour";
import { FEATURE_PROMPT, useDemoIntro } from "@/components/demo-intro/demo-intro-provider";
import { appPageHref } from "@/lib/app-pages";

export function AgentWorkspace({ children }: { children: React.ReactNode }) {
  const { step: introStep, setStep: setIntroStep, dismiss: dismissIntro } = useDemoIntro();
  const introActive = introStep !== null;
  const queryClient = useQueryClient();
  const { data: history } = useSuspenseQuery(orpc.chats.list.queryOptions());
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const panelId = useId();
  const canDock = useMediaQuery("xl");
  const useDrawer = useMediaQuery("max-md");
  const [settledSurface, setSettledSurface] = useState<"drawer" | "sheet" | null>(null);
  const [openOverride, setOpen] = useState<boolean | null>(null);
  const open = openOverride ?? canDock;
  const [activeTab, setActiveTab] = useState("agent");
  const {
    data: views,
    isPending: appsPending,
    error: appsError,
  } = useQuery(useViewQueryOptions("panel"));
  const { data: pages, isPending: pagesPending } = useQuery({
    ...useViewQueryOptions("page"),
    placeholderData: keepPreviousData,
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.key() });
    void queryClient.invalidateQueries({ queryKey: patchsmithQueryKey });
  };
  const [appOrder, setAppOrder] = useState<string[]>([]);
  const apps = (views ?? [])
    .map((view) => view.app)
    .sort((a, b) => {
      const rank = (id: string) => {
        const index = appOrder.indexOf(id);
        return index < 0 ? Infinity : index;
      };
      return rank(a.id) - rank(b.id);
    });
  const messagesAppId = apps.find((app) => app.name?.toLowerCase() === "messages")?.id;
  const stripeAppId = apps.find((app) => app.name?.toLowerCase() === "stripe")?.id;
  const stripePage = pages?.find(
    (page) => page.app.name?.toLowerCase() === "stripe" && page.key === "overview",
  );
  const stripeHref = stripePage ? appPageHref(stripePage, pages) : undefined;
  const stripeVisible = pathname === stripeHref;
  const introTab =
    introStep === "messages"
      ? (messagesAppId ?? "agent")
      : introStep === "stripe"
        ? (stripeAppId ?? "agent")
        : "agent";
  useEffect(() => {
    if (!introStep) return;
    setOpen(!(introStep === "stripe" && stripeHref));
    setOpenMobile(false);
    setHistoryOpen(false);
    setActiveTab(introTab);
    if (introStep === "stripe" && stripeHref) router.push(stripeHref);
  }, [introStep, introTab, stripeHref, router, setOpenMobile]);
  const selectedTab = apps.some((app) => app.id === activeTab) ? activeTab : "agent";
  usePanelAction(
    useCallback(
      (appId: string) => {
        setActiveTab(appId);
        setOpen(true);
        setOpenMobile(false);
        setHistoryOpen(false);
      },
      [setOpenMobile],
    ),
  );
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [focusInputOnHistoryClose, setFocusInputOnHistoryClose] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [historyError, setHistoryError] = useState<Error>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const { messages, setMessages, sendMessage, status, stop, error, clearError } =
    useChat<CrmAgentMessage>({
      transport: agentTransport,
      // Refresh even after cancellation: a tool may already have committed a change.
      onFinish: () => refresh(),
      onError: () => refresh(),
    });
  const busy = status === "submitted" || status === "streaming";
  const panelContext = useMemo(
    () => ({
      open,
      panelId,
      toggle: () => {
        setOpen((value) => !(value ?? canDock));
        setOpenMobile(false);
        setHistoryOpen(false);
      },
    }),
    [open, canDock, panelId, setOpenMobile],
  );

  function changeOpen(next: boolean) {
    if (!next && introActive) dismissIntro();
    if (!next) setSettledSurface(null);
    setOpen(next);
    if (next) setOpenMobile(false);
    if (!next) setHistoryOpen(false);
  }

  function newChat() {
    if (busy || loadingChat) return;
    setFocusInputOnHistoryClose(historyOpen);
    setChatId(null);
    setMessages([]);
    setInput("");
    clearError();
    setHistoryError(undefined);
    setHistoryOpen(false);
    setOpen(true);
    inputRef.current?.focus();
  }

  async function restoreChat(chat: AgentChatSummary) {
    if (busy || loadingChat) return;
    setLoadingChat(true);
    setHistoryError(undefined);
    try {
      const saved = await queryClient.fetchQuery(
        orpc.chats.get.queryOptions({ input: { id: chat.id }, staleTime: 0 }),
      );
      setChatId(saved.id);
      setMessages(saved.messages);
      setInput("");
      clearError();
      setHistoryOpen(false);
      setOpen(true);
    } catch (error) {
      setHistoryError(error instanceof Error ? error : new Error("This chat could not be loaded."));
    } finally {
      setLoadingChat(false);
    }
  }

  async function submit(text: string, preserveDraft = false) {
    if (!text.trim() || busy || loadingChat) return;
    clearError();
    setHistoryError(undefined);
    const id = chatId ?? crypto.randomUUID();
    setChatId(id);
    if (!preserveDraft) setInput("");
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const page = pathname.startsWith("/contacts/")
      ? "/contacts"
      : pathname.startsWith("/apps/")
        ? "/app-pages"
        : pathname;
    await sendMessage(
      { text: text.trim() },
      {
        body: {
          chatId: id,
          page,
          date,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    );
  }

  const currentTitle = messages.length
    ? messages
        .find((message) => message.role === "user")
        ?.parts.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ") || "Chat"
    : "New chat";
  const recentChats = history.chats;
  const chatTitle = (
    <DropdownMenu
      open={historyOpen}
      onOpenChange={(next) => {
        setHistoryOpen(next);
        if (next) setFocusInputOnHistoryClose(false);
      }}
    >
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="min-w-0 max-w-full" />}
        aria-label="Chat history"
      >
        <span className="truncate">{loadingChat ? "Loading chat…" : currentTitle}</span>
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72"
        finalFocus={focusInputOnHistoryClose ? inputRef : undefined}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={newChat} disabled={busy || loadingChat}>
            <PlusIcon />
            New chat
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Recent chats</DropdownMenuLabel>
          {recentChats.map((saved) => (
            <DropdownMenuItem
              key={saved.id}
              disabled={busy || loadingChat}
              onClick={() => {
                void restoreChat(saved);
              }}
            >
              <span className="truncate">{saved.title}</span>
            </DropdownMenuItem>
          ))}
          {!recentChats.length ? (
            <DropdownMenuItem disabled>No recent chats</DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const chat = (
    <AgentChat
      chatTitle={chatTitle}
      messages={messages}
      input={input}
      inputRef={inputRef}
      onInputChange={setInput}
      onSubmit={submit}
      status={status}
      error={historyError ?? error}
      onStop={() => {
        void stop();
        refresh();
      }}
      onNewChat={newChat}
      docked={!useDrawer}
    />
  );

  const panel = (
    <AppsPanel
      apps={apps}
      onReorder={(next) => setAppOrder(next.map((app) => app.id))}
      activeTab={selectedTab}
      appsStatus={appsError ? "error" : appsPending ? "loading" : undefined}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setHistoryOpen(false);
        if (introActive) {
          if (tab === "agent") setIntroStep("agent");
          else if (tab === messagesAppId) setIntroStep("messages");
          else if (tab === stripeAppId) setIntroStep("stripe");
          else dismissIntro();
        }
      }}
    >
      {chat}
    </AppsPanel>
  );

  return (
    <AppsPanelContext.Provider value={panelContext}>
      <div className="flex min-h-0 min-w-0 flex-1 gap-2 md:p-2">
        <section
          aria-label="Workspace content"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background md:rounded-2xl md:border md:shadow-xs"
        >
          {children}
        </section>
        <aside
          id={canDock ? panelId : undefined}
          aria-label="Agent and apps"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.defaultPrevented) {
              event.preventDefault();
              changeOpen(false);
            }
          }}
          className={cn(
            "hidden w-[390px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-background shadow-xs min-[1280px]:flex",
            openOverride === false && "min-[1280px]:hidden",
          )}
        >
          {/* CSS reserves desktop space before hydration; only the active surface mounts the chat. */}
          {canDock ? panel : null}
        </aside>
      </div>
      {useDrawer ? (
        <div
          aria-label="Mobile tools"
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-popover p-1 shadow-xl"
        >
          <Drawer
            open={open}
            onOpenChange={changeOpen}
            onOpenChangeComplete={(next) => setSettledSurface(next ? "drawer" : null)}
            modal={!introActive}
            disablePointerDismissal={introActive}
          >
            <DrawerTrigger render={<Button variant="ghost" size="sm" />} aria-label="Open apps">
              <PanelsTopLeftIcon data-icon="inline-start" />
              Apps
            </DrawerTrigger>
            <DrawerPopup
              showBar
              className="h-[calc(100dvh-3rem)] overflow-hidden has-data-[slot=drawer-bar]:pt-6"
            >
              <DrawerTitle className="sr-only">Agent and apps</DrawerTitle>
              <DrawerContent
                id={panelId}
                className="min-h-0 min-w-0 flex-1 touch-auto pb-[env(safe-area-inset-bottom)]"
              >
                {panel}
              </DrawerContent>
            </DrawerPopup>
          </Drawer>
          <Separator orientation="vertical" className="h-5" />
          <AppMobileNavigation onOpen={() => changeOpen(false)} />
        </div>
      ) : !canDock ? (
        <Sheet
          open={open}
          onOpenChange={changeOpen}
          onOpenChangeComplete={(next) => setSettledSurface(next ? "sheet" : null)}
          modal={!introActive}
          disablePointerDismissal={introActive}
        >
          <SheetPopup
            id={panelId}
            side="right"
            showCloseButton={false}
            className="w-[390px] max-w-[calc(100vw-3rem)]"
          >
            <SheetTitle className="sr-only">Agent and apps</SheetTitle>
            {panel}
          </SheetPopup>
        </Sheet>
      ) : null}
      <DemoIntroTour
        ready={
          introActive &&
          (introStep !== "agent" || (!busy && !loadingChat)) &&
          !appsPending &&
          !pagesPending &&
          (introStep === "stripe" && stripeHref
            ? stripeVisible && !open && (canDock || settledSurface === null)
            : open &&
              (canDock || settledSurface === (useDrawer ? "drawer" : "sheet")) &&
              selectedTab === introTab)
        }
        hasStripe={Boolean(stripeHref)}
        docked={canDock}
        onUseExample={() => {
          void submit(FEATURE_PROMPT, true);
        }}
      />
      <span className={cn("sr-only", !busy && "hidden")} role="status">
        Agent is working
      </span>
    </AppsPanelContext.Provider>
  );
}
