import { createTransformer } from '@sayable/tsc-plugin';
import { createUnplugin } from 'unplugin';

// I know that using unplugin and not providing every framework it supports is
// dumb, but I just much prefer the package naming convention of @sayable/esbuild-plugin
// over something like @sayable/universal-plugin/esbuild...

export default createUnplugin(() => {
  const { transform } = createTransformer();

  return {
    name: 'sayable',
    transform: {
      filter: { id: { exclude: /node_modules/ } },
      handler: (code, id) => transform({ code, id }),
    },
  };
}).esbuild;
