declare module '*.email' {
  import type { View } from 'saykit';

  const render: (say: View, values?: Record<string, unknown>) => string;
  export default render;
}
