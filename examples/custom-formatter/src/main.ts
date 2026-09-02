import { lastDeployment } from './deploy.js';
import catalogue, { environmentLocale } from './i18n.js';
import summary from './templates/summary.email';

const say = catalogue.locale(environmentLocale());

const deployment = lastDeployment();

const duration = new Intl.NumberFormat(say.locale, {
  style: 'unit',
  unit: 'second',
  unitDisplay: 'long',
}).format(deployment.durationSeconds);

const headline = say.select(deployment.outcome, {
  succeeded: 'Deploy succeeded',
  failed: 'Deploy failed',
  rolledBack: 'Deploy rolled back',
  cancelled: 'Deploy cancelled',
  other: 'Deploy finished',
});

const files = say.plural(deployment.changedFiles, {
  0: 'no files changed',
  one: `${deployment.changedFiles} file changed`,
  other: `${deployment.changedFiles} files changed`,
});

const attempt = say.ordinal(deployment.todayCount, {
  one: `${deployment.todayCount}st`,
  two: `${deployment.todayCount}nd`,
  few: `${deployment.todayCount}rd`,
  other: `${deployment.todayCount}th`,
});

console.log(headline);
console.log(say`${deployment.sha} → ${deployment.environment}, ${files}, ${duration}.`);
console.log(say`This is the ${attempt} deploy to ${deployment.environment} today.`);

if (deployment.failures.length > 0) {
  console.log(
    say.plural(deployment.failures.length, {
      one: `${deployment.failures.length} check failed:`,
      other: `${deployment.failures.length} checks failed:`,
    }),
  );
  for (const failure of deployment.failures) console.log(`  - ${failure}`);
}

console.log();

// The template was a `.email` file until the bundler ran. It is a module now,
// and it renders against whichever view it is handed.
console.log(
  summary(say, {
    actor: deployment.actor,
    sha: deployment.sha,
    environment: deployment.environment,
    changed: deployment.changedFiles,
    duration,
    url: `https://ci.example.com/deploys/${deployment.sha}`,
  }),
);
