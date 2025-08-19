import { cosmiconfig } from 'cosmiconfig';
import { Configuration } from './shapes.js';

const explorer = cosmiconfig('sayable');

export async function resolveConfig() {
  const result = await explorer.search();
  if (!result) throw new Error('No sayable config found');
  return Configuration.parseAsync(result.config);
}
