import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Languages,
  PackageCheck,
  Rocket,
  ScanSearch,
  SquareTerminal,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createHighlighter } from 'shiki';

const frameworks = ['React', 'Next.js', 'Expo', 'Carbon'];

const workflow = [
  {
    name: 'Define',
    icon: Code2,
    description: 'Author messages inline with tagged templates or React components.',
  },
  {
    name: 'Extract',
    icon: ScanSearch,
    description: 'Scan source files and collect ICU-ready messages into translation files.',
  },
  {
    name: 'Translate',
    icon: Languages,
    description: 'Hand translators clean PO files with comments, context, and stable identifiers.',
  },
  {
    name: 'Compile',
    icon: PackageCheck,
    description: 'Build locale catalogs into runtime-ready message bundles for your app.',
  },
  {
    name: 'Deploy',
    icon: Rocket,
    description:
      'Ship small runtime helpers while keeping extraction and transforms in build time.',
  },
] satisfies { name: string; icon: React.ElementType; description: string }[];

const features = [
  'Compile-time extraction from JS, TS, JSX, and TSX',
  'ICU MessageFormat support for plurals, ordinals, and select',
  'Framework-agnostic core runtime with adapters where needed',
  'Typed config and CLI for extract, compile, and build',
];

const CODE_EXAMPLE = `import { Say } from '@saykit/react';

export function Inbox({ count }: { count: number }) {
  return (
    <section>
      <h1><Say>Inbox</Say></h1>
      <p>
        <Say.Plural
          _={count}
          zero="You have no unread messages"
          one="You have 1 unread message"
          other="You have # unread messages"
        />
      </p>
    </section>
  );
}`;

const SHIKI_THEMES = { dark: 'github-dark', light: 'github-light' } as const;

export const metadata: Metadata = {
  title: 'SayKit',
  description: 'Compile-time i18n for JavaScript, TypeScript, React, Next.js, Expo, and Carbon.',
};

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-medium text-fd-muted-foreground">
      {children}
    </span>
  );
}

export default async function HomePage() {
  const highlighter = await createHighlighter({
    themes: Object.values(SHIKI_THEMES),
    langs: ['tsx', 'bash'],
  });

  const highlight = (code: string, lang: 'tsx' | 'ts') =>
    highlighter.codeToHtml(code, { lang, themes: SHIKI_THEMES, defaultColor: false });

  const codeHtml = highlight(CODE_EXAMPLE, 'tsx');

  return (
    <main className="relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-512"
        style={{
          background: [
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.18) 0%, transparent 70%)',
            'radial-gradient(ellipse 50% 40% at 20% 10%, rgba(16,185,129,0.13) 0%, transparent 60%)',
          ].join(', '),
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 70%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 70%, transparent 100%)',
        }}
      />

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6">
          <Pill>Compile-time i18n for modern TypeScript apps</Pill>

          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-fd-foreground sm:text-5xl">
              Write messages in code. Ship translations with almost no runtime baggage.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-fd-muted-foreground sm:text-lg">
              SayKit is a framework-agnostic i18n toolkit built around compile-time extraction,
              typed configuration, and small runtime primitives. It keeps authoring ergonomic for
              developers and translation flows clean for everyone else.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/getting-started/introduction"
              className="inline-flex items-center gap-2 rounded-full bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition hover:opacity-90"
            >
              Read the docs <ArrowRight className="size-4" />
            </Link>
            <Link
              href="https://github.com/k0d13/saykit"
              className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-4 py-2 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent"
            >
              View on GitHub
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {frameworks.map((f) => (
              <Pill key={f}>{f}</Pill>
            ))}
          </div>
        </div>

        {/* Code cards */}
        <div className="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-[1.25fr_0.9fr]">
          <CodeBlock
            icon={<SquareTerminal className="size-4" />}
            title="Code example"
            allowCopy={false}
            className="rounded-3xl m-0"
          >
            <Pre
              className="text-[13px] leading-6 [&>code]:contents [&_.shiki]:bg-transparent"
              dangerouslySetInnerHTML={{ __html: codeHtml }}
            />
          </CodeBlock>

          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-fd-border bg-fd-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-fd-muted-foreground">
                Why it feels good
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-fd-foreground">
                {features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-fd-border bg-fd-card p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-fd-muted-foreground">
                Terminal
              </p>
              <div className="mt-4 rounded-xl bg-fd-secondary/60 p-3 font-mono text-[13px] leading-6">
                <p>
                  <span className="text-fd-muted-foreground">$ </span>
                  <span className="text-fd-foreground">saykit extract</span>
                </p>
                <p className="text-emerald-500">✓ 2 messages extracted</p>
                <p className="text-fd-muted-foreground"> → locales/en.po</p>
                <p className="mt-2">
                  <span className="text-fd-muted-foreground">$ </span>
                  <span className="text-fd-foreground">saykit compile</span>
                </p>
                <p className="text-emerald-500">✓ 3 locales compiled</p>
                <p className="text-fd-muted-foreground"> → locales/en.json, fr.json, ja.json</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-fd-muted-foreground">
              End to end workflow
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-fd-foreground">
              A simple translation pipeline that stays close to your codebase
            </h2>
            <p className="text-base leading-7 text-fd-muted-foreground">
              SayKit is designed for the whole path from authoring to deployment, without pushing
              app teams into a heavyweight platform.
            </p>
          </div>

          <div className="grid gap-4">
            {workflow.map(({ name, icon: Icon, description }, i) => (
              <div
                key={name}
                className="grid gap-4 rounded-3xl border border-fd-border bg-fd-card p-5 sm:grid-cols-[auto_1fr]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-fd-border bg-fd-secondary text-fd-foreground">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-sm font-medium text-fd-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-fd-foreground">{name}</h3>
                  <p className="mt-1 text-sm leading-6 text-fd-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:pb-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 rounded-4xl border border-fd-border bg-linear-to-br from-fd-card via-fd-card to-fd-secondary/60 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-fd-muted-foreground">
            Ready to try it?
          </p>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-fd-foreground">
              Start with the docs, then adapt the example closest to your stack.
            </h2>
            <p className="text-base leading-7 text-fd-muted-foreground">
              The repo already includes examples for Next.js, TanStack Start, and Carbon, and the
              core package is intended to stay useful even outside framework-specific adapters.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/getting-started/installation"
              className="inline-flex items-center gap-2 rounded-full bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition hover:opacity-90"
            >
              Installation <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/integrations/react"
              className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-4 py-2 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent"
            >
              View integrations
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
