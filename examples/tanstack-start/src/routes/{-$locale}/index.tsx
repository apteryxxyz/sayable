import { Say } from '@saykit/react';
import { useSay } from '@saykit/react/client';
import { createFileRoute } from '@tanstack/react-router';
import { conferenceDay, orderedSessions, type Session, sessions, startsAt } from '../../schedule';

export const Route = createFileRoute('/{-$locale}/')({
  component: SchedulePage,
});

function Seats({ session }: { session: Session }) {
  if (session.seatsLeft === null) return <Say>Open to everyone</Say>;
  if (session.seatsLeft === 0) return <Say>Fully booked</Say>;

  return (
    <Say.Plural
      _={session.seatsLeft}
      one={<>{session.seatsLeft} seat left</>}
      other={<>{session.seatsLeft} seats left</>}
    />
  );
}

function SessionRow({ session }: { session: Session }) {
  const say = useSay();

  const time = new Intl.DateTimeFormat(say.locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(startsAt(session));

  return (
    <li className={`session session--${session.kind}`}>
      <time className="session__time">{time}</time>

      <div className="session__body">
        <h3 className="session__title">{session.title}</h3>

        <p className="session__meta">
          <Say.Select
            _={session.kind}
            talk="Talk"
            workshop="Workshop"
            lightning="Lightning talk"
            break="Break"
            other="Session"
          />{' '}
          ·{' '}
          <Say.Plural
            _={session.durationMinutes}
            one={<>{session.durationMinutes} minute</>}
            other={<>{session.durationMinutes} minutes</>}
          />{' '}
          ·{' '}
          <Say.Select
            _={session.track}
            platform="Platform track"
            product="Product track"
            community="Community track"
            other="Main track"
          />
        </p>

        {session.speaker && (
          <p className="session__speaker">
            <Say>
              Presented by <strong>{session.speaker}</strong>
            </Say>
            {session.previousTalks > 0 && (
              <>
                {' — '}
                <Say>
                  their{' '}
                  <Say.Ordinal
                    _={session.previousTalks + 1}
                    one={<>{session.previousTalks + 1}st</>}
                    two={<>{session.previousTalks + 1}nd</>}
                    few={<>{session.previousTalks + 1}rd</>}
                    other={<>{session.previousTalks + 1}th</>}
                  />{' '}
                  time on this stage
                </Say>
              </>
            )}
          </p>
        )}

        <p className="session__seats">
          <Seats session={session} />
        </p>
      </div>
    </li>
  );
}

function SchedulePage() {
  const say = useSay();

  const date = new Intl.DateTimeFormat(say.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(conferenceDay);

  const workshops = sessions.filter((session) => session.kind === 'workshop').length;

  return (
    <>
      <header className="masthead">
        <h1>
          <Say>Kōrero Conf</Say>
        </h1>
        <p className="masthead__date">{date}</p>
        <p className="masthead__summary">
          {/*
            The source locale is US English, so this says "program". en-GB
            overrides it with "programme" — and en-NZ inherits that override for
            free through the fallback chain, without restating it.
          */}
          <Say>
            The full program —{' '}
            <Say.Plural
              _={sessions.length}
              one={<>{sessions.length} session</>}
              other={<>{sessions.length} sessions</>}
            />
            , including{' '}
            <Say.Plural
              _={workshops}
              one={<>{workshops} workshop</>}
              other={<>{workshops} workshops</>}
            />
            .
          </Say>
        </p>
      </header>

      <ol className="sessions">
        {orderedSessions().map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </ol>
    </>
  );
}
