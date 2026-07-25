export type Track = 'platform' | 'product' | 'community';
export type SessionKind = 'talk' | 'workshop' | 'lightning' | 'break';

export interface Session {
  id: string;
  title: string;
  speaker: string | null;
  track: Track;
  kind: SessionKind;
  /** Minutes past 09:00 on the conference day. */
  startsAtMinute: number;
  durationMinutes: number;
  /** Remaining workshop seats; `null` when unlimited. */
  seatsLeft: number | null;
  /** How many previous editions this speaker has presented at. */
  previousTalks: number;
}

export const sessions: Session[] = [
  {
    id: 'kw',
    title: 'Ten years of shipping on Thursdays',
    speaker: 'Ngaire Whitmore',
    track: 'platform',
    kind: 'talk',
    startsAtMinute: 0,
    durationMinutes: 45,
    seatsLeft: null,
    previousTalks: 3,
  },
  {
    id: 'ws1',
    title: 'Instrumenting a service you did not write',
    speaker: 'Tomasz Zieliński',
    track: 'platform',
    kind: 'workshop',
    startsAtMinute: 60,
    durationMinutes: 120,
    seatsLeft: 4,
    previousTalks: 0,
  },
  {
    id: 'br',
    title: 'Morning tea',
    speaker: null,
    track: 'community',
    kind: 'break',
    startsAtMinute: 45,
    durationMinutes: 15,
    seatsLeft: null,
    previousTalks: 0,
  },
  {
    id: 'lt',
    title: 'Five things I regret about our design system',
    speaker: 'Priya Raghavan',
    track: 'product',
    kind: 'lightning',
    startsAtMinute: 195,
    durationMinutes: 10,
    seatsLeft: null,
    previousTalks: 1,
  },
  {
    id: 'ws2',
    title: 'Localising an app that was never designed for it',
    speaker: 'Élodie Marchand',
    track: 'product',
    kind: 'workshop',
    startsAtMinute: 210,
    durationMinutes: 90,
    seatsLeft: 0,
    previousTalks: 2,
  },
];

/** The conference day, in UTC. Rendered per-locale with `Intl.DateTimeFormat`. */
export const conferenceDay = new Date(Date.UTC(2026, 8, 17, 9, 0));

export function startsAt(session: Session) {
  return new Date(conferenceDay.getTime() + session.startsAtMinute * 60_000);
}

export function orderedSessions() {
  return [...sessions].sort((a, b) => a.startsAtMinute - b.startsAtMinute);
}
