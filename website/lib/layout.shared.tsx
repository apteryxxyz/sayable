import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { BookOpen, FlaskConical, MessageCircleMore } from 'lucide-react';

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: 'k0d13',
  repo: 'saykit',
  branch: 'main',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'SayKit',
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      {
        text: 'Documentation',
        url: '/getting-started/introduction',
        icon: <BookOpen />,
      },
      {
        text: 'Playground',
        url: '/playground',
        icon: <FlaskConical />,
      },
      {
        text: 'Community',
        url: 'https://discord.gg/bqgAj65Em5',
        icon: <MessageCircleMore />,
      },
    ],
  };
}
