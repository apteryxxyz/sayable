export type LoanStatus = 'onLoan' | 'dueToday' | 'overdue' | 'reserved';

export interface Loan {
  title: string;
  author: string;
  dueInDays: number;
  status: LoanStatus;
  renewals: number;
  fineInCents: number;
}

export const RENEWAL_LIMIT = 3;

export const loans: Loan[] = [
  {
    title: 'The Left Hand of Darkness',
    author: 'Ursula K. Le Guin',
    dueInDays: 9,
    status: 'onLoan',
    renewals: 0,
    fineInCents: 0,
  },
  {
    title: 'Piranesi',
    author: 'Susanna Clarke',
    dueInDays: 0,
    status: 'dueToday',
    renewals: 2,
    fineInCents: 0,
  },
  {
    title: 'The Overstory',
    author: 'Richard Powers',
    dueInDays: -6,
    status: 'overdue',
    renewals: 3,
    fineInCents: 180,
  },
  {
    title: 'Solaris',
    author: 'Stanisław Lem',
    dueInDays: 21,
    status: 'reserved',
    renewals: 0,
    fineInCents: 0,
  },
];

export const holdPosition = 3;

export const holdQueueLength = 4;

export const closingTime = new Date();
closingTime.setHours(19, 30, 0, 0);

export const reservedOn = new Date();
reservedOn.setDate(reservedOn.getDate() - 12);

export const holdsReadyRatio = 0.25;

export function totalFineInCents(entries: Loan[]) {
  return entries.reduce((total, loan) => total + loan.fineInCents, 0);
}
