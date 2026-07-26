'use client';

import { Say } from '@saykit/react';
import { useState } from 'react';

/**
 * A client component below the root `SayProvider`. `<Say>` here compiles against
 * the `"use client"` build of `@saykit/react`, which resolves messages through
 * `useSay()` — the same catalogue the server rendered with, no second fetch.
 */
export function AddToCart({ slug, disabled }: { slug: string; disabled: boolean }) {
  const [quantity, setQuantity] = useState(0);

  if (disabled) {
    return (
      <button type="button" className="cart cart--disabled" disabled>
        <Say>Unavailable</Say>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="cart"
      onClick={() => setQuantity((current) => current + 1)}
      data-slug={slug}
    >
      {quantity === 0 ? (
        <Say>Add to basket</Say>
      ) : (
        <Say.Plural _={quantity} one="# bag in basket" other="# bags in basket" />
      )}
    </button>
  );
}
