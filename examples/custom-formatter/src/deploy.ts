/**
 * Note the camelCase: these values are used as ICU `select` branch keys, and
 * ICU identifiers may not contain a hyphen. `rolled-back` parses as a
 * subtraction and blows up at format time, not at build time.
 */
export type Outcome = 'succeeded' | 'failed' | 'rolledBack' | 'cancelled';

export interface Deployment {
  sha: string;
  environment: 'staging' | 'production';
  outcome: Outcome;
  durationSeconds: number;
  changedFiles: number;
  /** Failing checks, if any. */
  failures: string[];
  /** How many deploys this environment has had today. */
  todayCount: number;
  actor: string;
}

/** Stand-in for whatever your CI actually reports. */
export function lastDeployment(): Deployment {
  return {
    sha: 'a3f91c2',
    environment: 'production',
    outcome: 'rolledBack',
    durationSeconds: 214,
    changedFiles: 17,
    failures: ['checkout-smoke', 'payments-contract'],
    todayCount: 4,
    actor: 'amara',
  };
}
