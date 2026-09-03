import { Say } from '@saykit/react';
import { getSay } from '@saykit/react/server';
import { currency, freeShippingThresholdInCents, products } from '../../catalogue';
import { ProductCard } from './product-card';

type StorefrontPageProps = { params: Promise<{ locale: string }> };

function StorefrontPage(_: StorefrontPageProps) {
  const say = getSay();

  const threshold = new Intl.NumberFormat(say.locale, { style: 'currency', currency }).format(
    freeShippingThresholdInCents / 100,
  );

  return (
    <>
      <section className="hero">
        <h1>
          <Say>Freshly roasted, shipped Thursdays</Say>
        </h1>
        <p>
          <Say>Free delivery on orders over {threshold}.</Say>
        </p>
      </section>

      <section className="grid">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </section>
    </>
  );
}

export default StorefrontPage;
