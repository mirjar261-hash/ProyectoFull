import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  MessageCircle,
  MonitorSmartphone,
  ReceiptText,
  ShieldCheck,
  Store,
} from 'lucide-react';
import DemoRequestDialog from '@/components/DemoRequestDialog';
import LandingSalesChat from '@/components/LandingSalesChat';

export const metadata: Metadata = {
  title: 'Punto de venta CROV de escritorio | Control total en sucursales',
  description:
    'Opera tus sucursales con el punto de venta de escritorio CROV: inventarios, compras, caja y reportes listos para negocios con alto volumen. Agenda tu demo y equipa tu mostrador.',
  alternates: {
    canonical: 'https://puntoventacrov.com/crov/punto-venta-crov',
  },
  keywords: [
    'punto de venta crov para mostrador',
    'software de caja y facturación crov',
    'punto de venta para retail con control de inventarios',
    'demo punto de venta crov escritorio',
    'equipar sucursales con punto de venta crov',
  ],
};

const navigationLinks = [
  { label: 'Inicio', href: '/crov', current: false },
  { label: 'Directorio', href: '/crov/directorio', current: false },
  { label: 'Punto de venta Web', href: '/crov/punto-venta-web', current: false },
  { label: 'Punto de venta CROV', href: '/crov/punto-venta-crov', current: true },
  { label: 'CROV Restaurante', href: '/crov/restaurante', current: false },
];

const desktopHighlights = [
  {
    title: 'Inventario y compras sincronizados',
    description:
      'Consulta existencias en tiempo real, crea órdenes de compra y controla traspasos entre sucursales sin salir del escritorio.',
    icon: Boxes,
  },
  {
    title: 'Caja y ventas con precisión',
    description:
      'Registra ventas, devoluciones y retiros con lectores de código, cajones inteligentes y tickets personalizados.',
    icon: ReceiptText,
  },
  {
    title: 'Estrategia basada en datos',
    description:
      'Visualiza reportes de desempeño, márgenes y tendencias para reaccionar antes de que surja un problema.',
    icon: BarChart3,
  },
];

const desktopBenefits = [
  {
    title: 'Control total desde tu mostrador',
    description:
      'Opera todas tus sucursales desde una interfaz de escritorio optimizada para teclado, lectores de código de barras y pantallas táctiles.',
    icon: MonitorSmartphone,
  },
  {
    title: 'Seguridad empresarial',
    description:
      'Define perfiles de usuario, bloquea accesos sensibles y monitorea cada movimiento con bitácoras automáticas.',
    icon: ShieldCheck,
  },
  {
    title: 'Operación lista para crecer',
    description:
      'Agrega estaciones de caja adicionales, integra básculas y lectores externos, y mantén tu base de datos siempre sincronizada en la nube.',
    icon: Store,
  },
];

export default function CrovDesktopPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="relative overflow-hidden bg-gradient-to-b from-white via-orange-50/50 to-white">
        <div
          className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_65%)]"
          aria-hidden
        />
        <div className="absolute -top-48 left-1/2 h-96 w-[110rem] -translate-x-1/2 rounded-full bg-orange-100/60 blur-3xl" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-16 sm:px-10 lg:pt-24">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2 shadow-lg shadow-orange-100">
                <Image
                  src="/images/logo2.png"
                  alt="Icono CROV"
                  width={48}
                  height={48}
                  className="h-8 w-8"
                  priority
                />
              </span>
            </div>
            <div className="hidden items-center gap-8 lg:flex">
              {navigationLinks.map((item) => {
                const baseClasses = 'text-sm font-medium transition hover:text-orange-600';
                const classes = `${item.current ? 'text-orange-600' : 'text-slate-600'} ${baseClasses}`;

                if (item.href.startsWith('#')) {
                  return (
                    <a key={item.label} href={item.href} className={classes}>
                      {item.label}
                    </a>
                  );
                }

                return (
                  <Link key={item.label} href={item.href} className={classes}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link
              href="https://drive.google.com/file/d/1Jissk_c53r5g6fWPY2C_fOWjP7ZUOMcK/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-7 py-3 text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:shadow-orange-300"
            >
              Descargar Demo
              <ArrowRight className="h-5 w-5" />
            </Link>
            </div>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600">
                Punto de venta CROV Escritorio
              </p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Elige el plan que impulsa tu negocio
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                CROV se adapta al momento de tu empresa. Conoce nuestros paquetes diseñados para mejorar tu operación desde el primer día y escala con herramientas inteligentes cuando estés listo para dar el siguiente paso.
              </p>
              <div className="grid gap-6 pt-8 sm:grid-cols-3">
                {desktopHighlights.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                      <item.icon className="h-6 w-6 text-orange-500" />
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <DemoRequestDialog
                  triggerLabel="Solicitar demo de escritorio"
                  triggerClassName="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-200 transition hover:shadow-orange-300"
                />
              </div>
              <p className="text-sm text-slate-600">
                Si buscas una opción híbrida, explora el{' '}
                <Link href="/crov" className="font-semibold text-orange-600 transition hover:text-orange-700">
                  punto de venta CROV en la nube
                </Link>{' '}
                para conectar inventarios, facturación y reportes en un mismo software POS.
              </p>
            </div>
            <div className="relative">
              <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-orange-500">Video principal</p>
              <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-orange-200/70 blur-3xl" aria-hidden />
              <div className="absolute -right-10 -bottom-16 h-52 w-52 rounded-full bg-orange-100 blur-3xl" aria-hidden />
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-xl sm:p-4">
                <div className="relative overflow-hidden rounded-2xl pb-[56.25%]">
                  <iframe
                    src="https://www.youtube.com/embed/ImwPkXfmpwo?rel=0"
                    title="Video demostrativo de CROV Punto de Venta"
                    className="absolute inset-0 h-full w-full rounded-2xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16 sm:px-10">
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Conoce CROV en acción</h2>
          <p className="text-base text-slate-600">
            Explora las principales capacidades del punto de venta CROV y descubre cómo puede impulsar el crecimiento de tu negocio.
          </p>
          <p className="text-base text-slate-600">
            Desde la primera venta podrás sincronizar inventarios, administrar tu catálogo y automatizar cobros con lectores, impresoras y cajas compatibles.
          </p>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative pb-[56.25%]">
            <iframe
              src="https://www.youtube.com/embed/6mDj3App7Sk?rel=0"
              title="Capacidades del punto de venta CROV"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>

        <section className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">Más detalles</p>
          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Profundiza en nuestras funciones</h2>
            <p className="mx-auto max-w-3xl text-base text-slate-600">
              Mira cómo CROV optimiza cada paso del proceso de ventas y administración para mantener tu operación siempre bajo control.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {desktopBenefits.map((benefit) => (
              <div key={benefit.title} className="rounded-2xl border border-orange-100 bg-orange-50/40 p-6">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <benefit.icon className="h-6 w-6 text-orange-500" />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{benefit.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6 rounded-3xl border border-orange-200 bg-gradient-to-br from-white via-orange-50/60 to-white p-8 text-center shadow-lg">
          <h2 className="text-3xl font-bold text-slate-900">¿Listo para transformar tu mostrador con CROV?</h2>
          <p className="mx-auto max-w-2xl text-base text-slate-600">
            Nuestro equipo está listo para ayudarte a digitalizar tu punto de venta de escritorio. Solicita una demostración personalizada y conoce cómo CROV estandariza procesos, protege tu información y acelera cada venta.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <DemoRequestDialog
              triggerLabel="Solicitar demo de escritorio"
              triggerClassName="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-200 transition hover:shadow-orange-300"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-orange-50">
              <Image
                src="/images/logo2.png"
                alt="Logo CROV"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">CROV</p>
              <p className="text-xs text-slate-500">© {new Date().getFullYear()} CROV. Todos los derechos reservados.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <Link
              href="/aviso-de-privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900"
            >
              Aviso de privacidad
            </Link>
            <Link
              href="/terminos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900"
            >
              Términos de servicio
            </Link>
            <a href="mailto:ventas@crovmx.com" className="hover:text-slate-900">
              ventas@crovmx.com
            </a>
          </div>
        </div>
      </footer>
      <a
        href="https://wa.me/3112887082?text=Hola,%20quiero%20más%20información%20sobre%20el%20punto%20de%20venta%20CROV"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-transparent bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
        aria-label="Enviar mensaje por WhatsApp"
      >
        <MessageCircle className="h-5 w-5 text-green-600" />
        Enviar mensaje
      </a>
    </div>
  );
}
