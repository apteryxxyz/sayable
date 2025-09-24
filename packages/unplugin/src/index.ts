import { createTransformer } from '@sayable/factory';
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
