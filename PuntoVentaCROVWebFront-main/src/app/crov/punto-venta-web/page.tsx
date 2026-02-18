import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { ArrowRight, BarChart3, CreditCard, Headset, Layers, ShieldCheck, Users } from 'lucide-react';
import LandingSalesChat from '@/components/LandingSalesChat';
import LandingManagerChat from '@/components/LandingManagerChat';
import DemoRequestDialog from '@/components/DemoRequestDialog';
import PackagesCarousel from '@/components/PackagesCarousel';

export const metadata: Metadata = {
  title: 'Punto de venta web CROV | Vende en la nube con recargas y facturación',
  description:
    'Activa el punto de venta web CROV y vende desde cualquier dispositivo con recargas, inventarios y facturación en línea. Solicita tu demo personalizada y conecta todas tus sucursales.',
  alternates: {
    canonical: 'https://puntoventacrov.com/crov/punto-venta-web',
  },
  keywords: [
    'punto de venta web en la nube crov',
    'software de punto de venta con recargas y facturación electrónica',
    'crov punto de venta web demo',
    'administrar sucursales online con punto de venta crov',
    'agenda demo punto de venta web crov',
  ],
};

const features = [
  {
    title: 'Control absoluto de inventarios y ventas',
    description:
      'Da seguimiento en tiempo real a existencias, movimientos de caja y ventas desde cualquier dispositivo.',
    icon: Layers,
  },
  {
    title: 'Genera ingresos extra con recargas electrónicas',
    description:
      'Activa recargas Telcel, Movistar, AT&T y más para tus clientes con solo un clic, sin máquinas externas.',
    icon: CreditCard,
  },
  {
    title: 'Reportes claros y decisiones inteligentes',
    description:
      'Consulta ventas por día, producto o usuario con métricas fáciles de entender.',
    icon: BarChart3,
  },
];

const highlights = [
  {
    value: '99.9% ',
    label: 'Disponibilidad garantizada',
    icon: ShieldCheck,
  },
  {
    value: '+5,000 ',
    label: 'Usuarios activos en Latinoamérica',
    icon: Users,
  },
  {
    value: '24/7 ',
    label: 'Soporte especializado',
    icon: Headset,
  },
];

const steps = [
  {
    number: '01',
    title: 'Configura tu negocio en minutos',
    description:
      'Registra tus productos, usuarios y sucursales de manera rápida con asistentes guiados.',
  },
  {
    number: '02',
    title: 'Comienza a vender y ofrecer recargas',
    description:
      'Tu sistema está listo para usar desde el primer día: vende, imprime tickets y realiza recargas desde la misma plataforma.',
  },
  {
    number: '03',
    title: 'Deja que el Gerente CROV trabaje por ti',
    description:
      'Tu asistente inteligente analiza tus ventas, te avisa cuándo un producto está por agotarse, te sugiere qué volver a comprar y te envía alertas automáticas al WhatsApp o correo.',
  },
];

const testimonials = [
  {
    quote:
      'CROV nos permitió centralizar nuestras 12 sucursales en un solo panel y reducir los errores de inventario en un 38%.',
    author: 'Alejandra Gómez',
    role: 'Directora Operativa, Grupo Comercial Aurora',
  },
  {
    quote:
      'La curva de aprendizaje fue mínima. Nuestro equipo comenzó a facturar y cobrar en línea desde el primer día.',
    author: 'José Luis Martínez',
    role: 'CEO, TechMarket MX',
  },
];


const packages = [
  {
    name: 'Negocios',
    price: '$299 MXN/mensual',
    description: 'Ideal para negocios',
    icon: 'store',
    benefits: [
      'Inventario, ventas, compras, clientes y proveedores',
      'Recargas y pagos de servicios',
      'Cortes del día y reportes',
      'Soporte 24/7 con nuestro asistente CROV',
    ],
  },
  {
    name: 'Negocios anual',
    price: '$3,289 MXN/anual',
    description: 'Ideal para negocios',
    icon: 'store',
    benefits: [
      'Inventario, ventas, compras, clientes y proveedores',
      'Recargas y pagos de servicios',
      'Cortes del día y reportes',
      'Soporte 24/7 con nuestro asistente CROV',
    ],
  },
  {
    name: 'Inteligente',
    price: '$499 MXN/mensual',
    description: 'Con inteligencia artificial',
    icon: 'brain',
    benefits: [
      'Todo el paquete Negocios',
      'Gerente CROV que analiza tus ventas',
      'Sugiere promociones con IA',
    ],
  },
  {
    name: 'Inteligente anual',
    price: '$5,489 MXN/anual',
    description: 'Con inteligencia artificial',
    icon: 'brain',
    benefits: [
      'Todo el paquete Negocios',
      'Gerente CROV que analiza tus ventas',
      'Sugiere promociones con IA',
    ],
  },
];

const navigationLinks = [
  { label: 'Inicio', href: '/crov', current: false },
  { label: 'Directorio', href: '/crov/directorio', current: false },
  { label: 'Punto de venta Web', href: '/crov/punto-venta-web', current: true },
  { label: 'Punto de venta CROV', href: '/crov/punto-venta-crov', current: false },
  { label: 'CROV Restaurante', href: '/crov/restaurante', current: false },
];

export default function CrovLandingPage() {
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
                href="/register"
                className="hidden items-center gap-2 rounded-full bg-white px-7 py-3 text-base font-semibold text-orange-600 shadow-lg shadow-orange-100 ring-2 ring-orange-400 transition hover:text-orange-700 hover:shadow-orange-200 sm:inline-flex"
              >
                Crear demo
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-7 py-3 text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:shadow-orange-300"
              >
                Iniciar sesión
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600">
                Sistema con IA
              </p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Obtén tus 30 días gratis
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                Controla inventarios en tiempo real, agiliza tus ventas y toma decisiones con datos — todo desde una plataforma unificada y accesible desde cualquier dispositivo.
                Ideal para tiendas, ferreterias, boutiques y negocios en crecimiento que buscan simplicidad, control y escalabilidad.
              </p>
              <div className="flex flex-wrap gap-4">
                <DemoRequestDialog
                  triggerLabel="Agendar demostración"
                  triggerClassName="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-200 transition hover:shadow-orange-300"
                />
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-orange-400 hover:text-slate-900"
                >
                  Conocer funcionalidades
                </a>
              </div>
              <p className="text-sm text-slate-600">
                ¿Quieres explorar más soluciones? Visita el{' '}
                <Link href="/crov" className="font-semibold text-orange-600 transition hover:text-orange-700">
                  punto de venta CROV y nuestro software POS
                </Link>{' '}
                para descubrir todas las opciones de inventarios y facturación.
              </p>
              <div className="grid gap-6 pt-8 sm:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
                        <item.icon className="h-6 w-6 text-orange-500" />
                      </span>
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{item.value}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-orange-200/70 blur-3xl" aria-hidden />
              <div className="absolute -right-10 -bottom-16 h-52 w-52 rounded-full bg-orange-100 blur-3xl" aria-hidden />
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                <Image
                  src="/images/CROV_LAPTOP.png"
                  alt="Panel principal de CROV"
                  width={720}
                  height={520}
                  className="h-full w-full object-cover mix-blend-multiply"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 py-24 sm:px-10">
        <section id="features" className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500/70">Funcionalidades clave</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Todo lo que necesitas para operar y vender sin complicaciones
            </h2>
            <p className="text-base text-slate-600">
              CROV Web centraliza todas tus operaciones en un solo lugar: controla inventarios, registra ventas, administra 
              cajas y ofrece servicios adicionales como recargas electrónicas directamente a tus clientes. Diseñado para 
              negocios que buscan orden, rapidez y crecimiento sin complicarse.
            </p>
            <ul className="space-y-6">
              {features.map((feature) => (
                <li
                  key={feature.title}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                    <feature.icon className="h-6 w-6 text-orange-500" />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-10 shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_60%)]" aria-hidden />
            <div className="relative space-y-8">
              {steps.map((step) => (
                <div key={step.number} className="flex gap-6">
                  <span className="text-4xl font-bold text-orange-500/90">{step.number}</span>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative mt-10 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 mt-0.5">
    <path fillRule="evenodd" d="M1.53 16.28L10.47 3.52a1.5 1.5 0 012.56 0l8.94 12.76A1.5 1.5 0 0120.69 19H3.31a1.5 1.5 0 01-1.78-2.72zM12 9a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0012 9zm0 7a1.125 1.125 0 100-2.25A1.125 1.125 0 0012 16z" clipRule="evenodd" />
  </svg>
  <p className="text-red-800">
    <strong>Importante:</strong> No esperes a que se agote tu inventario. CROV te alerta antes de que sea un problema.
  </p>
</div>

          </div>
        </section>

        <section className="grid gap-12 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-orange-50/40 to-white p-10 lg:grid-cols-[0.9fr,1.1fr] lg:items-center">
          <div className="relative flex justify-center">
            <div className="absolute -inset-6 rounded-full bg-orange-100 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-orange-200 bg-white p-6 shadow-xl">
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-50 via-white to-orange-100">
                <Image
                  src="/images/gerente_crov-sin-fondo.png"
                  alt="Gerente CROV"
                  width={420}
                  height={420}
                  className="h-auto w-[260px] sm:w-[320px] lg:w-[360px]"
                />
              </div>
            </div>
          </div>
          <div className="space-y-6 text-left lg:pl-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500/70">Nuestro equipo</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Conoce a nuestro gerente CROV</h2>
            <p className="text-base text-slate-600">
              El Gerente CROV es el asistente inteligente integrado en nuestra plataforma, diseñado para ayudarte a tomar decisiones con información real y en el momento justo. No solo muestra métricas: analiza tus ventas, identifica patrones y te alerta cuando algo requiere tu atención, como inventarios en riesgo, productos con bajo desempeño o oportunidades de crecimiento.
              Su objetivo es que nunca tomes decisiones a ciegas. El Gerente CROV trabaja en segundo plano para mantener tu operación organizada, rentable y siempre un paso adelante.
            </p>
            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
              <p className="text-lg font-semibold text-slate-900">“Nuestro compromiso es que cada empresa que confíe en CROV
                tenga resultados medibles desde el primer mes.”</p>
              <p className="mt-4 text-sm font-medium text-orange-500">Gerente CROV</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <LandingManagerChat />
            </div>
          </div>
        </section>

        <section id="punto-venta-crov" className="space-y-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500/70">Paquetes disponibles</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Elige el plan que impulsa tu negocio</h2>
            <p className="max-w-3xl text-base text-slate-600">
              CROV se adapta al momento de tu empresa. Conoce nuestros paquetes diseñados para mejorar tu operación desde el
              primer día y escala con herramientas inteligentes cuando estés listo para dar el siguiente paso.
            </p>
          </div>
          
          <PackagesCarousel packages={packages} />
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-200 transition hover:shadow-orange-300"
            >
              Crear demo ahora
              <ArrowRight className="h-5 w-5" />
            </Link>
            <LandingSalesChat
              triggerClassName="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-orange-400 hover:text-slate-900"
            />
          </div>
        </section>

        <section className="space-y-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500/70">Historias de éxito</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Equipos que confían en CROV para crecer</h2>
            <p className="max-w-2xl text-base text-slate-600">
              Cada día ayudamos a empresas a conectar operaciones, mejorar sus tiempos de respuesta y ofrecer experiencias
              consistentes en cada punto de contacto.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <blockquote
                key={testimonial.author}
                className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 text-left shadow-sm"
              >
                <p className="text-lg text-slate-700">“{testimonial.quote}”</p>
                <footer className="mt-6 text-sm font-medium text-orange-500">
                  {testimonial.author}
                  <span className="block text-xs font-normal text-slate-500">{testimonial.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      </main>

      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-white py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.12),_transparent_60%)]" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Comienza hoy mismo a modernizar tu punto de venta web
          </h2>
          <p className="text-base text-slate-600">
            Agenda una demostración personalizada y descubre cómo CROV puede ayudarte a escalar tus operaciones, mejorar
            la trazabilidad de tus ventas y ofrecer un servicio excepcional en cada sucursal.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <DemoRequestDialog
              triggerClassName="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-200 transition hover:shadow-orange-300"
            />
            <LandingSalesChat
              triggerClassName="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-orange-400 hover:text-slate-900"
            />
          </div>
        </div>
      </section>

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
        href="https://wa.me/3112887082?text=Hola,%20quiero%20más%20información%20sobre%20el%20punto%20de%20venta%20Web"
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
