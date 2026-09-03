'use client';

import { Loader2, Wand2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VersionOption } from '@/app/(home)/playground/versions';
import {
  CopyAction,
  ErrorNotice,
  PaneAction,
  PaneHeader,
  ShareButton,
  VersionSelect,
} from './controls';
import { MessageList } from './messages';
import type { Message, Runtime } from './runtime';
import { FILE_ID, loadRuntime, previewCommit, previewOption } from './runtime';
import { decodeState, encodeState } from './share';

const CodeEditor = dynamic(() => import('./editor'), {
  ssr: false,
  loading: () => <div className="h-full min-h-96 animate-pulse bg-fd-secondary/40" />,
});

/**
 * The same component in its read-only mode, so the transformed code is rendered by
 * the editor that renders the input, one set of syntax colours, one selection
 * colour, one scrollbar. Only the placeholder differs: this pane sizes to its
 * content, so a full-height skeleton would leave a hole under the message list.
 */
const CodeViewer = dynamic(() => import('./editor'), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse bg-fd-secondary/40" />,
});

type Result = { messages: Message[]; output: string; hashOf: Runtime['generateHash'] };

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

  // Drop results from runs that were superseded while awaiting the CDN
  const run = useRef(0);

  // Applied after hydration so the server-rendered markup stays deterministic.
  // Also on `hashchange`, since opening a share link while already on the page is
  // a same-document navigation that never remounts this component
  useEffect(() => {
    // `?preview=<commit>` is the link the pipeline leaves on a pull request. It
    // offers a version the registry knows nothing about, so it is read before the
    // fragment, a share link that names the preview has to find it selectable
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
    // shares one has to ask for it too
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
          {/* No padding here, CodeMirror applies its own inside the scroller, so
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
                of its own; the filename was never meaningful here anyway. */}
            <PaneHeader
              title="Transformed code"
              action={result ? <CopyAction value={result.output} /> : undefined}
            />
            <Transformed code={result?.output} />
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Copying is handled by the pane header, so this is the editor and nothing
 * else: no title bar, no floating button. The wrapper matches the input pane's,
 * since what's inside it is the same component.
 */
function Transformed({ code }: { code?: string }) {
  if (code === undefined)
    return (
      <div className="rounded-2xl border border-fd-border bg-fd-card px-4 py-6 text-sm text-fd-muted-foreground">
        Waiting for output…
      </div>
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-fd-border bg-fd-card">
      <CodeViewer value={code} readOnly />
    </div>
  );
}
