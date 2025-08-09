import { createUnplugin, type UnpluginFactory } from 'unplugin';
import { createTransformer } from '~/processors.js';

export const pluginFactory: UnpluginFactory<void> = () => {
  const { transform } = createTransformer();

  return {
    name: 'sayable',
    transform: {
      filter: { id: { exclude: /node_modules/ } },
      handler: (code, id) => transform({ code, id }),
    },
  };
};

export const pluginInstance = createUnplugin(pluginFactory);
