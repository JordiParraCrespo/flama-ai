"use client";

import { Badge } from "@flama/design-system-web/badge";
import { Button } from "@flama/design-system-web/button";
import { AppIcon } from "@flama/design-system-web/app-icon";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@flama/design-system-web/chart";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandItemIcon,
  CommandList,
} from "@flama/design-system-web/command";
import { Composer } from "@flama/design-system-web/composer";
import { DeltaText } from "@flama/design-system-web/delta-text";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@flama/design-system-web/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flama/design-system-web/dropdown-menu";
import { Kbd } from "@flama/design-system-web/kbd";
import { SelectMenu } from "@flama/design-system-web/select-menu";
import { Switch } from "@flama/design-system-web/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@flama/design-system-web/toggle-group";
import {
  BarChart2Icon,
  GlobeIcon,
  LayoutDashboardIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

/* ── Forms ──────────────────────────────────────────────────────────────── */

function DropdownDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Row actions">
            <MoreHorizontalIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Lead</DropdownMenuLabel>
        <DropdownMenuItem>View details</DropdownMenuItem>
        <DropdownMenuItem>Assign owner</DropdownMenuItem>
        <DropdownMenuItem>Move stage</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2Icon />
          Delete lead
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Overlays ───────────────────────────────────────────────────────────── */

/**
 * Two sheet shapes: the plain one, and the "install" pattern that leads with
 * the app plates being connected. Both are the same 16px-radius sheet on a
 * dimmed backdrop — one of the few places the flat system allows depth.
 */
export function DialogDemo({
  variant = "basic",
}: {
  variant?: "basic" | "install";
}) {
  const install = variant === "install";

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="secondary">
            {install ? <PlusIcon /> : null}
            {install ? "Connect app" : "Open dialog"}
          </Button>
        }
      />
      <DialogContent>
        {install ? (
          <div className="-mx-6 -mt-6 mb-2 flex h-28 items-center justify-center gap-3 rounded-t-2xl bg-[linear-gradient(120deg,#A7C7FF_0%,#C9B8FF_55%,#9FD3FF_100%)]">
            <AppIcon app="slack" size={44} />
            <AppIcon app="googlechrome" size={44} />
          </div>
        ) : null}
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle>
            {install ? "Install Flama for Slack" : "Share this document"}
          </DialogTitle>
          <DialogDescription>
            {install
              ? "Collaborate with your agents directly from Slack."
              : "Anyone with the link in your org can view."}
          </DialogDescription>
        </DialogHeader>
        {install ? null : (
          <div className="flex items-center justify-between border-y border-border-subtle py-3">
            <span className="text-base">Allow comments</span>
            <Switch defaultChecked />
          </div>
        )}
        <DialogFooter>
          <DialogClose
            render={
              <Button className="w-full">
                {install ? "Connect" : "Publish"}
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PALETTE_ITEMS = [
  { icon: LayoutDashboardIcon, label: "Dashboard" },
  { icon: UserRoundIcon, label: "Leads" },
  { icon: GlobeIcon, label: "Domains" },
  { icon: UsersIcon, label: "Team" },
  { icon: BarChart2Icon, label: "Analytics" },
];

export function CommandPaletteDemo() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open palette
        <Kbd className="ml-1">⌘K</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search or jump to..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {PALETTE_ITEMS.map((item) => (
              <CommandItem
                key={item.label}
                value={item.label}
                onSelect={() => setOpen(false)}
              >
                <CommandItemIcon>
                  <item.icon />
                </CommandItemIcon>
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem value="Ask AI" onSelect={() => setOpen(false)}>
              <CommandItemIcon>
                <SparklesIcon />
              </CommandItemIcon>
              <span>Ask AI</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

/* ── Data ───────────────────────────────────────────────────────────────── */

const CHART_DATA = [
  { month: "Jan", leads: 240, previous: 180 },
  { month: "Feb", leads: 268, previous: 200 },
  { month: "Mar", leads: 255, previous: 210 },
  { month: "Apr", leads: 300, previous: 232 },
  { month: "May", leads: 330, previous: 250 },
  { month: "Jun", leads: 315, previous: 268 },
  { month: "Jul", leads: 360, previous: 288 },
  { month: "Aug", leads: 399, previous: 300 },
];

const CHART_CONFIG = {
  leads: { label: "Leads", color: "var(--data-line)" },
  previous: { label: "Previous period", color: "var(--data-line-compare)" },
} satisfies ChartConfig;

export function ChartDemo() {
  return (
    <div className="w-full">
      <ChartContainer config={CHART_CONFIG} className="h-60 w-full">
        <LineChart data={CHART_DATA} margin={{ left: 4, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--data-grid)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            className="text-xs"
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            dataKey="previous"
            stroke="var(--color-previous)"
            strokeWidth={1.6}
            strokeDasharray="4 4"
            dot={false}
          />
          <Line
            dataKey="leads"
            stroke="var(--color-leads)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export function DataCells() {
  const cells: { label: string; node: React.ReactNode }[] = [
    {
      label: "identity",
      node: (
        <span className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-accent-purple text-xs text-white">
            N
          </span>
          <span className="text-base font-medium text-ink-900">
            Northwind Retail
          </span>
        </span>
      ),
    },
    {
      label: "secondary",
      node: <span className="text-base text-ink-600">Organic search</span>,
    },
    {
      label: "currency",
      node: <span className="text-base tabular-nums">€12,400</span>,
    },
    { label: "delta", node: <DeltaText value={12} caret /> },
    { label: "status", node: <Badge variant="active">Active</Badge> },
    { label: "count", node: <Badge variant="count">6</Badge> },
    { label: "empty", node: <span className="text-base text-ink-400">—</span> },
    { label: "actions", node: <DropdownDemo /> },
  ];

  return (
    <div className="flex w-full flex-wrap gap-7">
      {cells.map((cell) => (
        <div key={cell.label} className="flex flex-col items-start gap-2.5">
          <div className="flex min-h-10 items-center">{cell.node}</div>
          <span className="text-xs text-ink-400">{cell.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Patterns ───────────────────────────────────────────────────────────── */

export function SegmentedDemo() {
  return (
    <div className="flex flex-wrap gap-6">
      <ToggleGroup defaultValue={["week"]} multiple={false}>
        <ToggleGroupItem value="day">Day</ToggleGroupItem>
        <ToggleGroupItem value="week">Week</ToggleGroupItem>
        <ToggleGroupItem value="month">Month</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup defaultValue={["all"]} multiple={false}>
        <ToggleGroupItem value="all">All leads</ToggleGroupItem>
        <ToggleGroupItem value="mine">Mine</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

/* ── Navigation ─────────────────────────────────────────────────────────── */

const NAV = [
  { icon: LayoutDashboardIcon, label: "Dashboard", count: undefined },
  { icon: UsersIcon, label: "Team", count: 4 },
  { icon: GlobeIcon, label: "Domains", count: 5 },
  { icon: UserRoundIcon, label: "Leads", count: 6 },
];

export function NavItems() {
  const [active, setActive] = React.useState("Leads");

  return (
    <div className="w-60 space-y-px">
      {NAV.map((item) => {
        const isActive = active === item.label;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => setActive(item.label)}
            className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-base transition-colors ${
              isActive
                ? "bg-surface-sunken font-medium text-ink-900"
                : "text-ink-600 hover:bg-surface-hover hover:text-ink-900"
            }`}
          >
            <item.icon className="size-3.5 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.count != null ? (
              isActive ? (
                <Badge variant="count">{item.count}</Badge>
              ) : (
                <span className="text-xs text-ink-400">{item.count}</span>
              )
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ── Assistant ──────────────────────────────────────────────────────────── */

const MODELS = ["Fast", "Balanced", "Deep reasoning"];

export function ComposerDemo() {
  // Seeded so the specimen shows the send button live — the reference draws
  // it blue, which the real component only does with something to send.
  const [value, setValue] = React.useState(
    "Which leads moved stage this week?",
  );
  const [model, setModel] = React.useState("Balanced");

  return (
    <div className="w-full max-w-lg">
      <Composer
        value={value}
        onValueChange={setValue}
        onSubmit={() => setValue("")}
        placeholder="Ask about a lead, domain or ranking…"
        toolbar={
          <SelectMenu
            variant="ghost"
            value={model}
            options={MODELS}
            onValueChange={setModel}
            icon={<SparklesIcon />}
            width={200}
          />
        }
      />
    </div>
  );
}
