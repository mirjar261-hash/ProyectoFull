import type { Metadata } from 'next';
import CrovHomeContent from './CrovHomeContent';

export const metadata: Metadata = {
  title: 'Punto de venta CROV | Software omnicanal con IA y facturación',
  description:
    'Descubre el punto de venta CROV con inventarios, facturación electrónica y asistentes inteligentes listos para tu negocio en México. Agenda tu consultoría y ponlo a trabajar hoy mismo.',
  alternates: {
    canonical: 'https://puntoventacrov.com/crov',
  },
  keywords: [
    'punto de venta CROV en México',
    'software de punto de venta con facturación electrónica',
    'punto de venta omnicanal con inteligencia artificial',
    'agenda demostración punto de venta CROV',
    'consultoría de implementación punto de venta crov',
  ],
};

export default function CrovHomePage() {
  return <CrovHomeContent />;
}
