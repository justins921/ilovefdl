interface Product {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  sku?: string;
  url: string;
  seller?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilovefdl.com';

export function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'I Love FDL',
    description:
      'Your community platform for Fond du Lac, Wisconsin. Discover local vendors, shop handmade goods, read community news, and find daily bar specials.',
    url: BASE_URL,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Fond du Lac',
      addressRegion: 'WI',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 43.775,
      longitude: -88.4471,
    },
    areaServed: {
      '@type': 'City',
      name: 'Fond du Lac',
      sameAs: 'https://en.wikipedia.org/wiki/Fond_du_Lac,_Wisconsin',
    },
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ProductSchema({ product }: { product: Product }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    url: product.url,
    ...(product.sku && { sku: product.sku }),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency || 'USD',
      availability: `https://schema.org/${product.availability || 'InStock'}`,
      url: product.url,
      ...(product.seller && {
        seller: {
          '@type': 'Organization',
          name: product.seller,
        },
      }),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbSchema({
  items,
}: {
  items: Array<BreadcrumbItem>;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
