import { type APIInteraction, BaseInteraction } from '@buape/carbon';
import type { Sayable } from 'sayable';
import { kSay } from '~/constants.js';
import { getBestLocale } from '~/utils/get-best-locale.js';

declare module '@buape/carbon' {
  // biome-ignore lint/correctness/noUnusedVariables: T
  interface BaseInteraction<T extends APIInteraction> {
    get say(): Sayable;
    [kSay]: Sayable;
  }
}

export function applyBaseInteractionExtension() {
  Object.defineProperty(BaseInteraction.prototype, 'say', {
    get<T extends Extract<APIInteraction, { locale: string }>>(
      this: BaseInteraction<T>,
    ) {
      const say = Reflect.get(globalThis, kSay) as Sayable;
      if (!say) throw new Error('No `say` instance available');

      this[kSay] ??= say.clone();
      const locale = getBestLocale(
        this[kSay].locales, //
        [this.rawData.locale],
      );
      this[kSay].activate(locale);
      return this[kSay];
    },
  });

  return () => {
    Object.defineProperty(BaseInteraction.prototype, 'say', {
      value: undefined,
    });
  };
}
