export const WORDS_PER_MINUTE = 238;

export interface PageStats {
  words: number;
  images: number;
  links: number;
  language: string | null;
}

export function measure(document: Document): PageStats {
  const article = document.querySelector('article, main') ?? document.body;
  const text = article.textContent ?? '';

  return {
    words: text.split(/\s+/).filter(Boolean).length,
    images: article.querySelectorAll('img').length,
    links: article.querySelectorAll('a[href]').length,
    language: document.documentElement.lang || null,
  };
}

export function minutesFor(words: number) {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
