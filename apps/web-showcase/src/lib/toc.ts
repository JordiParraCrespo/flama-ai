import {
  AlignLeftIcon,
  AppWindowIcon,
  BadgeIcon,
  ChartLineIcon,
  CircleDotIcon,
  CircleUserRoundIcon,
  ClockIcon,
  Columns3Icon,
  CommandIcon,
  FilterIcon,
  GaugeIcon,
  Grid2x2Icon,
  HeadingIcon,
  LayoutPanelTopIcon,
  LightbulbIcon,
  ListIcon,
  ListChecksIcon,
  MessageCircleIcon,
  ListOrderedIcon,
  type LucideIcon,
  MenuIcon,
  MessageSquareIcon,
  PaperclipIcon,
  MinusIcon,
  MousePointerClickIcon,
  PaletteIcon,
  PanelLeftIcon,
  RectangleHorizontalIcon,
  Rows3Icon,
  SearchCheckIcon,
  SearchIcon,
  ShapesIcon,
  SparklesIcon,
  SquareCheckIcon,
  SquareChevronDownIcon,
  SquareDashedIcon,
  SquareIcon,
  SquarePenIcon,
  SquarePlusIcon,
  TableIcon,
  TagIcon,
  TextCursorInputIcon,
  ToggleLeftIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  TypeIcon,
  WaypointsIcon,
} from "lucide-react";

export type TocItem = { id: string; label: string; icon: LucideIcon };
export type TocGroup = { group: string; items: TocItem[] };

/**
 * The component inventory, in the brand's own order. This drives both the
 * sidebar TOC and the reading order of the page — keep it in step with the
 * `<Spec id>` values, since the scroll-spy matches on them.
 */
export const TOC: TocGroup[] = [
  {
    group: "Foundations",
    items: [
      { id: "colors", label: "Colors", icon: PaletteIcon },
      { id: "type", label: "Typography", icon: TypeIcon },
      { id: "radius", label: "Radius", icon: SquareIcon },
      { id: "icons", label: "Icons", icon: ShapesIcon },
    ],
  },
  {
    group: "Core",
    items: [
      { id: "buttons", label: "Buttons", icon: MousePointerClickIcon },
      { id: "iconbuttons", label: "Icon buttons", icon: SquarePlusIcon },
      { id: "toggle", label: "Toggle", icon: ToggleLeftIcon },
      { id: "inputs", label: "Inputs", icon: SearchIcon },
      { id: "tags", label: "Chips & tags", icon: TagIcon },
      { id: "badges", label: "Badges", icon: BadgeIcon },
      { id: "avatars", label: "Avatars", icon: CircleUserRoundIcon },
      { id: "cards", label: "Cards", icon: SquareDashedIcon },
    ],
  },
  {
    group: "Forms",
    items: [
      { id: "textfield", label: "Text field", icon: TextCursorInputIcon },
      { id: "select", label: "Select", icon: SquareChevronDownIcon },
      { id: "selectmenu", label: "Select menu", icon: AlignLeftIcon },
      { id: "asyncselect", label: "Autocomplete", icon: SearchCheckIcon },
      { id: "dropdown", label: "Dropdown menu", icon: MenuIcon },
      { id: "filtermenu", label: "Filter menus", icon: FilterIcon },
      { id: "choice", label: "Checkbox & radio", icon: SquareCheckIcon },
    ],
  },
  {
    group: "Overlays",
    items: [
      { id: "dialog", label: "Modals", icon: AppWindowIcon },
      { id: "command", label: "Command palette", icon: CommandIcon },
    ],
  },
  {
    group: "Data",
    items: [
      { id: "status", label: "Status pills", icon: CircleDotIcon },
      { id: "delta", label: "Delta & sparkline", icon: TrendingUpIcon },
      { id: "kpi", label: "KPIs", icon: GaugeIcon },
      { id: "breakdown", label: "Breakdown & rankings", icon: ListOrderedIcon },
      { id: "chart", label: "Line chart", icon: ChartLineIcon },
      { id: "tableblock", label: "Table", icon: TableIcon },
      { id: "datacells", label: "Data cells", icon: Columns3Icon },
    ],
  },
  {
    group: "Patterns",
    items: [
      { id: "tabs", label: "Tabs", icon: LayoutPanelTopIcon },
      { id: "segmented", label: "Segmented control", icon: Rows3Icon },
      { id: "togglebutton", label: "Toggle button", icon: ToggleLeftIcon },
      { id: "stepper", label: "Stage stepper", icon: WaypointsIcon },
    ],
  },
  {
    group: "Product",
    items: [
      { id: "agent", label: "Agent cards", icon: SparklesIcon },
      { id: "apps", label: "App icons & tiles", icon: Grid2x2Icon },
      { id: "feature", label: "Feature rows", icon: ListIcon },
    ],
  },
  {
    group: "Navigation",
    items: [
      { id: "nav", label: "Nav items", icon: PanelLeftIcon },
      { id: "recents", label: "Recents", icon: ClockIcon },
      { id: "sectionlabel", label: "Section labels", icon: HeadingIcon },
    ],
  },
  {
    group: "Assistant",
    items: [
      { id: "askai", label: "Ask AI button", icon: SparklesIcon },
      { id: "promptcards", label: "Prompt cards", icon: LightbulbIcon },
      { id: "chat", label: "Chat bubbles", icon: MessageSquareIcon },
      { id: "composer", label: "Composer", icon: SquarePenIcon },
    ],
  },
  {
    group: "Chat",
    items: [
      { id: "attachment", label: "Attachment", icon: PaperclipIcon },
      { id: "bubble", label: "Bubble", icon: MessageCircleIcon },
      { id: "message", label: "Message", icon: MessageSquareIcon },
      { id: "messagescroller", label: "Message scroller", icon: ListIcon },
      { id: "questionnaire", label: "Questionnaire", icon: ListChecksIcon },
    ],
  },
  {
    group: "Utility",
    items: [
      { id: "alert", label: "Alerts", icon: TriangleAlertIcon },
      { id: "separator", label: "Separator", icon: MinusIcon },
      { id: "skeleton", label: "Skeleton", icon: RectangleHorizontalIcon },
    ],
  },
];

export const TOC_COUNT = TOC.reduce(
  (total, group) => total + group.items.length,
  0,
);
