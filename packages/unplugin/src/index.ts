import { transformCode } from '@saykit/babel-plugin/core';
import { createUnplugin } from 'unplugin';

export default createUnplugin(() => {
  return {
    name: 'saykit',
    transform: {
      filter: { id: { exclude: /node_modules/ } },
      handler: (code, id) => transformCode(id, code),
    },
  };
});
