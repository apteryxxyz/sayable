import { Say } from '@saykit/react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import say from '../../i18n';

export const Route = createFileRoute('/{-$locale}/')({
  component: Home,
});

function Home() {
  const [count, setCount] = useState(0);
  const current = Route.useParams().locale || 'en';

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <p>
        <Say>Count: {count}</Say>
      </p>

      <button onClick={() => setCount(count + 1)}>
        <Say>Increment</Say>
      </button>

      <button onClick={() => setCount(0)} style={{ marginLeft: '10px' }}>
        <Say context="counter">Reset</Say>
      </button>

      <nav style={{ marginTop: '20px' }}>
        {Array.from(say).map(([, locale]) => (
          <Link
            key={locale}
            to="/{-$locale}"
            params={{ locale }}
            style={{ marginRight: '10px', fontWeight: locale === current ? 'bold' : 'normal' }}
          >
            {locale}
          </Link>
        ))}
      </nav>
    </div>
  );
}
