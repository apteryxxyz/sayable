export interface Member {
  id: string;
  name: string;
  /** Books finished this year. */
  finished: number;
  /** Pages read this week. */
  pagesThisWeek: number;
  role: 'host' | 'member' | 'guest';
}

export const members: Member[] = [
  { id: '1', name: 'Amara', finished: 14, pagesThisWeek: 312, role: 'host' },
  { id: '2', name: 'Jonas', finished: 9, pagesThisWeek: 118, role: 'member' },
  { id: '3', name: 'Wren', finished: 9, pagesThisWeek: 96, role: 'member' },
  { id: '4', name: 'Priya', finished: 1, pagesThisWeek: 0, role: 'guest' },
];

export interface Pick {
  title: string;
  author: string;
  pages: number;
  /** Days until the discussion meets. */
  meetsInDays: number;
}

export const currentPick: Pick = {
  title: 'The Left Hand of Darkness',
  author: 'Ursula K. Le Guin',
  pages: 304,
  meetsInDays: 5,
};

export function leaderboard() {
  return [...members].sort((a, b) => b.finished - a.finished);
}

export function findMember(name: string) {
  return members.find((member) => member.name.toLowerCase() === name.toLowerCase());
}
