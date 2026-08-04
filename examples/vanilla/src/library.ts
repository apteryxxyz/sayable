/**
 * These values become ICU `select` branch keys in `main.ts`, and ICU
 * identifiers may not contain a hyphen — `due-today` parses as a subtraction
 * and fails at format time. camelCase keeps them legal.
 */
export type LoanStatus = 'onLoan' | 'dueToday' | 'overdue' | 'reserved';

export interface Loan {
  title: string;
  author: string;
  /** Days until the loan is due. Negative means it is already overdue. */
  dueInDays: number;
  status: LoanStatus;
  /** How many times this loan has already been renewed. */
  renewals: number;
  /** Fine accrued so far, in cents. */
  fineInCents: number;
}

/** How many renewals a member is allowed before they must return the book. */
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

/** Position in the hold queue for the member's outstanding reservation. */
export const holdPosition = 3;

/** How many members are waiting on the same reservation, the member included. */
export const holdQueueLength = 4;

/** When the branch closes today. Formatted by `say.time`, so the shape is the locale's. */
export const closingTime = new Date(new Date().setHours(19, 30, 0, 0));

/** When the member's reservation was placed. Formatted by `say.date`. */
export const reservedOn = new Date(new Date().setDate(new Date().getDate() - 12));

/** How many of the member's holds have arrived, as a fraction for `percent`. */
export const holdsReadyRatio = 0.25;

export function totalFineInCents(entries: Loan[]) {
  return entries.reduce((total, loan) => total + loan.fineInCents, 0);
}
