import { lastDeployment } from './deploy.js';
import say, { environmentLocale } from './i18n.js';
import summary from './templates/summary.email';

say.activate(environmentLocale());

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
  one: '# file changed',
  other: '# files changed',
});

const attempt = say.ordinal(deployment.todayCount, {
  one: '#st',
  two: '#nd',
  few: '#rd',
  other: '#th',
});

console.log(headline);
console.log(say`${deployment.sha} → ${deployment.environment}, ${files}, ${duration}.`);
console.log(say`This is the ${attempt} deploy to ${deployment.environment} today.`);

if (deployment.failures.length > 0) {
  console.log(
    say.plural(deployment.failures.length, {
      one: '# check failed:',
      other: '# checks failed:',
    }),
  );
  for (const failure of deployment.failures) console.log(`  - ${failure}`);
}

console.log();

// The template was a `.email` file until the bundler ran. It is a module now,
// and it renders against whichever `Say` it is handed.
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
