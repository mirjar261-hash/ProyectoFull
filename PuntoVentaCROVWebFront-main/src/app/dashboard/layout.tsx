// ✅ Layout con menú y accesos directos centrados en una fila horizontal para dashboard CROV
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut, Users, Package, ShoppingCart, FileText, Box, Truck, User, UserPlus,
  PackagePlus, Tag, Layers, Search, DollarSign, Building, Wallet, PiggyBank,
  HandCoins, TrendingUp, CalendarDays, Key, LayoutDashboard, Settings, Menu, History,
  Percent, Receipt
} from 'lucide-react';
import Image from 'next/image';
import Dropdown from '@/components/ui/Dropdown';
import { Toaster } from 'sonner';
import HelpBotDialog from '@/components/HelpBotDialog';

// Guía global con flecha
import GuideArrow from '@/components/GuideArrow';
import { Walkthrough } from '@/components/Walkthrough';
// Guía simple por módulo
import ModuleGuide from '@/components/ModuleGuide';

import { getUserPermissions } from '@/lib/permissions';

const moduleInfo: Record<string, { name: string; description: string }> = {
  '/dashboard': {
    name: 'Dashboard',
    description: 'Vista general con métricas del día (ventas, compras, gastos y productos agotados). También muestra la agenda próxima y la actividad reciente para un control rápido.'
  },
  '/dashboard/compras': {
    name: 'Compras',
    description: 'Registra nuevas compras a proveedores, agrega productos desde el inventario y administra observaciones. Usa F2 para buscar productos y F3 para guardar la compra. También puedes consultar compras anteriores.'
  },
  '/dashboard/venta': {
    name: 'Ventas',
    description: 'Genera ventas de productos en inventario o registra ventas a clientes. Incluye buscador de productos (F2), botón de cotización, descuentos generales o por producto, la opción de guardar venta con F3 y la busqueda de ventas realizadas.'
  },
  '/dashboard/cxc-clientes': {
    name: 'CXC Clientes',
    description: 'Consulta el crédito de tus clientes, revisa sus ventas pendientes y registra abonos generales para mantener al día sus cuentas.'
  },
  '/dashboard/calendario': {
    name: 'Calendario',
    description: 'Visualiza tu agenda de eventos y recordatorios en formato mensual. Permite identificar fácilmente próximas actividades y planificar tus tareas.'
  },
  '/dashboard/producto': {
    name: 'Productos/Servicios',
    description: 'Crea o edita productos y servicios con sus datos completos (código, costo, precios, inventario, IVA, IEPS y foto). También puedes componer productos usando insumos para calcular costos automáticamente.'
  },
  '/dashboard/inventario': {
    name: 'Inventario',
    description: 'Consulta existencias de todos los productos, identifica los agotados o con inventario negativo y revisa la inversión total o la proyección de ventas, así mismo la edicion y eliminacion facil de productos mediante la tabla.'
  },
  '/dashboard/proveedor': {
    name: 'Proveedores',
    description: 'Registra y gestiona proveedores con sus datos fiscales y de contacto. Consulta la lista de proveedores registrados y edítalos fácilmente.'
  },
  '/dashboard/cliente': {
    name: 'Clientes',
    description: 'Administra tu cartera de clientes. Registra datos generales (nombre, contacto, crédito, tipo de precio) y datos de facturación completos (RFC, CURP, domicilio, régimen fiscal). Así como una tabla con la cual podras administrar facilmente los datos de tus clientes.'
  },
  '/dashboard/medico': {
    name: 'Médicos',
    description: 'Registra y gestiona médicos asociados a tu sucursal.'
  },
  '/dashboard/verificador': {
    name: 'Verificador de precios',
    description: 'Escanea o escribe el código de barras para consultar rápidamente el precio de un producto. Útil para clientes o para validar precios en mostrador.'
  },
  '/dashboard/corte': {
    name: 'Corte de caja',
    description: 'Controla ingresos y egresos del día. Muestra ventas, compras, gastos, retiros, devoluciones y fondo de caja. Permite seleccionar usuario y guardar el corte para cuadrar diferencias.'
  },
  '/dashboard/gerente': {
    name: 'Gerente CROV',
    description: 'Panel con estadísticas, proyecciones y datos financieros. Ofrece alertas y sugerencias inteligentes, además de un resumen visual de ingresos, egresos y devoluciones para apoyar la toma de decisiones.'
  },
};



function matchModuleKey(path: string) {
  const keys = Object.keys(moduleInfo);
  if (keys.includes(path)) return path;
  const found = keys
    .filter(k => path === k || path.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0];
  return found || null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();


  const [permisos, setPermisos] = useState<Record<string, boolean>>({});
  const [walkthroughDone, setWalkthroughDone] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userIdSession =
    typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('userId') || '0', 10)
      : 0;

  const matchedKey = matchModuleKey(pathname);
  const info = matchedKey ? moduleInfo[matchedKey] : undefined;
  const showGuideAlways = false;
  const [forceModuleKey, setForceModuleKey] = useState<string | null>(null);

  useEffect(() => {
    const completed = localStorage.getItem('walkthrough-complete');
    if (completed) setWalkthroughDone(true);

    const onStep = (ev: Event) => {
      const ce = ev as CustomEvent<any>;

      // Mientras el walkthrough esté activo, ocultar las guías por módulo
      if (ce.detail?.start) {
        setWalkthroughDone(false);
        return;
      }

      if (ce.detail?.end) {
        setWalkthroughDone(true);
        localStorage.setItem('walkthrough-complete', '1');
        // Si el Walkthrough terminó, y estamos en dashboard, forzar apertura una vez
        const shouldForce =
          localStorage.getItem('module-guide:force-open:/dashboard') === '1';
        if (shouldForce) setForceModuleKey('/dashboard');
      }
    };

    const onModuleShow = (ev: Event) => {
      const ce = ev as CustomEvent<any>;
      if (ce.detail?.key) setForceModuleKey(ce.detail.key);
    };

    window.addEventListener('guide:step', onStep as EventListener);
    window.addEventListener('module-guide:show', onModuleShow as EventListener);
    return () => {
      window.removeEventListener('guide:step', onStep as EventListener);
      window.removeEventListener('module-guide:show', onModuleShow as EventListener);
    };
  }, []);

  // --- permisos (function para evitar hoisting issues)
  async function cargarPermisos() {
    const permisosAValidar = [
      'Dashboard',
      'Compra-venta/Compra',
      'Compra-venta/Venta',
      'Compra-venta/Recargas',
      'Recargas/Recargar Saldo',
      'Recargas/Verificar Saldo',
      'Inventario/Inventario',
      'Inventario/Kardex',
      'Catálogo/Empresa',
      'Catálogo/Configuracion',
      'Catálogo/Cambiar Contraseña',
      'Registros/Registrar Proveedores',
      'Registros/Registrar Clientes',
      'Registros/Registrar Productos',
      'Registros/Registrar_usuarios',
      'Registros/Registrar departamento',
      'Registros/Registrar marca',
      'Registros/Registrar modelo',
      'Registros/Registrar Medicos',
      'Caja/Corte de dia',
      'Caja/historial',
      'Caja/Fondo de Caja',
      'Caja/Gastos',
      'Caja/Retiros',
      'Caja/Inversiones',
      'Caja/CXC clientes',
      'Reportes/Reportes',
      'Gerente/GerenteCrov',
      'Otros/Verificar Precio',
      'Agenda/Agenda',
      'Membresia',
      'Crear cuenta TAECEL',
      'Soporte',
      'Solicitud de Spin Negocios',
    ];

    const data = await getUserPermissions(userIdSession, token || undefined);

    const tienePermiso = (permiso: string) => {
      if (Array.isArray(data)) {
        return data.some(
          (p: any) =>
            p.nombre === permiso ||
            p.permiso === permiso ||
            String(p.id) === permiso
        );
      }
      const value = (data as any)?.[permiso];
      return value === 1 || value === true;
    };

    const mapa = Object.fromEntries(permisosAValidar.map((p) => [p, tienePermiso(p)]));
    setPermisos(mapa);
  }

  // Autenticación + permisos
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
      return;
    }
    cargarPermisos();
  }, [router]);

  // Contenido específico por módulo no sirve 
  function renderGuideContent(path: string) {
    switch (path) {
      case '/dashboard/compras':
        return (
          <>
            <ul className="list-disc pl-5">
              <li>Da clic en <strong>Nueva compra</strong> para iniciar.</li>
              <li>Selecciona <strong>proveedor</strong> y agrega productos.</li>
              <li>Adjunta factura si aplica y <strong>guarda</strong> para actualizar inventario.</li>
            </ul>
            <p className="mt-2">Tip: Usa el buscador por código o nombre.</p>
          </>
        );
      case '/dashboard/venta':
        return (
          <>
            <ul className="list-disc pl-5">
              <li>Escanea <strong>código de barras</strong> o busca por nombre.</li>
              <li>Aplica <strong>descuento</strong> y selecciona <strong>forma de pago</strong>.</li>
              <li>Imprime ticket y, si lo requieres, <strong>genera CFDI</strong>.</li>
            </ul>
          </>
        );
      case '/dashboard/inventario':
        return (
          <>
            <ul className="list-disc pl-5">
              <li>Consulta existencias y <strong>registra entradas/salidas</strong>.</li>
              <li>Usa <strong>Kardex</strong> para ver movimientos históricos.</li>
            </ul>
          </>
        );
      default:
        return <p>Explora las opciones del módulo y usa los accesos superiores.</p>;
    }
  }

  //items && Validaciones
  const rawItems = [
    { label: 'Membresia y pagos', href: '/dashboard/pagos', permisos: 'Membresia' },
    { label: 'Crear cuenta taecel', href: '/dashboard/taecel', permisos: 'Crear cuenta TAECEL' },
    { label: 'Spin negocios', href: '/dashboard/spinnegocios', permisos: 'Solicitud de Spin Negocios' },
    { label: 'Soporte CROV', href: '/dashboard/soporte', permisos: 'Soporte' },
  ];
  const items = rawItems.filter(item1 => !item1.permisos || permisos[item1.permisos]);

  const rawItems1 = [     
      { label: 'Venta', href: '/dashboard/venta', icon: <Building size={16} />,permisos:'Compra-venta/Compra' },
      { label: 'Compras', href: '/dashboard/compras', icon: <ShoppingCart size={16} />,permisos:'Compra-venta/Venta' },
      { label: 'Facturacion Clientes', href: '/dashboard/facturacionclientes', icon: <Receipt size={16} />,permisos:'Compra-venta/Venta' },
       { label: 'CXC Clientes', href: '/dashboard/cxc-clientes', icon: <HandCoins size={16} />, permisos: 'Caja/CXC clientes' },
    {
      label: 'Recargas de saldo',
      icon: <Wallet size={16} />,
      items: [
        { label: 'Recargar saldo', href: '/dashboard/taecel/recarga', icon: <ShoppingCart size={16} />, permisos: 'Compra-venta/Recargas' },
        { label: 'Verificar saldo', href: '/dashboard/taecel/saldo', icon: <Wallet size={16} />, permisos: 'Recargas/Verificar Saldo' },
        { label: 'Historial de recargas', href: '/dashboard/taecel/historial', icon: <History size={16} />, permisos: 'Compra-venta/Recargas' },
      ]
    },
  ];
  const items1 = rawItems1
    .map(item1 => {
      if (item1.items) {
        const subItems = item1.items.filter(sub => !sub.permisos || permisos[sub.permisos]);
        return subItems.length ? { ...item1, items: subItems } : null;
      }
      return !item1.permisos || permisos[item1.permisos] ? item1 : null;
    })
    .filter(Boolean);

  const rawItems2 = [
    { label: 'Inventario', href: '/dashboard/inventario', icon: <Building size={16} />, permisos: 'Inventario/Inventario' },
    { label: 'Kardex', href: '/dashboard/inventario/kardex', icon: <Box size={16} />, permisos: 'Inventario/Kardex' },
  ];
  const items2 = rawItems2.filter(item2 => !item2.permisos || permisos[item2.permisos]);

  const rawItems3 = [
    { label: 'Empresa', href: '/dashboard/sucursal', icon: <Users size={14} />, permisos: 'Catálogo/Empresa' },
    { label: 'Configuración', href: '/dashboard/configuracion', icon: <Settings size={14} />, permisos: 'Catálogo/Configuracion' },
    { label: 'Cambiar contraseña', href: '/dashboard/cambiar-password', icon: <Key size={14} />, permisos: 'Catálogo/Cambiar Contraseña' },
    { label: 'Promociones', href: '/dashboard/promocion', icon: <Percent size={14} />, },
    { label: 'Catalogos SAT', href: '/dashboard/catalogos-sat', icon: <FileText size={14} />, },
  ];
  const items3 = rawItems3.filter(item3 => !item3.permisos || permisos[item3.permisos]);

  const rawItems4 = [
    { label: 'Clientes', href: '/dashboard/cliente', icon: <User size={14} />, permisos: 'Registros/Registrar Clientes' },
    { label: 'Proveedores', href: '/dashboard/proveedor', icon: <Truck size={14} />, permisos: 'Registros/Registrar Proveedores' },
    { label: 'Registrar productos', href: '/dashboard/producto', icon: <PackagePlus size={14} />, permisos: 'Registros/Registrar Productos' },
    { label: 'Registrar usuarios', href: '/dashboard/usuarios', icon: <UserPlus size={14} />, permisos: 'Registros/Registrar_usuarios' },
    { label: 'Departamento', href: '/dashboard/departamento', icon: <Building size={14} />, permisos: 'Registros/Registrar departamento' },
    { label: 'Marca', href: '/dashboard/marca', icon: <Tag size={14} />, permisos: 'Registros/Registrar marca' },
    { label: 'Modelo', href: '/dashboard/modelo', icon: <Layers size={14} />, permisos: 'Registros/Registrar modelo' },
    { label: 'Medicos', href: '/dashboard/medico', icon: <User size={14} />},
  ];
  const items4 = rawItems4.filter(item4 => !item4.permisos || permisos[item4.permisos]);

  const rawItems5 = [
    { label: 'Corte del día', href: '/dashboard/corte', icon: <FileText size={14} />, permisos: 'Caja/Corte de dia' },
    { label: 'Historial de cortes', href: '/dashboard/corte/historial', icon: <History size={14} />, permisos: 'Caja/historial' },
    { label: 'Gastos', href: '/dashboard/gasto', icon: <Wallet size={14} />, permisos: 'Caja/Gastos' },
    { label: 'Fondo de caja', href: '/dashboard/inicio', icon: <PiggyBank size={14} />, permisos: 'Caja/Fondo de Caja' },
    { label: 'Retiros', href: '/dashboard/retiro', icon: <HandCoins size={14} />, permisos: 'Caja/Retiros' },
    { label: 'Inversiones', href: '/dashboard/inversion', icon: <TrendingUp size={14} />, permisos: 'Caja/Inversiones' },
    { label: 'CXC Clientes', href: '/dashboard/cxc-clientes', icon: <HandCoins size={14} />, permisos: 'Caja/Inversiones' },  ];
  const items5 = rawItems5.filter(item5 => !item5.permisos || permisos[item5.permisos]);

  const rawLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={28} />, guide: 'navegacion', permisos: 'Dashboard' },
    { href: '/dashboard/compras', label: 'Compras', icon: <ShoppingCart size={28} />, guide: 'compras', permisos: 'Compra-venta/Compra' },
    { href: '/dashboard/venta', label: 'Ventas', icon: <ShoppingCart size={28} />, guide: 'ventas', permisos: 'Compra-venta/Venta' },
    { href: '/dashboard/calendario', label: 'Agenda', icon: <CalendarDays size={28} />, guide: 'agenda', permisos: 'Agenda/Agenda' },
    { href: '/dashboard/producto', label: 'Registrar productos/servicios', icon: <Package size={28} />, guide: 'producto', permisos: 'Registros/Registrar Productos' },
    { href: '/dashboard/inventario', label: 'Inventarios', icon: <Box size={28} />, guide: 'inventario', permisos: 'Inventario/Inventario' },
    { href: '/dashboard/proveedor', label: 'Proveedores', icon: <Truck size={28} />, guide: 'proveedor', permisos: 'Registros/Registrar Proveedores' },
    { href: '/dashboard/cliente', label: 'Clientes', icon: <User size={28} />, guide: 'cliente', permisos: 'Registros/Registrar Clientes' },
    { href: '/dashboard/verificador', label: 'Verificador de precios', icon: <Search size={28} />, guide: 'verificador', permisos: 'Otros/Verificar Precio' },
    { href: '/dashboard/corte', label: 'Corte del día', icon: <DollarSign size={28} />, guide: 'corte', permisos: 'Caja/Corte de dia' },
  ];
  const links = rawLinks.filter(link => !link.permisos || permisos[link.permisos]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
      return;
    }
    cargarPermisos();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Menú superior */}
      <nav className="bg-orange-500 text-white p-4 shadow">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <Dropdown title="" icon={<Menu size={40} />} items={items} />
          <div className="flex space-x-4 text-sm items-center">
            {permisos['Compra-venta/Venta'] && (
              <nav className="flex gap-6">
                <Dropdown title="Compra/venta" icon={<Users size={16} />} items={items1} />
              </nav>
            )}
            {permisos['Inventario/Inventario'] && (
              <nav className="flex gap-6">
                <Dropdown title="Inventario" icon={<Users size={16} />} items={items2} />
              </nav>
            )}
            <nav className="flex gap-6">
              <Dropdown title="Catálogo" icon={<Package size={16} />} items={items3} />
            </nav>
            <nav className="flex gap-6">
              <Dropdown title="Registros" icon={<Users size={16} />} items={items4} />
            </nav>
            {permisos['Caja/Fondo de Caja'] && (
              <Dropdown title="Caja" icon={<DollarSign size={16} />} items={items5} />
            )}
            {permisos['Reportes/Reportes'] && (
              <Link href="/dashboard/reportes" className="flex items-center gap-1 hover:underline">
                <FileText size={16} /> Reportes
              </Link>
            )}
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('empresaToken');
                localStorage.removeItem('empresaId');
                localStorage.removeItem('lastActivity');
                window.location.href = '/';
              }}
              className="flex items-center gap-1 ml-6 hover:underline"
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
            {permisos['Gerente/GerenteCrov'] && (
              <Link href="/dashboard/gerente" data-guide="gerente-crov">
                <Image
                  src="/asistenteCROV_upscaled.jpg"
                  alt="Gerente CROV"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Accesos directos centrados en fila horizontal */}
      <div className="w-full overflow-x-auto py-4">
        <div className="flex justify-center gap-4 px-6 w-max mx-auto">
          {links.map(({ href, label, icon, guide }) => (
            <Link
              key={href}
              href={href}
              title={label}
              data-guide={guide}
              className="min-w-[140px] bg-white border rounded-xl shadow-sm hover:shadow-md px-4 py-3 flex flex-col items-center text-center transition"
            >
              <div className="text-orange-500 mb-1">{icon}</div>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Contenido de cada sección */}
      <main className="px-4 md:px-8 lg:px-16 w-full max-w-screen-2xl mx-auto">
        {children}
      </main>

      <Toaster position="top-right" richColors />
      <HelpBotDialog />
      <GuideArrow />
     

      {/* Guía simple por módulo: solo tras terminar el walkthrough global */}
      

      {/* {info && walkthroughDone && (
        <ModuleGuide
          key={matchedKey!}
          moduleKey={matchedKey!}
          title={info.name}
          description={info.description}
          alwaysShow 
          forceOpenOnce={forceModuleKey === matchedKey}
          onForceOpenConsumed={() => {
            if (forceModuleKey === '/dashboard') {
              localStorage.removeItem('module-guide:force-open:/dashboard');
            }
            setForceModuleKey(null);
          }}
        />
      )} */}


    </div>
  );
}
