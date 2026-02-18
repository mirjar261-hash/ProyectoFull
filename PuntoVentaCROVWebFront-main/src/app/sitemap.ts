import type { MetadataRoute } from 'next';

const baseUrl = 'https://puntoventacrov.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified,
    },
    {
      url: `${baseUrl}/crov`,
      lastModified,
    },
    {
      url: `${baseUrl}/crov/punto-venta-crov`,
      lastModified,
    },
    {
      url: `${baseUrl}/crov/punto-venta-web`,
      lastModified,
    },
    {
      url: `${baseUrl}/crov/restaurante`,
      lastModified,
    },
    {
      url: `${baseUrl}/crov/directorio`,
      lastModified,
    },
  ];
}
