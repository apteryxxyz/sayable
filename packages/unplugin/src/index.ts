import { createTransformer } from '@sayable/tsc-plugin';
import { createUnplugin } from 'unplugin';

export default createUnplugin(() => {
  const { transform } = createTransformer();

  return {
    name: 'sayable',
    transform: {
      filter: { id: { exclude: /node_modules/ } },
      handler: (code, id) => transform({ code, id }),
    },
  };
});
