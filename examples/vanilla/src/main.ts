import catalogue, { type Locale, locales } from './i18n.js';
import {
  closingTime,
  holdPosition,
  holdQueueLength,
  holdsReadyRatio,
  type Loan,
  loans,
  RENEWAL_LIMIT,
  reservedOn,
  totalFineInCents,
} from './library.js';

/**
 * Pick a starting locale from what the browser advertises. `match` walks the
 * guesses in order, accepts an exact hit, then falls back to a language-prefix
 * hit (`fr-CA` → `fr`), and finally to the first configured locale.
 */
const initial = catalogue.match(navigator.languages as string[]);

// A view is immutable, so switching locale means holding a different one
// rather than mutating the one in hand.
let say = catalogue.locale(initial);

const app = document.querySelector<HTMLElement>('#app')!;

function dueLabel(loan: Loan) {
  if (loan.dueInDays < 0) {
    // Translators: shown in red on an overdue loan. # is the number of days.
    return say.plural(Math.abs(loan.dueInDays), {
      one: `Overdue by ${Math.abs(loan.dueInDays)} day`,
      other: `Overdue by ${Math.abs(loan.dueInDays)} days`,
    });
  }

  if (loan.dueInDays === 0) return say`Due back today`;

  // Translators: # is the number of days remaining before the book is due.
  return say.plural(loan.dueInDays, {
    one: `Due in ${loan.dueInDays} day`,
    other: `Due in ${loan.dueInDays} days`,
  });
}

function statusLabel(loan: Loan) {
  return say.select(loan.status, {
    onLoan: 'On loan',
    dueToday: 'Due today',
    overdue: 'Overdue',
    reserved: 'Reserved',
    other: 'Unknown',
  });
}

function renewalLabel(loan: Loan) {
  const left = RENEWAL_LIMIT - loan.renewals;

  if (left === 0) return say`No renewals left — please return this book`;

  return say.plural(left, {
    one: `You can renew this ${left} more time`,
    other: `You can renew this ${left} more times`,
  });
}

function renderLoan(loan: Loan) {
  const article = document.createElement('article');
  article.className = `loan loan--${loan.status}`;

  const heading = document.createElement('h3');
  heading.textContent = loan.title;

  const byline = document.createElement('p');
  byline.className = 'loan__byline';
  byline.textContent = say`by ${loan.author}`;

  const status = document.createElement('p');
  status.className = 'loan__status';
  status.textContent = `${statusLabel(loan)} · ${dueLabel(loan)}`;

  const renewals = document.createElement('p');
  renewals.className = 'loan__renewals';
  renewals.textContent = renewalLabel(loan);

  article.append(heading, byline, status, renewals);
  return article;
}

function renderSummary() {
  const section = document.createElement('section');
  section.className = 'summary';

  const count = document.createElement('p');
  // Translators: the headline count at the top of the loans page.
  count.textContent = say.plural(loans.length, {
    0: 'You have nothing on loan',
    one: `You have ${loans.length} book on loan`,
    other: `You have ${loans.length} books on loan`,
  });

  const hold = document.createElement('p');
  hold.textContent = say`You are ${say.ordinal(holdPosition, {
    one: `${holdPosition}st`,
    two: `${holdPosition}nd`,
    few: `${holdPosition}rd`,
    other: `${holdPosition}th`,
  })} in the hold queue`;

  // `offset` subtracts from the selector before `#` is formatted, so a queue of
  // four reads as "you and 3 others". The exact branch is `1`, not `0`: ICU
  // tests an exact value against the original number, before the offset, so a
  // queue of one is the member and nobody else. Writing `0` here would leave
  // that case to `other` and render "You and 0 others".
  const queue = document.createElement('p');
  queue.textContent = say.plural(
    { queue: holdQueueLength },
    {
      offset: 1,
      1: 'Nobody else is waiting on your reservation',
      one: `You and ${{ queue: holdQueueLength }} other member are waiting`,
      other: `You and ${{ queue: holdQueueLength }} others are waiting`,
    },
  );

  // `say.number` is a fragment rather than a whole message, so it is written
  // inside one, extracting as `{ready, number, percent}`. The formatting stays
  // in the catalogue, where a translator can move it around the sentence.
  const ready = document.createElement('p');
  ready.textContent = say`${say.number({ ready: holdsReadyRatio }, { style: 'percent' })} of your holds are ready to collect`;

  // `say.date` and `say.time` format only the portion they name, in the shape
  // the active locale writes it — no `Intl` call at the callsite.
  const reserved = document.createElement('p');
  reserved.textContent = say`Reserved on ${say.date({ reservedOn }, { style: 'long' })}`;

  const closing = document.createElement('p');
  closing.textContent = say`This branch closes at ${say.time({ closingTime }, { style: 'short' })}`;

  const fines = totalFineInCents(loans);
  const balance = document.createElement('p');
  balance.className = 'summary__balance';
  // Currency stays an `Intl` call at the callsite rather than a `say.number`
  // style: MF1 has nowhere to write the currency code, so `{n, number,
  // currency}` would format as a literal `{$n}` rather than an amount.
  balance.textContent = fines
    ? say`Outstanding fines: ${new Intl.NumberFormat(say.locale, {
        style: 'currency',
        currency: 'EUR',
      }).format(fines / 100)}`
    : say`No fines owing. Thank you!`;

  section.append(count, hold, queue, ready, reserved, closing, balance);
  return section;
}

function renderLocalePicker() {
  const nav = document.createElement('nav');
  nav.className = 'locales';

  const label = document.createElement('span');
  label.textContent = say`Language`;
  nav.append(label);

  const select = document.createElement('select');
  for (const locale of locales) {
    const option = document.createElement('option');
    option.value = locale;
    // Ask the browser for each language's endonym, so "Français" is spelled
    // the way its own speakers spell it rather than translated four times.
    option.textContent = new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
    option.selected = locale === say.locale;
    select.append(option);
  }

  select.addEventListener('change', () => {
    say = catalogue.locale(select.value as Locale);
    document.documentElement.lang = say.locale;
    render();
  });

  nav.append(select);
  return nav;
}

function render() {
  app.replaceChildren();

  const title = document.createElement('h1');
  title.textContent = say`City Library`;

  const subtitle = document.createElement('p');
  subtitle.className = 'subtitle';
  // `say({ context })` disambiguates identical source text that needs different
  // translations. "Loans" as a page heading is not "Loans" as a verb elsewhere.
  subtitle.textContent = say({ context: 'page heading' })`My loans`;

  const list = document.createElement('div');
  list.className = 'loans';
  for (const loan of loans) list.append(renderLoan(loan));

  app.append(renderLocalePicker(), title, subtitle, renderSummary(), list);
}

document.documentElement.lang = say.locale;
render();
