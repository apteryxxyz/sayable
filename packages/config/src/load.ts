import { cosmiconfig } from 'cosmiconfig';
import { err, ok } from 'neverthrow';
import { prettifyError } from 'zod';
import { Configuration } from './shapes.js';

const explorer = cosmiconfig('sayable');

export async function loadConfig() {
  const result = await explorer.search();
  if (!result) return err('No sayable config found');
  const config = await Configuration.safeParseAsync(result.config);
  if (!config.success) return err(prettifyError(config.error));
  return ok(config.data);
}
