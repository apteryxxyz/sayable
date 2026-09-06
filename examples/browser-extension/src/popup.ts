import { catalogue } from './i18n.js';
import { minutesFor, type PageStats } from './reading.js';

const say = catalogue.locale(catalogue.match(chrome.i18n.getUILanguage()));
const root = document.querySelector<HTMLElement>('#popup')!;

function line(text: string, className?: string) {
  const p = document.createElement('p');
  p.textContent = text;
  if (className) p.className = className;
  return p;
}

function render(stats: PageStats | null) {
  root.replaceChildren();
  document.documentElement.lang = say.locale;

  const heading = document.createElement('h1');
  // Translators: the popup's heading.
  heading.textContent = say`Reading time`;
  root.append(heading);

  if (!stats) {
    root.append(line(say`I cannot read this page.`, 'muted'));
    return;
  }

  if (stats.words === 0) {
    root.append(line(say`There is no text here to read.`, 'muted'));
    return;
  }

  const minutes = minutesFor(stats.words);
  const number = new Intl.NumberFormat(say.locale);

  const estimate = document.createElement('p');
  estimate.className = 'estimate';
  // Translators: the headline estimate. # is a number of minutes.
  estimate.textContent = say.plural(minutes, {
    one: `About ${minutes} minute`,
    other: `About ${minutes} minutes`,
  });
  root.append(estimate);

  root.append(
    line(
      say`${number.format(stats.words)} words at ${number.format(238)} words per minute`,
      'muted',
    ),
  );

  if (stats.images > 0) {
    root.append(
      line(
        say.plural(stats.images, { one: `${stats.images} image`, other: `${stats.images} images` }),
        'muted',
      ),
    );
  }

  if (stats.links > 0) {
    root.append(
      line(
        say.plural(stats.links, { one: `${stats.links} link`, other: `${stats.links} links` }),
        'muted',
      ),
    );
  }

  if (stats.language && !stats.language.startsWith(say.locale)) {
    const name = new Intl.DisplayNames([say.locale], { type: 'language' }).of(stats.language);
    root.append(line(say`This page is written in ${name ?? stats.language}.`, 'notice'));
  }
}

async function load() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return render(null);

  try {
    const stats = (await chrome.tabs.sendMessage(tab.id, { type: 'measure' })) as PageStats;
    render(stats);
  } catch {
    render(null);
  }
}

void load();
