export type Outcome = 'succeeded' | 'failed' | 'rolledBack' | 'cancelled';

export interface Deployment {
  sha: string;
  environment: 'staging' | 'production';
  outcome: Outcome;
  durationSeconds: number;
  changedFiles: number;
  failures: string[];
  todayCount: number;
  actor: string;
}

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
