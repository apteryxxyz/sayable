import { transform } from '@sayable/factory';
import { createUnplugin } from 'unplugin';

export default createUnplugin(() => {
  return {
    name: 'sayable',
    transform: {
      filter: { id: { exclude: /node_modules/ } },
      handler: (code, id) => transform(id, code),
    },
  };
});
