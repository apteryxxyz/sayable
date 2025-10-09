import type * as babelCore from '@babel/core';
import { transform } from '@sayable/factory';

export default function ({ parse }: typeof babelCore): babelCore.PluginObj {
  return {
    name: 'sayable',
    visitor: {
      Program(path) {
        const currentTarget = //
          Reflect.get(path.hub, 'file') as babelCore.BabelFile;

        const newCode = transform(
          currentTarget.opts.filename!,
          currentTarget.code,
        );
        const newFile = parse(newCode, currentTarget.opts)!;
        path.node.body = newFile.program.body;
      },
    },
  };
}
