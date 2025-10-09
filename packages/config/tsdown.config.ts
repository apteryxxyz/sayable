import { writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsdown';
import { toJSONSchema } from 'zod';

export default defineConfig({
  entry: ['src/index.ts', 'src/commands/index.ts'],

  async onSuccess() {
    const { Configuration } = await import('./src/shapes.ts');
    const schema = toJSONSchema(Configuration, {
      target: 'draft-7',
      io: 'input',
      unrepresentable: 'any',
      override(ctx) {
        if (ctx.path.includes('formatter')) ctx.jsonSchema.type = 'null';
      },
    });
    await writeFile('dist/schema.json', JSON.stringify(schema, null, 2));
  },
});
