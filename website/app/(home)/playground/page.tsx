import type { Metadata } from 'next';
import Playground from '@/components/playground';
import { getVersions } from './versions';

export const metadata: Metadata = {
  title: 'Playground',
  description:
    'Write code and watch SayKit extract its messages and compile it, live in your browser.',
};

const DEFAULT_CODE = `const greeting = say\`Hello, $\{name}!\`;

const farewell = say\`See you soon\`;

export function Inbox({ count }: { count: number }) {
  return (
    <section>
      <h1>
        <Say>Inbox</Say>
      </h1>
      <p>
        <Say.Plural
          _={count}
          one="You have 1 unread message"
          other="You have # unread messages"
        />
      </p>
    </section>
  );
}
`;

export default async function PlaygroundPage() {
  const versions = await getVersions();

  return (
    // Matches the nav bar's content width (fumadocs' HomeLayout sets the var to 1400px).
    <main className="mx-auto w-full max-w-(--fd-layout-width) px-4 py-10">
      <div className="mb-6 max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-fd-foreground">Playground</h1>
        <p className="text-base leading-7 text-fd-muted-foreground">
          Edit the code on the left to see the messages SayKit extracts and the code it compiles to.
          Everything runs in your browser, so pick a published version to compare how it behaves.
        </p>
      </div>

      <Playground versions={versions} defaultCode={DEFAULT_CODE} />
    </main>
  );
}
