export type Availability = 'inStock' | 'lowStock' | 'backorder' | 'discontinued';

export interface Product {
  slug: string;
  name: string;
  roaster: string;
  priceInCents: number;
  availability: Availability;
  remaining: number;
  reviews: number;
  rating: number;
  shipsInDays: number;
}

export const products: Product[] = [
  {
    slug: 'kiamugumo-ab',
    name: 'Kiamugumo AB',
    roaster: 'Harbour Roastery',
    priceInCents: 1850,
    availability: 'inStock',
    remaining: 64,
    reviews: 128,
    rating: 4.6,
    shipsInDays: 0,
  },
  {
    slug: 'la-esperanza-geisha',
    name: 'La Esperanza Geisha',
    roaster: 'Nordkap Kaffe',
    priceInCents: 4200,
    availability: 'lowStock',
    remaining: 3,
    reviews: 41,
    rating: 4.9,
    shipsInDays: 0,
  },
  {
    slug: 'monsooned-malabar',
    name: 'Monsooned Malabar',
    roaster: 'Harbour Roastery',
    priceInCents: 1450,
    availability: 'backorder',
    remaining: 0,
    reviews: 7,
    rating: 4.1,
    shipsInDays: 9,
  },
  {
    slug: 'winter-blend',
    name: 'Winter Blend',
    roaster: 'Harbour Roastery',
    priceInCents: 1200,
    availability: 'discontinued',
    remaining: 0,
    reviews: 302,
    rating: 4.3,
    shipsInDays: 0,
  },
];

export const currency = 'EUR';

export const freeShippingThresholdInCents = 3500;

export function findProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
