import { catalogue, type Locale, locales } from './i18n.js';
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

const initial = catalogue.match(navigator.languages as string[]);

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

  const ready = document.createElement('p');
  ready.textContent = say`${say.number({ ready: holdsReadyRatio }, { style: 'percent' })} of your holds are ready to collect`;

  const reserved = document.createElement('p');
  reserved.textContent = say`Reserved on ${say.date({ reservedOn }, { style: 'long' })}`;

  const closing = document.createElement('p');
  closing.textContent = say`This branch closes at ${say.time({ closingTime }, { style: 'short' })}`;

  const fines = totalFineInCents(loans);
  const balance = document.createElement('p');
  balance.className = 'summary__balance';
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
  subtitle.textContent = say({ context: 'page heading' })`My loans`;

  const list = document.createElement('div');
  list.className = 'loans';
  for (const loan of loans) list.append(renderLoan(loan));

  app.append(renderLocalePicker(), title, subtitle, renderSummary(), list);
}

document.documentElement.lang = say.locale;
render();
