export type Cadence = 'daily' | 'weekdays' | 'weekly';

export interface Habit {
  id: string;
  name: string;
  cadence: Cadence;
  /** Consecutive completions. */
  streak: number;
  /** Longest streak ever reached. */
  best: number;
  /** Completions in the last 7 days. */
  thisWeek: number;
  /** Target completions per week. */
  target: number;
  doneToday: boolean;
}

export const habits: Habit[] = [
  {
    id: 'walk',
    name: 'Walk before breakfast',
    cadence: 'daily',
    streak: 21,
    best: 21,
    thisWeek: 7,
    target: 7,
    doneToday: true,
  },
  {
    id: 'read',
    name: 'Read twenty pages',
    cadence: 'daily',
    streak: 3,
    best: 44,
    thisWeek: 4,
    target: 7,
    doneToday: false,
  },
  {
    id: 'standup',
    name: 'Write the standup note',
    cadence: 'weekdays',
    streak: 0,
    best: 12,
    thisWeek: 2,
    target: 5,
    doneToday: false,
  },
  {
    id: 'call',
    name: 'Ring my grandmother',
    cadence: 'weekly',
    streak: 6,
    best: 9,
    thisWeek: 1,
    target: 1,
    doneToday: true,
  },
];

export function completedToday(entries: Habit[]) {
  return entries.filter((habit) => habit.doneToday).length;
}
