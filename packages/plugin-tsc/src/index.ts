import { createVisitor } from '@sayable/factory';
// @ts-expect-error
// biome-ignore lint/correctness/noUnusedImports: export errors without
import type t from 'typescript';

export default () => createVisitor();
