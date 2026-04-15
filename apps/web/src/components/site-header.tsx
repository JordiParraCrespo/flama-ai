"use client";

import { SidebarTrigger, Separator } from "@flama/design-system-web";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/90 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
    </header>
  );
}
