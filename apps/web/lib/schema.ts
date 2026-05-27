import { Product } from './types';

// Organization Schema
export function getOrganizationSchema() {
  const primaryDomain = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'https://yourdomain.com';
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Yousuf Rice',
    url: primaryDomain,
    logo: `${primaryDomain}/logo.png`,
    description: 'Premium quality rice delivery service with tier-based pricing and fast delivery',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['English', 'Urdu'],
    },
    sameAs: [
      // Add your social media links here
      // 'https://www.facebook.com/yousufrice',
      // 'https://www.instagram.com/yousufrice',
    ],
  };
}

// Website Schema
export function getWebsiteSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'https://yourdomain.com';
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Yousuf Rice',
    url: baseUrl,
    description: 'Order premium quality rice online with tier-based pricing and fast delivery',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// Product Schema
export function getProductSchema(product: Product, imageUrl?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'https://yourdomain.com';
  
  // Get the lowest and highest prices from pricing tiers
  const prices = [product.base_price_per_kg];
  if (product.tier_2_4kg_price) prices.push(product.tier_2_4kg_price);
  if (product.tier_5_9kg_price) prices.push(product.tier_5_9kg_price);
  if (product.tier_10kg_up_price) prices.push(product.tier_10kg_up_price);
  
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: imageUrl || `${baseUrl}/logo.png`,
    brand: {
      '@type': 'Brand',
      name: 'Yousuf Rice',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'PKR',
      lowPrice: lowestPrice,
      highPrice: highestPrice,
      availability: product.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Yousuf Rice',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '150',
    },
  };
}

// Breadcrumb Schema
export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Local Business Schema (if you have a physical location)
export function getLocalBusinessSchema() {
  const primaryDomain = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'https://yourdomain.com';
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Yousuf Rice',
    image: `${primaryDomain}/logo.png`,
    '@id': primaryDomain,
    url: primaryDomain,
    telephone: '+92-XXX-XXXXXXX', // Add your phone number
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Your Street Address',
      addressLocality: 'Your City',
      addressRegion: 'Your Province',
      postalCode: 'Your Postal Code',
      addressCountry: 'PK',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ],
      opens: '09:00',
      closes: '18:00',
    },
  };
}

// FAQ Schema
export function getFAQSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do you offer free delivery?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, we offer free delivery service for all orders.',
        },
      },
      {
        '@type': 'Question',
        name: 'What payment methods do you accept?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We accept cash on delivery (COD) for secure and convenient payment.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does tier-based pricing work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our tier-based pricing means the more you order, the better the price per unit. Larger quantities unlock bigger discounts.',
        },
      },
      {
        '@type': 'Question',
        name: 'What types of rice do you offer?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We offer premium quality rice including Every Grain XXXL, Steam Rice (X-Steam, Platinum, Premium), Sella Rice (Ultimate, Platinum, Gold), and Bachat Rice varieties.',
        },
      },
    ],
  };
}
