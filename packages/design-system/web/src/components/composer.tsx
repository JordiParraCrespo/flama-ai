"use client";

import { ArrowUpIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";

/**
 * Composer — the assistant's input: a card-radius well holding an
 * auto-growing textarea over a toolbar row, with the blue circular send button
 * pinned right. Enter submits; Shift+Enter inserts a newline.
 *
 * Controlled — own the value and handle `onSubmit`.
 */
function Composer({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Ask anything…",
  toolbar,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "onSubmit"> & {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  toolbar?: React.ReactNode;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Grow with the content, capped so the thread above stays visible.
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // Floored at one comfortable line so the field never shrinks below its
    // resting height, capped so a long draft cannot swallow the thread above.
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 22), 120)}px`;
  }, [value]);

  const canSend = value.trim().length > 0;

  return (
    <div
      data-slot="composer"
      className={cn(
        "rounded-2xl border border-border-default bg-card px-3 pt-3 pb-2.5 transition-[border-color,box-shadow]",
        className,
      )}
      {...props}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (canSend) onSubmit?.();
          }
        }}
        className="max-h-30 w-full resize-none bg-transparent text-base leading-[1.45] text-ink-900 outline-none placeholder:text-ink-400 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      />
      <div className="mt-2 flex items-center gap-2">
        {toolbar}
        <span className="flex-1" />
        <button
          type="button"
          disabled={!canSend}
          onClick={() => onSubmit?.()}
          aria-label="Send"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-blue text-white transition-[opacity,transform] hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-400 disabled:hover:opacity-100"
        >
          <ArrowUpIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

export { Composer };
