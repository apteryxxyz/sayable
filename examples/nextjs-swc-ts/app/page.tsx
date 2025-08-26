import say from '../lib/i18n';

export default function HomePage() {
  return (
    <main>
      <h1>{say`Hello, world!`}</h1>
    </main>
  );
}
