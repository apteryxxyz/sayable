import { Say } from '@saykit/react';
import { getSay } from '@saykit/react/server';
import { currency, type Product } from '../../catalogue';
import { AddToCart } from './add-to-cart';

function Availability({ product }: { product: Product }) {
  if (product.availability === 'lowStock') {
    return (
      <Say.Plural
        _={product.remaining}
        one={<>Only {product.remaining} left</>}
        other={<>Only {product.remaining} left</>}
      />
    );
  }

  if (product.availability === 'backorder') {
    return (
      <Say.Plural
        _={product.shipsInDays}
        one={<>Ships in {product.shipsInDays} day</>}
        other={<>Ships in {product.shipsInDays} days</>}
      />
    );
  }

  return (
    <Say.Select
      _={product.availability}
      inStock="In stock"
      discontinued="No longer roasted"
      other="Check back soon"
    />
  );
}

export function ProductCard({ product }: { product: Product }) {
  const say = getSay();

  const price = new Intl.NumberFormat(say.locale, { style: 'currency', currency }).format(
    product.priceInCents / 100,
  );
  const rating = new Intl.NumberFormat(say.locale, { maximumFractionDigits: 1 }).format(
    product.rating,
  );

  return (
    <article className="card">
      <h2 className="card__name">{product.name}</h2>

      <p className="card__roaster">
        <Say>
          Roasted by <strong>{product.roaster}</strong>
        </Say>
      </p>

      <p className="card__price">{price}</p>

      <p className="card__availability">
        <Availability product={product} />
      </p>

      <p className="card__reviews">
        {product.reviews === 0 ? (
          <Say>No reviews yet</Say>
        ) : (
          <Say>
            {rating} out of 5 ·{' '}
            <Say.Plural
              _={product.reviews}
              one={<>{product.reviews} review</>}
              other={<>{product.reviews} reviews</>}
            />
          </Say>
        )}
      </p>

      <AddToCart slug={product.slug} disabled={product.availability === 'discontinued'} />
    </article>
  );
}
