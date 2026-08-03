'use client';

import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { AlertTriangle, Check, ChevronDown, Copy, Link2, Loader2, Wand2, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VersionOption } from '@/app/(home)/playground/versions';
import { previewCommit, previewOption } from '@/lib/preview';

const CodeEditor = dynamic(() => import('@/components/code-editor'), {
  ssr: false,
  loading: () => <div className="h-full min-h-96 animate-pulse bg-fd-secondary/40" />,
});

/** Mirrors the `Message` shape from `@saykit/config`. */
type Message = {
  message: string;
  id?: string;
  context?: string;
  comments: string[];
  references: string[];
};

type Transformer = {
  extract: (code: string, id: string) => Message[];
  transform: (code: string, id: string) => string;
};

/** The pieces of a given SayKit release the playground drives. */
type Runtime = {
  transformer: Transformer;
  generateHash: (input: string, context?: string) => string;
};

type Result = { messages: Message[]; output: string; hashOf: Runtime['generateHash'] };

/** The JSX transformer also handles the plain-JS forms, so one `.tsx` id covers both. */
const FILE_ID = 'playground.tsx';

const SHIKI_THEMES = { dark: 'github-dark', light: 'github-light' } as const;

/* ------------------------------------------------------------------ runtime */

const runtimes = new Map<string, Promise<Runtime>>();

/** The repository pkg.pr.new publishes preview builds from. */
const REPOSITORY = 'k0d13/saykit';

/** esm.sh proxies pkg.pr.new under `/pr/`, so a preview loads like any other package. */
function moduleUrl(name: string, version: string, path = '') {
  const commit = previewCommit(version);
  return commit
    ? `https://esm.sh/pr/${REPOSITORY}/${name}@${commit}${path}`
    : `https://esm.sh/${name}@${version}${path}`;
}

/**
 * The workspace packages depend on each other by caret range, and esm.sh cannot
 * resolve `^0.0.0-beta-<timestamp>` — the entry loads but its imports 404. Pinning
 * the siblings to the exact version being loaded sidesteps that, and is a no-op
 * for stable releases. A preview needs none of it: pkg.pr.new rewrites those ranges
 * to the sibling builds from the same commit before publishing.
 */
function transformerUrl(version: string) {
  const url = moduleUrl('@saykit/transform-jsx', version);
  if (previewCommit(version)) return url;

  const deps = [`@saykit/config@${version}`, `@saykit/transform-js@${version}`].join(',');
  return `${url}?deps=${deps}`;
}

function loadRuntime(version: string): Promise<Runtime> {
  let pending = runtimes.get(version);

  if (!pending) {
    pending = Promise.all([
      import(/* webpackIgnore: true */ transformerUrl(version)) as Promise<{
        default: () => Transformer;
      }>,
      // Same version as the transformer, so a displayed id always matches what
      // that release would actually write into the catalogue.
      import(
        /* webpackIgnore: true */ moduleUrl('@saykit/config', version, '/features/messages')
      ) as Promise<{ generateHash: Runtime['generateHash'] }>,
    ]).then(([transform, messages]) => {
      const transformer = transform.default();
      if (typeof transformer?.extract !== 'function' || typeof transformer.transform !== 'function')
        throw new Error(`@saykit/transform-jsx@${version} does not expose a usable transformer.`);
      return { transformer, generateHash: messages.generateHash };
    });

    // Don't cache a rejection — a transient network failure should be retryable.
    // The identity check avoids evicting a newer attempt that already succeeded.
    pending.catch(() => {
      if (runtimes.get(version) === pending) runtimes.delete(version);
    });
    runtimes.set(version, pending);
  }

  return pending;
}

/* -------------------------------------------------------------- highlighting */

let highlighter: Promise<(code: string) => string> | null = null;

function getHighlighter() {
  if (highlighter) return highlighter;

  const pending = (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ]);

    const core = await createHighlighterCore({
      themes: [import('@shikijs/themes/github-dark'), import('@shikijs/themes/github-light')],
      langs: [import('@shikijs/langs/tsx')],
      engine: createJavaScriptRegexEngine(),
    });

    return (code: string) =>
      core.codeToHtml(code, { lang: 'tsx', themes: SHIKI_THEMES, defaultColor: false });
  })();

  // Evict a rejection, as `loadRuntime` does. Caching one would leave the output
  // pane unhighlighted for the rest of the session after a single blip, with no
  // way back even once the CDN recovers. The identity check avoids discarding a
  // newer attempt that already succeeded.
  pending.catch(() => {
    if (highlighter === pending) highlighter = null;
  });

  highlighter = pending;
  return pending;
}

/* ------------------------------------------------------------------- sharing */

/**
 * Share state lives in the fragment rather than the query string so the code
 * being experimented with is never sent to the server or logged by it.
 */
function encodeState(state: { code: string; version: string }) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeState(fragment: string) {
  try {
    const padded = fragment.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;

    if (typeof parsed !== 'object' || parsed === null) return null;
    const { code, version } = parsed as { code?: unknown; version?: unknown };
    if (typeof code !== 'string') return null;

    return { code, version: typeof version === 'string' ? version : undefined };
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- formatting */

async function format(code: string) {
  const [prettier, estree, typescript] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/estree'),
    import('prettier/plugins/typescript'),
  ]);

  return prettier.format(code, {
    parser: 'typescript',
    plugins: [estree.default ?? estree, typescript.default ?? typescript],
    singleQuote: true,
    printWidth: 90,
  });
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/* ---------------------------------------------------------------- playground */

export default function Playground({
  versions,
  defaultCode,
}: {
  versions: VersionOption[];
  defaultCode: string;
}) {
  const [code, setCode] = useState(defaultCode);
  const [preview, setPreview] = useState<VersionOption | null>(null);
  const [version, setVersion] = useState(versions[0]?.value ?? '0.5.0');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  // Drop results from runs that were superseded while awaiting the CDN.
  const run = useRef(0);

  // Applied after hydration so the server-rendered markup stays deterministic.
  // Also on `hashchange`, since opening a share link while already on the page is
  // a same-document navigation that never remounts this component.
  useEffect(() => {
    // `?preview=<commit>` is the link the pipeline leaves on a pull request. It
    // offers a version the registry knows nothing about, so it is read before the
    // fragment — a share link that names the preview has to find it selectable.
    const asked = previewOption(window.location.search);
    if (asked) {
      setPreview(asked);
      setVersion(asked.value);
    }

    const selectable = new Set(versions.map((option) => option.value));
    if (asked) selectable.add(asked.value);

    const apply = () => {
      const shared = decodeState(window.location.hash.slice(1));
      if (!shared) return;
      setCode(shared.code);
      if (shared.version && selectable.has(shared.version)) setVersion(shared.version);
    };

    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [versions]);

  useEffect(() => {
    const current = ++run.current;
    setPending(true);

    const timer = setTimeout(async () => {
      try {
        const { transformer, generateHash } = await loadRuntime(version);
        if (run.current !== current) return;

        const next = {
          messages: transformer.extract(code, FILE_ID),
          output: transformer.transform(code, FILE_ID),
          hashOf: generateHash,
        };

        if (run.current !== current) return;
        setResult(next);
        setError(null);
      } catch (cause) {
        if (run.current === current) setError(messageOf(cause));
      } finally {
        if (run.current === current) setPending(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [code, version]);

  const onFormat = useCallback(async () => {
    try {
      setCode(await format(code));
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [code]);

  const shareUrl = useCallback(() => {
    const commit = previewCommit(version);
    // A preview is only in the list because the URL asked for it, so a link that
    // shares one has to ask for it too.
    const query = commit ? `?preview=${commit}` : '';
    const { origin, pathname } = window.location;
    return `${origin}${pathname}${query}#${encodeState({ code, version })}`;
  }, [code, version]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-fd-border bg-fd-card px-4 py-3">
        {/* First, so the version the link was opened for is the one on show. */}
        <VersionSelect
          versions={preview ? [preview, ...versions] : versions}
          value={version}
          onChange={setVersion}
        />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {pending && (
            <span className="inline-flex items-center gap-2 text-sm text-fd-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {/* The spinner alone carries the meaning when space is tight. */}
              <span className="hidden sm:inline">Running</span>
            </span>
          )}
          <ShareButton url={shareUrl} />
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="lg:sticky lg:top-20">
          {/* Formatting only ever applies to the input, so it lives with the editor
              rather than in the toolbar shared with the generated output. */}
          <PaneHeader
            title="Your code"
            status={error && <ErrorNotice message={error} />}
            action={
              <div className="flex shrink-0 items-center gap-1">
                <PaneAction icon={Wand2} label="Format" onClick={onFormat} />
                {/* Copy rightmost in both panes, so it lands in the same place. */}
                <CopyAction value={code} />
              </div>
            }
          />
          {/* No padding here — CodeMirror applies its own inside the scroller, so
              the scrollbar can sit flush against the pane edge. */}
          <div className="min-h-96 overflow-hidden rounded-2xl border border-fd-border bg-fd-card lg:h-[calc(100vh-13rem)]">
            <CodeEditor value={code} onChange={setCode} />
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <section>
            <PaneHeader
              title="Extracted messages"
              action={
                result && (
                  <span className="shrink-0 text-xs text-fd-muted-foreground">
                    {result.messages.length}
                  </span>
                )
              }
            />
            <div className="overflow-hidden rounded-2xl border border-fd-border bg-fd-card">
              <MessageList messages={result?.messages} hashOf={result?.hashOf} />
            </div>
          </section>

          <section className="min-w-0">
            {/* Copy sits in the header like Format, so the pane needs no title bar
                of its own — the filename was never meaningful here anyway. */}
            <PaneHeader
              title="Transformed code"
              action={result ? <CopyAction value={result.output} /> : undefined}
            />
            <Highlighted code={result?.output} />
          </section>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- pieces */

/**
 * Fixed height so a pane carrying an action button still lines up with the panes
 * beside it — the button is taller than the heading text on its own. The height
 * also means the `status` slot can come and go without moving anything.
 */
function PaneHeader({
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

function VersionSelect({
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
    // hugs its content once there's room (`sm:flex-none`).
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
function PaneAction({
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

function CopyAction({ value }: { value: string }) {
  const [state, copy] = useCopy();

  return (
    <PaneAction
      icon={state === 'copied' ? Check : state === 'failed' ? X : Copy}
      label={state === 'copied' ? 'Copied' : state === 'failed' ? 'Failed' : 'Copy'}
      onClick={() => void copy(value)}
    />
  );
}

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

function ShareButton({ url }: { url: () => string }) {
  const [state, copy] = useCopy();

  return (
    <Action
      icon={state === 'copied' ? Check : state === 'failed' ? X : Link2}
      label={state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Share'}
      onClick={() => {
        const link = url();
        // Sync the address bar first, so even a failed clipboard write leaves the
        // link somewhere the user can copy it from by hand.
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
function ErrorNotice({ message }: { message: string }) {
  return (
    <p title={message} className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-red-500">
      <AlertTriangle className="size-3.5 shrink-0" />
      <span className="truncate">{message.split('\n')[0]}</span>
    </p>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-sm text-fd-muted-foreground">{children}</p>;
}

/**
 * A list rather than a table. In a half-width pane five columns leave the message
 * — the thing you actually came to read — fighting its own metadata for space, and
 * every id, context or comment added makes it narrower. Giving the message its own
 * full-width line and demoting the metadata to a line beneath keeps the message at
 * 100% no matter how much metadata a message carries.
 */
function MessageList({
  messages,
  hashOf,
}: {
  messages?: Message[];
  hashOf?: Runtime['generateHash'];
}) {
  if (!messages) return <Empty>Waiting for output…</Empty>;

  if (messages.length === 0)
    return (
      <Empty>
        No messages found. Try a <code className="font-mono">say</code> tagged template or a{' '}
        <code className="font-mono">{'<Say>'}</code> element.
      </Empty>
    );

  return (
    <ul>
      {messages.map((message, index) => {
        // An explicit id wins; otherwise show the hash the catalogue would key on.
        const id = message.id ?? hashOf?.(message.message, message.context);

        return (
          <li
            key={`${id ?? message.message}-${index}`}
            className="border-b border-fd-border/60 px-4 py-3 last:border-b-0"
          >
            <p className="whitespace-pre-wrap wrap-break-words font-mono text-[13px] text-fd-foreground">
              {message.message}
            </p>

            {message.comments.length > 0 && (
              <p className="mt-1.5 whitespace-pre-wrap text-xs italic text-fd-muted-foreground">
                {message.comments.join('\n')}
              </p>
            )}

            <dl className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-fd-muted-foreground">
              {id && (
                <Meta
                  label="id"
                  mono
                  title={message.id ? undefined : 'Generated from the message content'}
                >
                  {id}
                </Meta>
              )}
              {message.context && <Meta label="context">{message.context}</Meta>}
              {message.references.length > 0 && (
                <Meta label="at" mono>
                  {message.references.join(', ')}
                </Meta>
              )}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

function Meta({
  label,
  children,
  mono,
  title,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  title?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5" title={title}>
      <dt className="uppercase tracking-wider opacity-60">{label}</dt>
      <dd className={mono ? 'font-mono text-fd-foreground/80' : 'text-fd-foreground/80'}>
        {children}
      </dd>
    </div>
  );
}

function Highlighted({ code }: { code?: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (code === undefined) return;

    let active = true;
    getHighlighter()
      .then((highlight) => {
        if (active) setHtml(highlight(code));
      })
      .catch(() => {
        if (active) setHtml(null);
      });

    return () => {
      active = false;
    };
  }, [code]);

  if (code === undefined)
    return (
      <div className="rounded-2xl border border-fd-border bg-fd-card px-4 py-6 text-sm text-fd-muted-foreground">
        Waiting for output…
      </div>
    );

  // Copying is handled by the pane header, so no title bar and no floating button.
  return (
    <CodeBlock allowCopy={false} className="m-0 rounded-2xl">
      {html ? (
        <Pre
          className="text-[13px] leading-6 [&>code]:contents [&_.shiki]:bg-transparent"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <Pre className="text-[13px] leading-6">
          <code>{code}</code>
        </Pre>
      )}
    </CodeBlock>
  );
}
