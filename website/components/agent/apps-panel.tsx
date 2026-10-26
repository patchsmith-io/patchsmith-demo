"use client";

import { useRef, useState } from "react";
import { Reorder, useDragControls, MotionConfig } from "motion/react";
import { MousePointer2Icon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/app/app-logo";
import type { PatchsmithApp } from "patchsmith/react";
import { RenderSlot } from "@/lib/patchsmith-client";

export type PanelApp = PatchsmithApp;

const tabClassName =
  "h-9 grow-0 gap-2 rounded-lg border-0 px-2 font-normal text-sm text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground sm:h-9";

function AppTab({ app, onMove }: { app: PanelApp; onMove: (id: string, offset: number) => void }) {
  const controls = useDragControls();
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Reorder.Item
      as="div"
      value={app}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => {
        dragging.current = true;
        setIsDragging(true);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        requestAnimationFrame(() => {
          dragging.current = false;
        });
      }}
      className="relative shrink-0"
    >
      <TabsTab
        value={app.id}
        title={`${app.name ?? app.id} — drag or use Alt + arrow keys to reorder`}
        className={cn(tabClassName, "touch-pan-x", isDragging && "cursor-grabbing")}
        onPointerDown={(event) => controls.start(event)}
        onClick={(event) => {
          if (dragging.current) event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
            event.preventDefault();
            onMove(app.id, event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <AppLogo app={app} />
        {app.name ?? app.id}
      </TabsTab>
    </Reorder.Item>
  );
}

export function AppsPanel({
  children,
  apps,
  onReorder,
  activeTab,
  onTabChange,
  appsStatus,
}: {
  children: React.ReactNode;
  apps: PanelApp[];
  onReorder: (apps: PanelApp[]) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  appsStatus?: "loading" | "error";
}) {
  function moveApp(id: string, offset: number) {
    const index = apps.findIndex((app) => app.id === id);
    const target = index + offset;
    if (target < 0 || target >= apps.length) return;
    const next = [...apps];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  }

  return (
    <MotionConfig reducedMotion="user">
      <Tabs
        data-demo="apps-panel"
        value={activeTab}
        onValueChange={(value) => onTabChange(String(value))}
        className="h-full min-h-0 w-full min-w-0 gap-0 overflow-hidden"
      >
        <div className="flex min-w-0 shrink-0 items-center border-b px-2 py-3">
          <TabsList
            aria-label="Agent and apps"
            data-demo="apps-tabs"
            className="min-w-0 flex-1 justify-start bg-transparent p-0 [&>[data-slot=tab-indicator]]:hidden"
          >
            <TabsTab value="agent" className={tabClassName}>
              <MousePointer2Icon className="size-4" aria-hidden="true" />
              Agent
            </TabsTab>
            {apps.length > 0 ? <Separator orientation="vertical" className="mx-0.5 h-5" /> : null}
            <Reorder.Group
              as="div"
              axis="x"
              values={apps}
              onReorder={onReorder}
              layoutScroll
              className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {apps.map((app) => (
                <AppTab key={app.id} app={app} onMove={moveApp} />
              ))}
            </Reorder.Group>
          </TabsList>
          {appsStatus ? (
            <span role="status" className="shrink-0 px-2 text-xs text-muted-foreground">
              {appsStatus === "loading" ? "Loading apps…" : "Apps unavailable"}
            </span>
          ) : null}
        </div>
        <TabsPanel value="agent" keepMounted className="min-h-0 data-[hidden]:hidden">
          {children}
        </TabsPanel>
        {apps.map((app) => (
          <TabsPanel
            key={app.id}
            value={app.id}
            data-demo={app.name?.toLowerCase() === "messages" ? "messages-panel" : undefined}
            className="min-h-0 overflow-y-auto p-4 [&>[data-patchsmith-view]]:h-full"
          >
            <RenderSlot app={app} slot="panel" />
          </TabsPanel>
        ))}
      </Tabs>
    </MotionConfig>
  );
}
