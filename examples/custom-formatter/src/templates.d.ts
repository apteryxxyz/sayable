/**
 * The `.email` transformer turns each template into a module exporting one
 * render function. This tells TypeScript what that module looks like — the
 * transformer runs in the bundler, long after the type-checker has had its say.
 */
declare module '*.email' {
  import type { View } from 'saykit';

  const render: (say: View, values?: Record<string, unknown>) => string;
  export default render;
}
