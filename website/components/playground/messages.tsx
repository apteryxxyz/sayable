import type { Message, Runtime } from './runtime';

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-sm text-fd-muted-foreground">{children}</p>;
}

/**
 * A list rather than a table. In a half-width pane five columns leave the
 * message, the thing you actually came to read, fighting its own metadata for
 * space, and every id, context or comment added makes it narrower. Giving it a
 * full-width line and demoting the metadata to a line beneath keeps the message
 * at 100% no matter how much metadata a message carries.
 */
export function MessageList({
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
        // An explicit id wins; otherwise show the hash the catalogue would key on
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
