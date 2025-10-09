import { Say } from '@sayable/react';

export default async function HomePage() {
  const name = 'World';

  return (
    <main>
      <Say>
        Hello, <strong>{name}</strong>!
      </Say>
    </main>
  );
}
