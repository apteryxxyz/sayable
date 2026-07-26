import say, { type Locale, locales } from './i18n.js';
import { holdPosition, type Loan, loans, RENEWAL_LIMIT, totalFineInCents } from './library.js';

/**
 * Pick a starting locale from what the browser advertises. `match` walks the
 * guesses in order, accepts an exact hit, then falls back to a language-prefix
 * hit (`fr-CA` → `fr`), and finally to the first configured locale.
 */
const initial = say.match(navigator.languages as string[]);
say.activate(initial);

const app = document.querySelector<HTMLElement>('#app')!;

function dueLabel(loan: Loan) {
  if (loan.dueInDays < 0) {
    // Translators: shown in red on an overdue loan. # is the number of days.
    return say.plural(Math.abs(loan.dueInDays), {
      one: 'Overdue by # day',
      other: 'Overdue by # days',
    });
  }

  if (loan.dueInDays === 0) return say`Due back today`;

  // Translators: # is the number of days remaining before the book is due.
  return say.plural(loan.dueInDays, {
    one: 'Due in # day',
    other: 'Due in # days',
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
    one: 'You can renew this # more time',
    other: 'You can renew this # more times',
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
    one: 'You have # book on loan',
    other: 'You have # books on loan',
  });

  const hold = document.createElement('p');
  hold.textContent = say`You are ${say.ordinal(holdPosition, {
    one: '#st',
    two: '#nd',
    few: '#rd',
    other: '#th',
  })} in the hold queue`;

  const fines = totalFineInCents(loans);
  const balance = document.createElement('p');
  balance.className = 'summary__balance';
  balance.textContent = fines
    ? say`Outstanding fines: ${new Intl.NumberFormat(say.locale, {
        style: 'currency',
        currency: 'EUR',
      }).format(fines / 100)}`
    : say`No fines owing. Thank you!`;

  section.append(count, hold, balance);
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
    say.activate(select.value as Locale);
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
