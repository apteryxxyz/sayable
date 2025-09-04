import { writeFile } from 'node:fs/promises';
import * as z from 'zod';
import { Configuration } from '../src/shapes.js';

const schema = z.toJSONSchema(Configuration, {
  target: 'draft-7',
  io: 'input',
  unrepresentable: 'any',
  override(ctx) {
    if (ctx.path.includes('extractor') || ctx.path.includes('formatter'))
      ctx.jsonSchema.type = 'string';
  },
});

await writeFile('dist/schema.json', JSON.stringify(schema, null, 2));
