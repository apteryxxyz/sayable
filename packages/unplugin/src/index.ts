import { transformCode } from '@sayable/babel-plugin/core';
import { createUnplugin } from 'unplugin';

export default createUnplugin(() => {
  return {
    name: 'sayable',
    transform: {
      filter: { id: { exclude: /node_modules/ } },
      handler: (code, id) => transformCode(id, code),
    },
  };
});
