"use client";

import { MenuIcon, Settings2Icon, XIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useViewQueryOptions } from "@/lib/patchsmith-client";
import { appPageHref, appPageLabel } from "@/lib/app-pages";
import { AppLogo } from "@/components/app/app-logo";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerHeader,
  DrawerMenu,
  DrawerMenuGroup,
  DrawerMenuGroupLabel,
  DrawerMenuItem,
  DrawerMenuSeparator,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useSidebar } from "@/components/ui/sidebar";
import { navigation } from "./app-navigation";
import { SidebarLink } from "./demo-profile";
import { cn } from "@/lib/utils";

export function AppMobileNavigation({ onOpen }: { onOpen: () => void }) {
  const pathname = usePathname();
  const { data: pages } = useQuery({
    ...useViewQueryOptions("page"),
    placeholderData: keepPreviousData,
  });
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <Drawer
      open={openMobile}
      onOpenChange={(next) => {
        if (next) onOpen();
        setOpenMobile(next);
      }}
    >
      <DrawerTrigger
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label="Open navigation"
      >
        <MenuIcon />
      </DrawerTrigger>
      <DrawerPopup showBar className="h-[min(440px,calc(100dvh-3rem))]">
        <DrawerHeader>
          <div className="flex items-center justify-between gap-2">
            <DrawerTitle>Navigation</DrawerTitle>
            <DrawerClose
              render={<Button variant="ghost" size="icon-sm" />}
              aria-label="Close navigation"
            >
              <XIcon />
            </DrawerClose>
          </div>
        </DrawerHeader>
        <DrawerPanel className="min-h-0 flex-1">
          <DrawerMenu aria-label="Mobile navigation">
            <DrawerMenuGroup>
              {navigation.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <DrawerMenuItem
                    key={item.href}
                    render={<SidebarLink href={item.href} />}
                    aria-current={active ? "page" : undefined}
                    className={cn("min-h-12", active && "bg-accent text-accent-foreground")}
                  >
                    <item.icon />
                    {item.name}
                  </DrawerMenuItem>
                );
              })}
            </DrawerMenuGroup>
            {pages?.length ? (
              <>
                <DrawerMenuSeparator />
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>App pages</DrawerMenuGroupLabel>
                  {pages.map((page) => {
                    const href = appPageHref(page);
                    const active = pathname === href;
                    return (
                      <DrawerMenuItem
                        key={href}
                        render={<SidebarLink href={href} />}
                        aria-current={active ? "page" : undefined}
                        className={cn("min-h-12", active && "bg-accent text-accent-foreground")}
                      >
                        <AppLogo app={page.app} />
                        <span className="truncate">{appPageLabel(page)}</span>
                      </DrawerMenuItem>
                    );
                  })}
                </DrawerMenuGroup>
              </>
            ) : null}
            <DrawerMenuSeparator />
            <DrawerMenuGroup>
              <DrawerMenuItem
                render={<SidebarLink href="/settings" />}
                aria-current={pathname === "/settings" ? "page" : undefined}
                className={cn(
                  "min-h-12",
                  pathname === "/settings" && "bg-accent text-accent-foreground",
                )}
              >
                <Settings2Icon />
                Workspace settings
              </DrawerMenuItem>
            </DrawerMenuGroup>
          </DrawerMenu>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}
