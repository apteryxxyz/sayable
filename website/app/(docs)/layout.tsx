import { DocsLayout, DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import { Metadata } from 'next';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

function docsOptions(): DocsLayoutProps {
  return {
    ...baseOptions(),
    tree: source.getPageTree(),
  };
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return <DocsLayout {...docsOptions()}>{children}</DocsLayout>;
}

export const metadata: Metadata = {
  title: {
    template: '%s - SayKit',
    default: 'SayKit',
  },
};
