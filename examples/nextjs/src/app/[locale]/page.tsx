import { Say } from '@saykit/react';
import { freeShippingThresholdInCents, products } from '../../catalogue';
import { withSay } from '../../i18n';
import { ProductCard } from './product-card';

function StorefrontPage(_: PageProps<'/[locale]'>) {
  const threshold = freeShippingThresholdInCents / 100;

  return (
    <>
      <section className="hero">
        <h1>
          <Say>Freshly roasted, shipped Thursdays</Say>
        </h1>
        <p>
          <Say>
            Free delivery on orders over <Say.Number _={{ threshold }} style="::currency/EUR" />.
          </Say>
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

export default withSay(StorefrontPage, (props) => props.params.then((params) => params.locale));
