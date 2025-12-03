import { Guild } from '@buape/carbon';
import type { SayKit } from 'saykit';
import { kSay } from '~/constants.js';
import { getBestLocale } from '~/utils/get-best-locale.js';

declare module '@buape/carbon' {
  interface Guild {
    get say(): SayKit;
    [kSay]: SayKit;
  }
}

export function applyGuildExtension() {
  Object.defineProperty(Guild.prototype, 'say', {
    get(this: Guild) {
      const say = Reflect.get(globalThis, kSay) as SayKit;
      if (!say) throw new Error('No `say` instance available');

      this[kSay] ??= say.clone();
      const locale = getBestLocale(
        this[kSay].locales, //
        [this.rawData.preferred_locale],
      );
      this[kSay].activate(locale);
      return this[kSay];
    },
  });

  return () => {
    Object.defineProperty(Guild.prototype, 'say', {
      value: undefined,
    });
  };
}
