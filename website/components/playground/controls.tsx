'use client';

import { AlertTriangle, Check, ChevronDown, Copy, Link2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { VersionOption } from '@/app/(home)/playground/versions';

/**
 * The chrome around the three panes: their headers, the buttons those headers
 * carry, and the toolbar above them.
 */

/**
 * Fixed height so a pane carrying an action button still lines up with the panes
 * beside it, since the button is taller than the heading text alone. The height
 * also means the `status` slot can come and go without moving anything.
 */
export function PaneHeader({
  title,
  status,
  action,
}: {
  title: string;
  status?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex h-7 items-center justify-between gap-3">
      <h2 className="shrink-0 text-sm font-semibold uppercase tracking-[0.18em] text-fd-muted-foreground">
        {title}
      </h2>
      {status}
      {action}
    </div>
  );
}

export function VersionSelect({
  versions,
  value,
  onChange,
}: {
  versions: VersionOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    // A select is as wide as its longest option, which on a phone overflows the
    // toolbar. `min-w-0` lets it shrink below that and truncate instead; it only
    // hugs its content once there's room (`sm:flex-none`)
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none sm:gap-3">
      <label htmlFor="saykit-version" className="shrink-0 text-sm font-medium text-fd-foreground">
        <span className="hidden sm:inline">SayKit </span>Version
      </label>
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <select
          id="saykit-version"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none truncate rounded-full border border-fd-border bg-fd-background py-1.5 pl-3 pr-9 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary sm:w-auto"
        >
          {versions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fd-muted-foreground" />
      </div>
    </div>
  );
}

/** The quiet variant used inside a pane header, next to the pane's title. */
export function PaneAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-fd-muted-foreground transition hover:bg-fd-accent hover:text-fd-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary"
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

/**
 * Clipboard writes reject on a denied permission or an insecure context. Reporting
 * that beats an unhandled rejection and a button that silently does nothing.
 */
function useCopy() {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
  }, []);

  return [state, copy] as const;
}

export function CopyAction({ value }: { value: string }) {
  const [state, copy] = useCopy();

  return (
    <PaneAction
      icon={state === 'copied' ? Check : state === 'failed' ? X : Copy}
      label={state === 'copied' ? 'Copied' : state === 'failed' ? 'Failed' : 'Copy'}
      onClick={() => void copy(value)}
    />
  );
}

/** The loud variant, for the toolbar above the panes. */
function Action({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-background px-3 py-1.5 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary"
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

export function ShareButton({ url }: { url: () => string }) {
  const [state, copy] = useCopy();

  return (
    <Action
      icon={state === 'copied' ? Check : state === 'failed' ? X : Link2}
      label={state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Share'}
      onClick={() => {
        const link = url();
        // Sync the address bar first, so even a failed clipboard write leaves the
        // link somewhere the user can copy it from by hand
        window.history.replaceState(null, '', link);
        void copy(link);
      }}
    />
  );
}

/**
 * Sits in the pane header rather than over the editor: the header is always in
 * view and already a fixed height, so a syntax error that comes and goes while
 * typing neither reflows the page nor hides the code being written. Babel puts
 * the useful part ("Unterminated template. (2:14)") first, so one truncated line
 * carries it, with the rest on hover.
 */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <p title={message} className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-red-500">
      <AlertTriangle className="size-3.5 shrink-0" />
      <span className="truncate">{message.split('\n')[0]}</span>
    </p>
  );
}
