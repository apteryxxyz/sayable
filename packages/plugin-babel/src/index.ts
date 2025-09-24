import type * as babelCore from '@babel/core';
import { createTransformer } from '@sayable/factory';

export default function ({ parse }: typeof babelCore): babelCore.PluginObj {
  const { transform } = createTransformer();

  return {
    name: 'sayable',
    visitor: {
      Program(path) {
        const currentTarget = //
          Reflect.get(path.hub, 'file') as babelCore.BabelFile;

        const newCode = transform({
          code: currentTarget.code,
          id: currentTarget.opts.filename!,
        });
        const newFile = parse(newCode, currentTarget.opts)!;
        path.node.body = newFile.program.body;
      },
    },
  };
}
