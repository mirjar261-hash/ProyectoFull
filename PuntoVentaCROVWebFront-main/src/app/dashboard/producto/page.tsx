'use client';

import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductSearchDialog from '@/components/ProductSearchDialog';
import { CatalogoSATDialog } from '@/components/CatalogosSat';
import Image from 'next/image';
import axios from 'axios'; 
import { 
  Trash2, 
  RotateCcw, 
  Save, 
  Search, 
  Plus, 
  Pencil, 
  BookOpen, 
  PlayCircle, 
  ChevronDown,
  Fingerprint, 
  FileText, 
  DollarSign, 
  Tags, 
  Image as ImageIcon, 
  FileCheck, 
  Percent, 
  Coins, 
  MousePointerClick, 
  ChefHat, 
  List, 
  Scale, 
  Lock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface GuideStepWithTab extends GuideStep {
  requiredTab?: 'producto' | 'insumos';
  icon?: React.ReactNode; 
}

// === DEFINICIÓN DE LOS 4 FLUJOS DE GUÍA ===

const GUIDE_FLOW_CREATE: GuideStepWithTab[] = [
  {
    targetKey: "codigo",
    title: "1. Agregar: Identificación",
    icon: <Fingerprint className="w-6 h-6 text-blue-500" />,
    content: "Para agregar un nuevo producto, inicia llenando el código único. Si está vacío, el sistema no te dejará guardar.",
    placement: "right",
    modalPosition: "bottom-right",
    requiredTab: 'producto'
  },
  {
    targetKey: "nombre",
    title: "2. Agregar: Descripción",
    icon: <FileText className="w-6 h-6 text-blue-500" />,
    content: "Ingresa el nombre completo del producto o servicio.",
    placement: "right",
    modalPosition: "bottom-right",
    requiredTab: 'producto'
  },
  {
    targetKey: "costos-inventario", 
    title: "3. Agregar: Costos",
    icon: <DollarSign className="w-6 h-6 text-green-600" />,
    content: "Define el costo y el inventario inicial. Recuerda que el 'Costo' es la base para calcular tu utilidad.",
    placement: "right",
    modalPosition: "bottom-right",
    requiredTab: 'producto'
  },
  {
    targetKey: "clasificacion", 
    title: "4. Agregar: Clasificación",
    icon: <Tags className="w-6 h-6 text-purple-500" />,
    content: "Organiza tu catálogo seleccionando el Departamento, Marca y Modelo. Esto es vital para mantener ordenados tus reportes.",
    placement: "left",
    modalPosition: "bottom-left",
    requiredTab: 'producto'
  },
  {
    targetKey: "imagen-upload",
    title: "5. Agregar: Imagen",
    icon: <ImageIcon className="w-6 h-6 text-pink-500" />,
    content: "Sube una imagen para identificar visualmente el producto en el punto de venta.",
    placement: "left",
    modalPosition: "bottom-left",
    requiredTab: 'producto'
  },
  {
    targetKey: "sat-block",
    title: "6. Agregar: Fiscal",
    icon: <FileCheck className="w-6 h-6 text-slate-600" />,
    content: "Selecciona las claves SAT obligatorias para la facturación 4.0.",
    placement: "left",
    modalPosition: "top-left",
    requiredTab: 'producto'
  },
  {
    targetKey: "impuestos",
    title: "7. Agregar: Impuestos",
    icon: <Percent className="w-6 h-6 text-orange-500" />,
    content: "Configura el IVA e IEPS. Si es un servicio intangible, marca la casilla 'Es servicio' para no controlar stock.",
    placement: "left",
    modalPosition: "top-left",
    requiredTab: 'producto'
  },
  {
    targetKey: "precios-section",
    title: "8. Agregar: Precios",
    icon: <Coins className="w-6 h-6 text-yellow-500" />,
    content: "Establece tus precios de venta. El sistema calculará la utilidad automáticamente.",
    placement: "above",
    modalPosition: "top-right",
    requiredTab: 'producto'
  },
  {
    targetKey: "btn-guardar",
    title: "9. Agregar: Guardar",
    icon: <Save className="w-6 h-6 text-blue-600" />,
    content: "Haz clic en Guardar para registrar el nuevo producto en la base de datos.",
    placement: "left",
    modalPosition: "top-left",
    requiredTab: 'producto'
  }
];

const GUIDE_FLOW_UPDATE: GuideStepWithTab[] = [
  {
    targetKey: "btn-search-product",
    title: "1. Modificar: Buscar",
    icon: <Search className="w-6 h-6 text-blue-500" />,
    content: "Para modificar, primero debes encontrar el producto. Al darle Siguiente, abriremos el buscador por ti.",
    placement: "left",
    modalPosition: "bottom-left",
    requiredTab: 'producto'
  },
  {
    targetKey: "btn-search-product",
    title: "2. Modificar: Seleccionar",
    icon: <MousePointerClick className="w-6 h-6 text-blue-500" />,
    content: "En la ventana, busca tu producto por nombre o código y haz DOBLE CLIC sobre él para cargar sus datos.",
    placement: "left",
    modalPosition: "bottom-left",
    requiredTab: 'producto'
  },
  {
    targetKey: "nombre",
    title: "3. Modificar: Editar Datos",
    icon: <Pencil className="w-6 h-6 text-amber-500" />,
    content: "Una vez cargado, puedes cambiar cualquier campo necesario (nombre, costos, precios, etc).",
    placement: "right",
    modalPosition: "bottom-right",
    requiredTab: 'producto'
  },
  {
    targetKey: "btn-guardar",
    title: "4. Modificar: Actualizar",
    icon: <Save className="w-6 h-6 text-green-600" />,
    content: "Finalmente, haz clic en 'Actualizar' para guardar los cambios realizados.",
    placement: "left",
    modalPosition: "top-left",
    requiredTab: 'producto'
  }
];

const GUIDE_FLOW_DELETE: GuideStepWithTab[] = [
  {
    targetKey: "btn-search-product",
    title: "1. Eliminar: Buscar",
    icon: <Search className="w-6 h-6 text-blue-500" />,
    content: "Busca el producto que deseas eliminar. Al darle a Siguiente abriremos el buscador.",
    placement: "left",
    modalPosition: "bottom-left",
    requiredTab: 'producto'
  },
  {
    targetKey: "btn-search-product",
    title: "2. Eliminar: Cargar",
    icon: <MousePointerClick className="w-6 h-6 text-blue-500" />,
    content: "Selecciona con DOBLE CLIC el producto en la lista para traer sus datos a la pantalla.",
    placement: "left",
    modalPosition: "bottom-left",
    requiredTab: 'producto'
  },
  {
    targetKey: "btn-delete",
    title: "3. Eliminar: Borrar",
    icon: <Trash2 className="w-6 h-6 text-red-600" />,
    content: "Presiona este botón rojo. El sistema pedirá confirmación antes de borrarlo permanentemente.",
    placement: "left",
    modalPosition: "top-left",
    requiredTab: 'producto'
  }
];

const GUIDE_FLOW_INSUMOS: GuideStepWithTab[] = [
  {
    targetKey: "btn-search-product",
    title: "1. Insumos: Producto Principal",
    icon: <ChefHat className="w-6 h-6 text-blue-500" />,
    content: "Primero, busca y carga (con doble clic) el producto terminado al cual quieres agregarle ingredientes.",
    placement: "left",
    modalPosition: "bottom-left",
    requiredTab: 'producto'
  },
  {
    targetKey: "tab-insumos",
    title: "2. Insumos: Pestaña",
    icon: <List className="w-6 h-6 text-blue-500" />,
    content: "Haz clic en la pestaña 'Insumos' para acceder al panel de recetas/componentes.",
    placement: "above",
    modalPosition: "bottom-right",
    requiredTab: 'producto'
  },
  {
    targetKey: "btn-search-insumo",
    title: "3. Insumos: Buscar Ingrediente",
    icon: <Search className="w-6 h-6 text-blue-500" />,
    content: "Usa este botón para buscar el producto que servirá como insumo (ej. el pan para una hamburguesa).",
    placement: "above",
    modalPosition: "bottom-right",
    requiredTab: 'insumos'
  },
  {
    targetKey: "insumos-inputs",
    title: "4. Insumos: Definir Cantidad",
    icon: <Scale className="w-6 h-6 text-green-600" />,
    content: "El sistema cargará el costo. Tú solo debes definir qué 'Cantidad' de este insumo se utiliza.",
    placement: "above",
    modalPosition: "top-right",
    requiredTab: 'insumos'
  },
  {
    targetKey: "btn-add-insumo",
    title: "5. Insumos: Agregar",
    icon: <Plus className="w-6 h-6 text-blue-600" />,
    content: "Haz clic en '+' para añadir este insumo a la lista. El costo del producto principal se recalculará.",
    placement: "left",
    modalPosition: "top-left",
    requiredTab: 'insumos'
  }
];

interface Clase {
  id: number;
  nombre: string;
  sucursalId: number;
  activo: number;
}

interface Marca {
  id: number;
  nombre: string;
  sucursalId: number;
  activo: number;
}

interface Modelo {
  id: number;
  nombre: string;
  sucursalId: number;
  activo: number;
}

interface ProductoForm {
  id?: number;
  codigo?: string;
  cod_barras?: string;
  cod_del_fabricante?: string;
  nombre?: string;
  stock_min?: number;
  costo?: number;
  cantidad_inicial?: number;
  idclase?: string;
  idmarca?: string;
  idmodelo?: string;
  unidad_medida?: string;
  tipo_medicamento?: string | null;
  impuesto?: string;
  servicio?: number;
  tipo_ieps?: string;
  cantidad_ieps?: number;
  imagen?: File;
  precio1?: number;
  precio2?: number;
  precio3?: number;
  precio4?: number;
  clave_prodserv?: string;
  clave_unidad_medida?: string;
  [key: string]: string | number | File | null | undefined;
}

const unidadesMedida = [
  'pieza',
  'kilogramo',
  'gramo',
  'litro',
  'mililitro',
  'metro',
  'centimetro',
  'caja',
];

const IVA_VALUES = ['16', '8', '0', 'EXENTA'] as const;
const IVA_LABELS: Record<(typeof IVA_VALUES)[number], string> = {
  '16': 'IVA 16%',
  '8': 'IVA 8%',
  '0': 'IVA 0%',
  EXENTA: 'Exenta',
};

const PRICE_FIELDS = [1, 2, 3, 4] as const;
const PRICE_LABELS: Record<(typeof PRICE_FIELDS)[number], string> = {
  1: 'Precio público',
  2: 'Precio con descuento',
  3: 'Precio semi mayoreo',
  4: 'Precio mayoreo',
};
type PriceFieldKey = `precio${(typeof PRICE_FIELDS)[number]}`;
const PRICE_FIELD_LABELS: Record<PriceFieldKey, string> = {
  precio1: PRICE_LABELS[1],
  precio2: PRICE_LABELS[2],
  precio3: PRICE_LABELS[3],
  precio4: PRICE_LABELS[4],
};
const PRICE_INPUT_BASE_CLASSES =
  'rounded-lg border border-border bg-white/90 px-3 py-3 text-base font-medium shadow-sm transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-slate-900 dark:placeholder:text-muted-foreground dark:focus-visible:ring-offset-slate-950';

const toCanonicalKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

const UNIDAD_MEDIDA_ALIASES: Record<string, string> = {
  pieza: 'pieza',
  piezas: 'pieza',
  pza: 'pieza',
  pzas: 'pieza',
  pz: 'pieza',
  kilogramo: 'kilogramo',
  kilogramos: 'kilogramo',
  kilo: 'kilogramo',
  kilos: 'kilogramo',
  kg: 'kilogramo',
  gramo: 'gramo',
  gramos: 'gramo',
  g: 'gramo',
  litro: 'litro',
  litros: 'litro',
  l: 'litro',
  mililitro: 'mililitro',
  mililitros: 'mililitro',
  ml: 'mililitro',
  metro: 'metro',
  metros: 'metro',
  m: 'metro',
  centimetro: 'centimetro',
  centimetros: 'centimetro',
  cm: 'centimetro',
  caja: 'caja',
  cajas: 'caja',
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

const numOrUndef = (x: unknown): number | undefined => {
  if (x === null || x === undefined) return undefined;
  if (typeof x === 'string') {
    const t = x.trim();
    if (t === '') return undefined;
    const n = Number(t.replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof x === 'number') return Number.isFinite(x) ? x : undefined;
  return undefined;
};

const intOrUndef = (x: unknown): number | undefined => {
  const n = numOrUndef(x);
  return n === undefined ? undefined : Math.floor(n);
};

const sanitizeFormNumbers = (f: any) => ({
  ...f,
  stock_min: intOrUndef(f.stock_min),
  costo: numOrUndef(f.costo),
  cantidad_inicial: intOrUndef(f.cantidad_inicial),
  precio1: numOrUndef(f.precio1),
  precio2: numOrUndef(f.precio2),
  precio3: numOrUndef(f.precio3),
  precio4: numOrUndef(f.precio4),
  cantidad_ieps: numOrUndef(f.cantidad_ieps),
});

const normalizeUnidadMedida = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const key = toCanonicalKey(trimmed);
  return UNIDAD_MEDIDA_ALIASES[key] ?? trimmed.toLowerCase();
};

const normalizeTipoIeps = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const key = toCanonicalKey(value.trim());
  if (key.startsWith('porc')) return 'porcentaje';
  if (key.startsWith('cant')) return 'cantidad';
  return '';
};

const normalizeImpuesto = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const maybeNumber = Number(raw);
  if (!Number.isNaN(maybeNumber)) {
    if (Math.abs(maybeNumber - 16) < 1e-6) return '16';
    if (Math.abs(maybeNumber - 8) < 1e-6) return '8';
    if (Math.abs(maybeNumber) < 1e-6) return '0';
    if (maybeNumber > 0 && maybeNumber < 1) {
      const pct = Math.round(maybeNumber * 100);
      if (pct === 16) return '16';
      if (pct === 8) return '8';
      if (pct === 0) return '0';
    }
  }

  const upper = raw.toUpperCase();
  const digits = upper.replace(/[^0-9]/g, '');
  if (digits === '16') return '16';
  if (digits === '8') return '8';
  if (digits === '0') return '0';
  if (upper.includes('EXENT')) return 'EXENTA';
  return upper;
};

const UNIDAD_MEDIDA_TO_API: Record<string, string> = {
  pieza: 'PIEZA',
  kilogramo: 'KILOGRAMO',
  gramo: 'GRAMO',
  litro: 'LITRO',
  mililitro: 'MILILITRO',
  metro: 'METRO',
  centimetro: 'CENTIMETRO',
  caja: 'CAJA',
};

const mapUnidadMedidaToApi = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  return UNIDAD_MEDIDA_TO_API[key] ?? trimmed.toUpperCase();
};

const mapTipoIepsToApi = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const key = toCanonicalKey(value);
  if (key.startsWith('porc')) return 'PORCENTAJE';
  if (key.startsWith('cant')) return 'CANTIDAD';
  return value;
};

const mapImpuestoToApi = (value: string | null | undefined): string | number | null => {
  if (!value) return null;
  if (value === '16') return '0.16';
  if (value === '8') return '0.08';
  if (value === '0') return '0';
  if (value === 'EXENTA') return 'EXENTO';
  return value;
};

const mapProductFromApi = (data: any): ProductoForm => {
  const base: ProductoForm = {
    id: data.id,
    codigo: data.codigo ?? '',
    cod_barras: data.cod_barras ?? '',
    cod_del_fabricante: data.cod_del_fabricante ?? '',
    nombre: data.nombre ?? '',
    stock_min: data.stock_min,
    costo: data.costo,
    cantidad_inicial: data.cantidad_existencia ?? data.cantidad_inicial,
    idclase: data.idclase ? String(data.idclase) : '',
    idmarca: data.idmarca ? String(data.idmarca) : '',
    idmodelo: data.idmodelo ? String(data.idmodelo) : '',
    unidad_medida: normalizeUnidadMedida(data.unidad_medida),
    tipo_medicamento: data.tipo_medicamento ?? '',
    impuesto: normalizeImpuesto(data.impuesto),
    servicio: Number(data.servicio) === 1 ? 1 : 0,
    tipo_ieps: normalizeTipoIeps(data.tipo_ieps),
    cantidad_ieps: data.cantidad_ieps,
    precio1: data.precio1,
    precio2: data.precio2,
    precio3: data.precio3,
    precio4: data.precio4,
  };

  return sanitizeFormNumbers(base);
};

const fetchSATUnidadByClave = async (apiUrl: string, clave: string, token?: string) => {
  if (!clave) return null;
  try {
    const res = await fetch(`${apiUrl}/facturacion/clave-unidad/${encodeURIComponent(clave)}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    const item = await res.json();
    return item
      ? {
        clave: String(item.clave),
        nombre: item.nombre ?? null,
        descripcion: item.descripcion ?? null,
      }
      : null;
  } catch {
    return null;
  }
};

const fetchSATProdServByClave = async (apiUrl: string, clave: string, token?: string) => {
  if (!clave) return null;
  try {
    const res = await fetch(`${apiUrl}/facturacion/clave-prodserv/${encodeURIComponent(clave)}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    const item = await res.json();
    return item ? { clave: String(item.clave), descripcion: item.descripcion ?? '' } : null;
  } catch {
    return null;
  }
};

const hydrateSatChipsIfNeeded = async (
  apiUrl: string,
  formLike: { clave_unidad_medida?: string | number; clave_prodserv?: string | number },
  setSelectedUnidadSAT: (v: any) => void,
  setSelectedProdServSAT: (v: any) => void
) => {
  const token = (typeof window !== 'undefined') ? localStorage.getItem('token') ?? undefined : undefined;

  const unidadClave = formLike?.clave_unidad_medida ? String(formLike.clave_unidad_medida) : '';
  const prodServClave = formLike?.clave_prodserv ? String(formLike.clave_prodserv) : '';

  if (unidadClave) {
    const u = await fetchSATUnidadByClave(apiUrl, unidadClave, token);
    setSelectedUnidadSAT(u ?? { clave: unidadClave, nombre: null, descripcion: null });
  } else {
    setSelectedUnidadSAT(null);
  }

  if (prodServClave) {
    const p = await fetchSATProdServByClave(apiUrl, prodServClave, token);
    setSelectedProdServSAT(p ?? { clave: prodServClave, descripcion: '' });
  } else {
    setSelectedProdServSAT(null);
  }
};

export default function CrearProducto() {
  const [form, setForm] = useState<ProductoForm>({});
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [errores, setErrores] = useState<{ [key: string]: boolean }>({});
  const [codigoDuplicado, setCodigoDuplicado] = useState(false);
  const [codBarrasDuplicado, setCodBarrasDuplicado] = useState(false);

  // === ESTADO PARA LA GUÍA INTERACTIVA MULTI-FLUJO ===
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentGuideMode, setCurrentGuideMode] = useState<'CREATE' | 'UPDATE' | 'DELETE' | 'INSUMOS'>('CREATE');
  const [currentSteps, setCurrentSteps] = useState<GuideStepWithTab[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);

  // Estado para controlar si el inventario está vacío (bloqueo)
  const [isInventoryEmpty, setIsInventoryEmpty] = useState(false);

  // === TABS STATE ===
  const [activeTab, setActiveTab] = useState<'producto' | 'insumos'>('producto');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('sucursalId') || '0', 10)
    : 0;

  // Iniciar una guía específica
  const startGuide = (mode: 'CREATE' | 'UPDATE' | 'DELETE' | 'INSUMOS') => {
    if (isInventoryEmpty && mode !== 'CREATE') {
        toast.warning("No hay productos registrados. Debes agregar un producto primero.");
        return;
    }

    setCurrentGuideMode(mode);
    let steps: GuideStepWithTab[] = [];
    
    switch(mode) {
        case 'CREATE': steps = GUIDE_FLOW_CREATE; break;
        case 'UPDATE': steps = GUIDE_FLOW_UPDATE; break;
        case 'DELETE': steps = GUIDE_FLOW_DELETE; break;
        case 'INSUMOS': steps = GUIDE_FLOW_INSUMOS; break;
    }

    setCurrentSteps(steps);
    setGuideActive(true);
    setCurrentStepIndex(0);
    setShowGuideMenu(false);
    
    if(steps[0].requiredTab && steps[0].requiredTab !== activeTab) {
      setActiveTab(steps[0].requiredTab);
    }
    
    setTimeout(() => triggerStep(0, steps), 100);
  };

  const closeGuide = () => {
    setGuideActive(false);
  };

  // --- 🔥 MAGIA: APERTURA AUTOMÁTICA DEL BUSCADOR AL AVANZAR EN LA GUÍA ---
  const handleNextStep = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextStep = currentSteps[nextIndex];
      
      // Auto-cambio de Pestaña
      if (nextStep.requiredTab && nextStep.requiredTab !== activeTab) {
        setActiveTab(nextStep.requiredTab);
      }
      
      // 🔥 Abrir buscador mágicamente en el paso 2 de UPDATE o DELETE
      if ((currentGuideMode === 'UPDATE' || currentGuideMode === 'DELETE') && nextIndex === 1) {
        setSearchOpen(true);
      }

      setCurrentStepIndex(nextIndex);
    } else {
      closeGuide();
      toast.success("¡Guía completada!");
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      const prevStep = currentSteps[prevIndex];
      
      if (prevStep.requiredTab && prevStep.requiredTab !== activeTab) {
        setActiveTab(prevStep.requiredTab);
      }

      // 🔥 Cerrar buscador si retrocedemos al paso 1 en UPDATE o DELETE
      if ((currentGuideMode === 'UPDATE' || currentGuideMode === 'DELETE') && prevIndex === 0) {
        setSearchOpen(false);
      }

      setCurrentStepIndex(prevIndex);
    }
  };

  const getNextGuideInfo = () => {
    if (currentGuideMode === 'CREATE') return { label: 'Modificar', mode: 'UPDATE' as const };
    if (currentGuideMode === 'UPDATE') return { label: 'Eliminar', mode: 'DELETE' as const };
    if (currentGuideMode === 'DELETE') return { label: 'Insumos', mode: 'INSUMOS' as const };
    return null;
  };

  const nextGuideInfo = getNextGuideInfo();

  const triggerStep = (index: number, steps: GuideStepWithTab[]) => {
  };

  const checkInventoryAndStart = async () => {
    try {
      const params = new URLSearchParams({
        pagina: "1",
        limite: "1", 
        sucursalId: sucursalIdSession.toString(),
      });

      const res = await axios.get(
        `${apiUrl}/producto/productosPaginacion?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data || {};
      const products = data.productos || []; 
      const hasProducts = products.length > 0;

      if (hasProducts) {
        setIsInventoryEmpty(false);
        const hasSeen = localStorage.getItem('hasSeenProductGuide_CREATE');
        if (!hasSeen) {
            startGuide('CREATE');
            localStorage.setItem('hasSeenProductGuide_CREATE', 'true');
        }
      } else {
        throw new Error("Lista vacía"); 
      }
      
    } catch (error) {
      console.warn("Inventario vacío o error, forzando modo Agregar:", error);
      setIsInventoryEmpty(true);
      startGuide('CREATE');
      toast.warning("No hay productos registrados. Comienza agregando uno.");
    }
  };

  useEffect(() => {
      const timer = setTimeout(() => {
        checkInventoryAndStart();
      }, 800); 
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const esServicio = form.servicio === 1;
  const [insumoNombre, setInsumoNombre] = useState('');
  const [insumoCosto, setInsumoCosto] = useState<number | null>(null);
  const [insumoPrecioPublico, setInsumoPrecioPublico] = useState<number | null>(null);
  const [insumoCantidad, setInsumoCantidad] = useState('');
  const [insumoId, setInsumoId] = useState<number | null>(null);
  const [insumos, setInsumos] = useState<{ id: number; nombre: string; costo: number; precio: number; cantidad: number }[]>([]);
  const [insumoSearchOpen, setInsumoSearchOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const [openUnidadSAT, setOpenUnidadSAT] = useState(false);
  const [openProdServSAT, setOpenProdServSAT] = useState(false);
  type SatUnidad = { id?: number; clave: string; descripcion: string; fecha_inicio_vigencia?: string | null; fecha_fin_vigencia?: string | null; nombre?: string | null; };
  type SatProdServ = { id?: number; clave: string; descripcion: string; fecha_inicio_vigencia?: string | null; fecha_fin_vigencia?: string | null; };

  const [selectedUnidadSAT, setSelectedUnidadSAT] = useState<SatUnidad | null>(null);
  const [selectedProdServSAT, setSelectedProdServSAT] = useState<SatProdServ | null>(null);

  const formRef = useRef<HTMLInputElement>(null);
  const handleEnter = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();

    if (tag === 'button' && target.id === 'btnGuardar') {
      e.preventDefault();
      (target as HTMLButtonElement).click();
      return;
    }
    e.preventDefault();
    const inputs = formRef.current?.querySelectorAll<HTMLElement>('input, select, textarea, button');
    if (!inputs) return;
    const elements = Array.from(inputs);
    const index = elements.indexOf(target);
    if (index >= 0) elements[index + 1]?.focus();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetImagenSelector = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setForm(prev => ({ ...prev, imagen: undefined }));
    setImagenPreview(null);
  };

  const fmtMoney = (n: number | null | undefined) =>
    typeof n === 'number' && Number.isFinite(n)
      ? n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
      : '$0.00';

  const sumQty = (arr: { cantidad: number }[]) =>
    arr.reduce((acc, x) => acc + Number(x.cantidad || 0), 0);

  const sumCost = (arr: { costo: number; cantidad: number }[]) =>
    arr.reduce((acc, x) => acc + Number(x.costo || 0) * Number(x.cantidad || 0), 0);

  const fetchInsumos = async (productoId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/insumos/productos/${productoId}/insumos`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setInsumos(
          Array.isArray(data)
            ? data.map((i: any) => ({
              id: Number(i.id),
              nombre: i.nombre,
              costo: i.costo,
              precio: i.precio1 ?? i.precio,
              cantidad: i.cantidad,
            }))
            : []
        );
      } else {
        setInsumos([]);
      }
    } catch (err) {
      console.error('Error al cargar insumos:', err);
      setInsumos([]);
    }
  };

  const parseResponse = async (res: Response) => {
    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    const text = await res.text();
    let data: any = null;
    if (isJson) {
      try { data = JSON.parse(text); } catch { }
    }
    return { isJson, text, data };
  };

  const handleAddInsumo = async () => {
    if (!form.id) {
      toast.error('Seleccione un producto antes de agregar insumos');
      return;
    }
    if (
      !insumoNombre ||
      insumoCosto === null ||
      insumoPrecioPublico === null ||
      insumoCantidad === '' ||
      insumoId === null
    ) {
      toast.error('Completa los datos del insumo');
      return;
    }

    const productoId = Number(form.id);
    const productoIdInsumo = Number(insumoId);
    const cantidad = Number(insumoCantidad);

    if (!Number.isFinite(cantidad) || cantidad < 0) {
      toast.error('Cantidad inválida, deben ser números positivos');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      if (editIndex !== null) {
        const res = await fetch(`${apiUrl}/insumos/productoInsumo`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productoId,
            productoIdInsumo,
            cantidad,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.message ?? 'Error al actualizar insumo');
          return;
        }

        setInsumos(prev => {
          const copia = [...prev];
          const row = copia[editIndex];
          if (row) {
            copia[editIndex] = {
              ...row,
              cantidad: Number(cantidad),
            };
          }
          return copia;
        });

        toast.success('Insumo actualizado');
      } else {
        const res = await fetch(`${apiUrl}/insumos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productoId,
            productoIdInsumo,
            cantidad,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.message ?? 'Error al agregar insumo');
          return;
        }

        setInsumos(prev => {
          const idx = prev.findIndex(i => Number(i.id) === productoIdInsumo);
          if (idx !== -1) {
            const copia = [...prev];
            const actual = copia[idx];
            copia[idx] = {
              ...actual,
              cantidad: Number(actual.cantidad ?? 0) + Number(cantidad),
            };
            return copia;
          }
          return [
            ...prev,
            {
              id: productoIdInsumo,
              nombre: insumoNombre,
              costo: Number(insumoCosto),
              precio: Number(insumoPrecioPublico),
              cantidad: Number(cantidad),
            },
          ];
        });

        toast.success('Insumo agregado');
      }

      setEditIndex(null);
      setInsumoNombre('');
      setInsumoCosto(null);
      setInsumoPrecioPublico(null);
      setInsumoCantidad('');
      setInsumoId(null);
    } catch (err) {
      console.error(err);
      toast.error('Error en operación de insumos');
    }
  };

  const handleEditInsumo = (index: number) => {
    const item = insumos[index];
    setInsumoNombre(item.nombre);
    setInsumoCosto(item.costo);
    setInsumoPrecioPublico(item.precio);
    setInsumoCantidad(String(item.cantidad));
    setInsumoId(item.id);
    setEditIndex(index);

  };

  const handleDeleteInsumo = async (index: number) => {
    if (!form.id) return;
    const token = localStorage.getItem('token');
    const item = insumos[index];

    try {
      const res = await fetch(`${apiUrl}/insumos/productoInsumo`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productoId: form.id,
          productoIdInsumo: item.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Error al eliminar insumo:', data);
        toast.error('Error al eliminar insumo');
        return;
      }

      setInsumos((prev) => prev.filter((_, i) => i !== index));

      toast.success('Insumo eliminado');
    } catch (err) {
      console.error('Error al eliminar insumo:', err);
      toast.error('Error al eliminar insumo');
    }
  };

  const fetchProductImage = async (productoId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/uploadsRoutes/product-image/${productoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const { isJson, text, data } = await parseResponse(res);
        if (isJson) {
          const url = data?.url || data?.imageUrl || data?.imagen;
          setImagenPreview(url || null);
        } else {
          setImagenPreview(text || null);
        }
      } else {
        setImagenPreview(null);
      }
    } catch (err) {
      console.error('Error al cargar imagen:', err);
      setImagenPreview(null);
    }
  };

  const applyProductToForm = (data: any, showToast = true) => {
    const mapped = mapProductFromApi(data);
    setForm(mapped);

    const claveUnidad = data.clave_unidad_medida ?? (mapped as any).clave_unidad_medida;
    const claveProdServ = data.clave_prodserv ?? (mapped as any).clave_prodserv;

    const hasUnidadMeta = data.unidad_sat_nombre || data.unidad_sat_descripcion;
    const hasProdServMeta = data.prodserv_sat_descripcion;

    if (claveUnidad && hasUnidadMeta) {
      setSelectedUnidadSAT({
        clave: String(claveUnidad),
        nombre: data.unidad_sat_nombre ?? null,
        descripcion: data.unidad_sat_descripcion ?? null,
      });
    }
    if (claveProdServ && hasProdServMeta) {
      setSelectedProdServSAT({
        clave: String(claveProdServ),
        descripcion: data.prodserv_sat_descripcion ?? '',
      });
    }

    if ((claveUnidad && !hasUnidadMeta) || (claveProdServ && !hasProdServMeta)) {
      void hydrateSatChipsIfNeeded(
        apiUrl!,
        { clave_unidad_medida: claveUnidad, clave_prodserv: claveProdServ },
        setSelectedUnidadSAT,
        setSelectedProdServSAT
      );
    } else if (!claveUnidad && !claveProdServ) {
      setSelectedUnidadSAT(null);
      setSelectedProdServSAT(null);
    }

    const productId = Number(mapped.id ?? data.id);
    if (Number.isFinite(productId) && productId > 0) {
      void fetchProductImage(productId);
      void fetchInsumos(productId);
    }

    if (showToast) toast.success('Producto cargado');
  };

  const DETAIL_FIELDS: Array<keyof ProductoForm | 'cantidad_ieps'> = [
    'unidad_medida',
    'impuesto',
    'tipo_ieps',
    'cantidad_ieps',
  ];

  const hydrateProductData = async (partial: any) => {
    const token = localStorage.getItem('token');
    const sucursalId = localStorage.getItem('sucursalId');
    const headers: HeadersInit = token
      ? {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      }
      : { Accept: 'application/json' };

    const codeCandidate = partial?.cod_barras || partial?.codigo;
    const productId = Number(partial?.id);
    const candidates: string[] = [];

    if (codeCandidate) {
      const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
      candidates.push(`${apiUrl}/producto/codigo/${codeCandidate}${query}`);
    }

    if (Number.isFinite(productId) && productId > 0) {
      const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
      candidates.push(`${apiUrl}/producto/productos/${productId}${query}`);
    }

    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) continue;
        const detailed = await res.json();
        applyProductToForm(detailed);
        return;
      } catch (err) {
        console.error('Error al cargar detalles del producto:', err);
      }
    }

    applyProductToForm(partial);
  };

  useEffect(() => {
    const sucursalId = localStorage.getItem('sucursalId');
    const token = localStorage.getItem('token');

    const fetchData = async () => {
      try {
        const [resClases, resMarcas, resModelos] = await Promise.all([
          fetch(`${apiUrl}/departamento?sucursalId=${sucursalId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/marca?sucursalId=${sucursalId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/modelo?sucursalId=${sucursalId}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const dataClases = await resClases.json();
        const dataMarcas = await resMarcas.json();
        const dataModelos = await resModelos.json();

        setClases(dataClases);
        setMarcas(dataMarcas);
        setModelos(dataModelos);
      } catch (err) {
        console.error('Error al cargar catálogos:', err);
      }
    };

    fetchData();
  }, []);
  
  const loadProductData = (data: any) => {
    if (!data) return;

    if (guideActive) {
      if (currentGuideMode === 'UPDATE' && currentStepIndex === 1) {
          setTimeout(() => handleNextStep(), 400); 
      }
      if (currentGuideMode === 'DELETE' && currentStepIndex === 1) {
          setTimeout(() => handleNextStep(), 400);
      }
      if (currentGuideMode === 'INSUMOS' && currentStepIndex === 0) {
          setTimeout(() => handleNextStep(), 400);
      }
    }

    const source = data ?? {};
    const needsHydration = DETAIL_FIELDS.some((field) => {
      if (!(field in source)) return true;
      const value = (source as Record<string, unknown>)[field as string];
      if (field === 'cantidad_ieps') {
        return value === undefined;
      }
      return value === undefined || value === null || value === '';
    });
    if (needsHydration) {
      void hydrateProductData(source);
      return;
    }
    applyProductToForm(source);
    setForm({
      id: data.id,
      codigo: data.codigo,
      cod_barras: data.cod_barras,
      cod_del_fabricante: data.cod_del_fabricante,
      nombre: data.nombre,
      stock_min: data.stock_min,
      costo: data.costo,
      cantidad_inicial: data.cantidad_existencia,
      idclase: data.idclase ? String(data.idclase) : '',
      idmarca: data.idmarca ? String(data.idmarca) : '',
      idmodelo: data.idmodelo ? String(data.idmodelo) : '',
      tipo_medicamento: data.tipo_medicamento ?? '',
      impuesto: data.impuesto,
      servicio: data.servicio,
      tipo_ieps: data.tipo_ieps,
      cantidad_ieps: data.cantidad_ieps,
      precio1: data.precio1,
      precio2: data.precio2,
      precio3: data.precio3,
      precio4: data.precio4,
      unidad_medida: data.unidad_medida ?? '',
      clave_unidad_medida: data.clave_unidad_medida ?? '',
      clave_prodserv: data.clave_prodserv ?? '',
    });
    fetchProductImage(Number(data.id));
    fetchInsumos(Number(data.id));
    toast.success('Producto cargado');
  };

  const uploadImageToS3 = async (file: File, productId: number, token: string) => {
    try {
      if (!ALLOWED_MIMES.includes(file.type)) {
        toast.error('Solo se permiten imágenes PNG, JPG/JPEG o WEBP');
        return null;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error('La imagen excede 10 MB');
        return null;
      }

      const presignRes = await fetch(`${apiUrl}/uploadsRoutes/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId,
          contentType: file.type,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        toast.error(err?.mensaje || 'No se pudo generar URL de carga');
        return null;
      }

      const { url, fields, key } = await presignRes.json();

      const s3Form = new FormData();
      Object.entries(fields || {}).forEach(([k, v]) => s3Form.append(k, String(v)));

      if (!('Content-Type' in (fields || {}))) {
        s3Form.append('Content-Type', file.type);
      }
      s3Form.append('file', file);

      const s3Res = await fetch(url, { method: 'POST', body: s3Form });
      if (!s3Res.ok) {
        const errTxt = await s3Res.text().catch(() => '');
        console.error('S3 upload error:', s3Res.status, errTxt);
        toast.error('Error al subir la imagen a S3');
        return null;
      }

      const confirmRes = await fetch(`${apiUrl}/uploadsRoutes/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, key }),
      });
      const confirmData = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok) {
        toast.error(confirmData?.mensaje || 'Error al confirmar la subida');
        return null;
      }

      toast.success('Imagen asociada correctamente.');
      return key as string;
    } catch (e) {
      console.error(e);
      toast.error('Error subiendo la imagen');
      return null;
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;

    if (type === 'file' && target.files) {
      const file = target.files[0];

      if (file) {
        if (!ALLOWED_MIMES.includes(file.type)) {
          toast.error('Solo se permiten imágenes PNG, JPG/JPEG o WEBP');
          target.value = '';
          return;
        }
        if (file.size > MAX_SIZE_BYTES) {
          toast.error('La imagen excede 10 MB');
          target.value = '';
          return;
        }

        setForm((prev) => ({ ...prev, imagen: file }));

        const reader = new FileReader();
        reader.onloadend = () => setImagenPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setForm((prev) => ({ ...prev, imagen: undefined }));
        setImagenPreview(null);
      }
      setErrores((prev) => ({ ...prev, [name]: false }));
      return;
    }

    const numericFields = new Set([
      'stock_min',
      'costo',
      'cantidad_inicial',
      'precio1', 'precio2', 'precio3', 'precio4',
      'cantidad_ieps',
    ]);

    if (numericFields.has(name)) {
      const parsed = numOrUndef(value);
      let v = parsed === undefined ? undefined : Math.max(0, parsed);

      if (v !== undefined && (name === 'stock_min' || name === 'cantidad_inicial')) {
        v = Math.floor(v);
      }
      if (name === 'costo') {
        setForm((prev) => {
          const isEdit = !!prev.id;
          const next: any = { ...prev, costo: v };

          if (isEdit) return next;

          if (v === undefined) {
            next.precio1 = undefined;
            next.precio2 = undefined;
            next.precio3 = undefined;
            next.precio4 = undefined;
            return next;
          }

          const isEmpty = (x: any) => x === undefined || x === null || x === '';

          const allEmpty =
            isEmpty(prev.precio1) &&
            isEmpty(prev.precio2) &&
            isEmpty(prev.precio3) &&
            isEmpty(prev.precio4);

          const allMirroringPrevCosto =
            prev.costo !== undefined &&
            prev.precio1 === prev.costo &&
            prev.precio2 === prev.costo &&
            prev.precio3 === prev.costo &&
            prev.precio4 === prev.costo;

          if (allEmpty || allMirroringPrevCosto) {
            next.precio1 = v;
            next.precio2 = v;
            next.precio3 = v;
            next.precio4 = v;
          }
          return next;
        });

        setErrores((prev) => ({
          ...prev,
          costo: false,
        }));
        return;
      } else {
        setForm((prev) => ({ ...prev, [name]: v }));
        setErrores((prev) => ({ ...prev, [name]: false }));
      }


      return;
    }

    setForm((prev) => ({ ...prev, [name]: type === 'number' ? numOrUndef(value) : value }));
    setErrores((prev) => ({ ...prev, [name]: false }));
  };

  const calcularUtilidadNumero = (precio?: number) => {
    if (!form.costo || !precio) return 0;
    const utilidad = ((precio - (form.costo as number)) / (form.costo as number)) * 100;
    return Math.round(utilidad * 100) / 100;
  };

  const buscarProducto = async () => {
    const sucursalId = localStorage.getItem('sucursalId');
    const token = localStorage.getItem('token');
    const codigo = form.cod_barras || form.codigo;

    if (!codigo) {
      toast.error('Ingresa un código o código de barras');
      return;
    }

    try {
      const res = await fetch(
        `${apiUrl}/producto/codigo/${codigo}?sucursalId=${sucursalId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        toast.error('Producto no encontrado');
        return;
      }

      const data = await res.json();

      const nextForm: ProductoForm = sanitizeFormNumbers({
        id: data.id,
        codigo: data.codigo ?? '',
        cod_barras: data.cod_barras ?? '',
        cod_del_fabricante: data.cod_del_fabricante ?? '',
        nombre: data.nombre ?? '',
        stock_min: data.stock_min,
        costo: data.costo,
        cantidad_inicial: data.cantidad_existencia,
        idclase: data.idclase ? String(data.idclase) : '',
        idmarca: data.idmarca ? String(data.idmarca) : '',
        idmodelo: data.idmodelo ? String(data.idmodelo) : '',
        unidad_medida: data.unidad_medida ?? '',
        impuesto: data.impuesto ?? '',
        servicio: data.servicio ?? 0,
        tipo_ieps: data.tipo_ieps ?? '',
        cantidad_ieps: data.cantidad_ieps,
        precio1: data.precio1,
        precio2: data.precio2,
        precio3: data.precio3,
        precio4: data.precio4,
        clave_unidad_medida: data.clave_unidad_medida ?? '',
        clave_prodserv: data.clave_prodserv ?? '',
      });
      setForm(nextForm);

      await hydrateSatChipsIfNeeded(
        apiUrl!,
        { clave_unidad_medida: nextForm.clave_unidad_medida, clave_prodserv: nextForm.clave_prodserv },
        setSelectedUnidadSAT,
        setSelectedProdServSAT
      );

      if (nextForm.clave_unidad_medida) {
        setSelectedUnidadSAT({
          clave: String(nextForm.clave_unidad_medida),
          nombre: data.unidad_sat_nombre ?? null,
          descripcion: data.unidad_sat_descripcion ?? null,
        });
      } else {
        setSelectedUnidadSAT(null);
      }
      if (nextForm.clave_prodserv) {
        setSelectedProdServSAT({
          clave: String(nextForm.clave_prodserv),
          descripcion: data.prodserv_sat_descripcion ?? '',
        });
      } else {
        setSelectedProdServSAT(null);
      }
      await fetchProductImage(Number(data.id));
      fetchInsumos(Number(data.id));
      toast.success('Producto cargado');
    } catch (err) {
      console.error('Error al buscar producto:', err);
      toast.error('Error al buscar el producto');
    }
  };

  const verificarDuplicado = async (
    valor: string,
    tipo: 'codigo' | 'cod_barras'
  ): Promise<boolean> => {
    const sucursalId = localStorage.getItem('sucursalId');
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams({
        sucursalId: sucursalId || '',
        activo: '1',
        [tipo]: valor,
      });
      const res = await fetch(
        `${apiUrl}/producto/productos?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const productos = Array.isArray(data)
          ? data
          : data.productos || [];
        const producto = productos.find((p: any) => p[tipo] === valor);
        if (
          producto &&
          Number(producto.activo) === 1 &&
          (!form.id || producto.id !== form.id)
        ) {
          if (tipo === 'codigo') {
            toast.error('Código ya existente en un producto');
            setCodigoDuplicado(true);
          } else {
            toast.error('Código de barras ya existente en un producto');
            setCodBarrasDuplicado(true);
          }
          return true;
        }
      }
    } catch (err) {
      console.error('Error al verificar producto:', err);
    }
    if (tipo === 'codigo') {
      setCodigoDuplicado(false);
    } else {
      setCodBarrasDuplicado(false);
    }
    return false;
  };

  const guardarProducto = async () => {
    const clean = sanitizeFormNumbers(form);

    const checks: Array<[string, number | undefined]> = [
      ['stock_min', clean.stock_min],
      ['costo', clean.costo],
      ['cantidad_inicial', clean.cantidad_inicial],
      ['precio1', clean.precio1],
      ['precio2', clean.precio2],
      ['precio3', clean.precio3],
      ['precio4', clean.precio4],
      ['cantidad_ieps', clean.cantidad_ieps],
    ];
    for (const [k, v] of checks) {
      if (typeof v === 'number' && v < 0) {
        toast.error(`El campo "${k.replace('_', ' ')}" no puede ser negativo`);
        return;
      }
    }
    const camposObligatorios = ['codigo', 'nombre', 'costo', 'precio1', 'precio2', 'precio3', 'precio4'];
    if (!esServicio) {
      camposObligatorios.push('cantidad_inicial');
    }
    const nuevosErrores: { [key: string]: boolean } = {};
    for (const campo of camposObligatorios) {
      const val = (clean as any)[campo];
      const isOk =
        (typeof val === 'number' && Number.isFinite(val)) ||
        (typeof val === 'string' && val.trim() !== '');
      if (!isOk) nuevosErrores[campo] = true;
    }
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      toast.error('Por favor completa los campos obligatorios');
      return;
    }
    const codigo = form.cod_barras || form.codigo;
    if (!codigo) {
      toast.error('Ingresa un código o código de barras');
      return;
    }
    setErrores({});

    if (!form.id) {
      if (form.codigo && await verificarDuplicado(form.codigo, 'codigo')) return;
      if (form.cod_barras && await verificarDuplicado(form.cod_barras, 'cod_barras')) return;
    }

    const sucursalId = localStorage.getItem('sucursalId');
    const token = localStorage.getItem('token');

    const calcularUtilidadNumeroInner = (precio?: number) =>
      clean.costo && precio ? ((precio - clean.costo) / clean.costo) * 100 : 0;

    const unidadMedidaApi = mapUnidadMedidaToApi(form.unidad_medida ?? null);
    const impuestoApi = mapImpuestoToApi(form.impuesto ?? null);
    const tipoIepsApi = mapTipoIepsToApi(form.tipo_ieps ?? null);
    const cantidadIepsValue = clean.cantidad_ieps ?? null;

    const sucursalIdStr = localStorage.getItem('sucursalId');
    const sucursalIdNum = sucursalIdStr ? Number(sucursalIdStr) : NaN;

    if (!Number.isFinite(sucursalIdNum) || sucursalIdNum <= 0) {
      toast.error('No hay sucursal seleccionada. Vuelve a iniciar sesión o selecciona una sucursal.');
      return;
    }
    const orNull = <T,>(v: T | undefined | null) => (v === undefined || v === '' ? null : v);

    const cantidadInicialValue = esServicio ? 0 : clean.cantidad_inicial;

    const body2: any = {
      cod_barras: form.cod_barras,
      codigo: form.codigo,
      cod_del_fabricante: form.cod_del_fabricante,
      nombre: form.nombre,
      costo: clean.costo,
      stock_min: clean.stock_min,
      idclase: form.idclase ? parseInt(String(form.idclase)) : null,
      idmarca: form.idmarca ? parseInt(String(form.idmarca)) : null,
      idmodelo: form.idmodelo ? parseInt(String(form.idmodelo)) : null,
      unidad_medida: orNull(form.unidad_medida),
      clave_unidad_medida: orNull(selectedUnidadSAT?.clave ?? (form as any).clave_unidad_medida),
      clave_prodserv: orNull(selectedProdServSAT?.clave ?? (form as any).clave_prodserv),
      activo: 1,
      servicio: form.servicio ?? 0,
      utilidad1: calcularUtilidadNumeroInner(clean.precio1),
      utilidad2: calcularUtilidadNumeroInner(clean.precio2),
      utilidad3: calcularUtilidadNumeroInner(clean.precio3),
      utilidad4: calcularUtilidadNumeroInner(clean.precio4),
      precio1: clean.precio1,
      precio2: clean.precio2,
      precio3: clean.precio3,
      precio4: clean.precio4,
      bascula: 0,
      cantidad_existencia: cantidadInicialValue ?? 0,
      impuesto: impuestoApi,
      insumo: 0,
      tipo_medicamento: form.tipo_medicamento || null,
      tipo_ieps: tipoIepsApi,
      cantidad_ieps: cantidadIepsValue,
      sucursalId: sucursalIdNum,
    };
    const costo = clean.costo ?? 0;
    const precioLabels = PRICE_FIELD_LABELS;

    (['precio1', 'precio2', 'precio3', 'precio4'] as const).forEach((k) => {
      if (typeof clean[k] === 'number' && typeof costo === 'number' && clean[k]! < costo) {
        toast.error(`${precioLabels[k]} es menor que el costo del producto. Provocaria una utilidad negativa`);
      }
    });

    const algunMenor = (['precio1', 'precio2', 'precio3', 'precio4'] as const)
      .some((k) => typeof clean[k] === 'number' && typeof costo === 'number' && clean[k]! < costo);

    if (algunMenor) {
      setErrores((prev) => ({
        ...prev,
        precio1: typeof clean.precio1 === 'number' && clean.precio1 < costo ? true : prev.precio1,
        precio2: typeof clean.precio2 === 'number' && clean.precio2 < costo ? true : prev.precio2,
        precio3: typeof clean.precio3 === 'number' && clean.precio3 < costo ? true : prev.precio3,
        precio4: typeof clean.precio4 === 'number' && clean.precio4 < costo ? true : prev.precio4,
      }));
      return;
    }

    try {
      let res: Response;
      if (form.id) {
        res = await fetch(`${apiUrl}/producto/productos/${form.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body2),
        });
      } else {
        body2.cantidad_inicial = cantidadInicialValue ?? 0;
        res = await fetch(`${apiUrl}/producto/productos/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body2),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        console.error('Error al guardar:', data);
        toast.error('Error al guardar el producto');
        return;
      }

      // === NUEVO: DESBLOQUEO AUTOMÁTICO ===
      setIsInventoryEmpty(false);

      const productId = form.id ?? data?.id;
      if (!productId) {
        toast.success(form.id ? 'Producto actualizado' : 'Producto creado');
        setForm({});
        setImagenPreview(null);
        setSelectedUnidadSAT(null);
        setSelectedProdServSAT(null);
        return;
      }

      let uploadedKey: string | null = null;
      if (form.imagen instanceof File) {
        uploadedKey = await uploadImageToS3(form.imagen as File, productId, token || '');
      }

      if (uploadedKey) {
        toast.success(form.id ? 'Producto e imagen actualizados.' : 'Producto creado e imagen cargada.');
      } else if (form.imagen) {
        toast.message('Producto guardado. La imagen no se subió.');
      } else {
        toast.success(form.id ? 'Producto actualizado.' : 'Producto creado.');
      }

      setForm({});
      setImagenPreview(null);
      resetImagenSelector();
      setSelectedUnidadSAT(null);
      setSelectedProdServSAT(null);
    } catch (err) {
      console.error('Error al guardar producto:', err);
      toast.error('Error de conexión al guardar producto');
    }
  };

  const eliminarProducto = async () => {
    if (!form.id) {
      toast.error('Busca un producto antes de eliminar ');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${apiUrl}/producto/productos/${form.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        toast.success('Producto eliminado');
        setForm({});
        setInsumos([]);
        resetImagenSelector();
        setSelectedUnidadSAT(null);
        setSelectedProdServSAT(null);
      } else {
        const data = await res.json();
        console.error('Error al eliminar:', data);
        toast.error('Error al eliminar el producto');
      }
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      toast.error('Error de conexión al eliminar');
    }
  };

  const INTEGER_FIELDS = new Set(['stock_min', 'cantidad_inicial']);

  const onKeyDownNumber = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const k = e.key;
    if (k === '-' || k === '+' || k === 'e' || k === 'E') e.preventDefault();
  };
  const onKeyDownInt = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const k = e.key;
    if (k === '-' || k === '+' || k === 'e' || k === 'E' || k === '.' || k === ',') e.preventDefault();
  };

  const onWheelBlur = (e: React.WheelEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).blur();
  };

  const onPasteNonNegative = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    const name = input.name;
    const raw = e.clipboardData.getData('text');

    let cleaned = raw;
    if (INTEGER_FIELDS.has(name)) {
      cleaned = raw.replace(/[^\d]/g, '');
    } else {
      cleaned = raw.replace(/[+-]/g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    }

    if (cleaned !== raw) {
      e.preventDefault();
      input.value = cleaned;
      const parsed = numOrUndef(cleaned);
      let v = parsed === undefined ? undefined : Math.max(0, parsed);
      if (v !== undefined && INTEGER_FIELDS.has(name)) v = Math.floor(v);
      setForm(prev => ({ ...prev, [name]: v as any }));
    }
  };

  return (
    <div ref={formRef} onKeyDown={handleEnter} className="p-6 space-y-6 relative">
      <h2 className="text-2xl font-bold">Crear Producto/Servicio</h2>
      
      {/* --- GUÍA INTERACTIVA: Flechas y Modal --- */}
      {guideActive && currentSteps.length > 0 && (
        <>
          {!searchOpen && !insumoSearchOpen && (
              <GuideArrowOverlay 
                activeKey={currentSteps[currentStepIndex].targetKey}
                placement={currentSteps[currentStepIndex].placement} 
              />
          )}
          
          <GuideModal 
            isOpen={guideActive}
            step={currentSteps[currentStepIndex]}
            currentStepIndex={currentStepIndex}
            totalSteps={currentSteps.length}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onClose={closeGuide}
            nextGuideLabel={nextGuideInfo?.label}
            onStartNextGuide={nextGuideInfo ? () => startGuide(nextGuideInfo.mode) : undefined}
            nextBtnClassName="bg-orange-400 hover:bg-orange-500 text-white border-orange-500"
          />
        </>
      )}

      <div className="flex gap-2 mt-2 mb-4">
        {/* BOTÓN CON MENÚ DESPLEGABLE PARA GUÍAS */}
        <div className="relative inline-block text-left">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowGuideMenu(!showGuideMenu)}
            className="flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Guía Interactiva
            <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
          </Button>
          
          {showGuideMenu && (
            <div className="absolute left-0 mt-2 w-56 rounded-md shadow-xl bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="py-1">
                <button
                  onClick={() => startGuide('CREATE')}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Agregar Producto</span>
                </button>
                
                {/* OPCIONES BLOQUEADAS SI EL INVENTARIO ESTÁ VACÍO */}
                <button
                  onClick={() => !isInventoryEmpty && startGuide('UPDATE')}
                  disabled={isInventoryEmpty}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${
                    isInventoryEmpty 
                        ? 'text-gray-400 cursor-not-allowed opacity-50' 
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {isInventoryEmpty ? <Lock className="w-4 h-4" /> : <Pencil className="w-4 h-4 text-amber-500" />}
                  <span>Modificar Producto</span>
                </button>
                
                <button
                  onClick={() => !isInventoryEmpty && startGuide('DELETE')}
                  disabled={isInventoryEmpty}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${
                    isInventoryEmpty 
                        ? 'text-gray-400 cursor-not-allowed opacity-50' 
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {isInventoryEmpty ? <Lock className="w-4 h-4" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                  <span>Eliminar Producto</span>
                </button>
                
                <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>

                <button
                  onClick={() => !isInventoryEmpty && startGuide('INSUMOS')}
                  disabled={isInventoryEmpty}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${
                    isInventoryEmpty 
                        ? 'text-gray-400 cursor-not-allowed opacity-50' 
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {isInventoryEmpty ? <Lock className="w-4 h-4" /> : <ChefHat className="w-4 h-4 text-purple-600" />}
                  <span>Agregar Insumos</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.open('https://www.youtube.com/watch?v=gReIjNjN5Is&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=8', '_blank')}
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          Tutorial Rápido
        </Button>
      </div>

      <div className="flex justify-end">
        {activeTab === 'producto' && (
          <Button 
            type="button" 
            onClick={() => {
                if (isInventoryEmpty) {
                    toast.warning("No hay productos registrados. Comienza agregando uno.", {
                         icon: <AlertCircle className="w-5 h-5 text-red-500" />
                    });
                    return;
                }
                setSearchOpen(true);
            }}
            className={isInventoryEmpty ? "opacity-50 cursor-not-allowed" : ""}
            data-guide="btn-search-product" 
          >
            <Search className="w-4 h-4 mr-1" /> Buscar Producto/Servicio
          </Button>
        )}
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'producto' | 'insumos')} className="space-y-6">
        <TabsList>
          <TabsTrigger value="producto">Producto/Servicio</TabsTrigger>
          <TabsTrigger value="insumos" data-guide="tab-insumos">Insumos</TabsTrigger>
        </TabsList>
        <TabsContent value="producto">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 ">Código:*</label>
                <Input
                  data-guide="codigo" 
                  name="codigo"
                  value={form.codigo || ''}
                  onChange={handleChange}
                  className={errores.codigo ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Código de barras</label>
                <div className="flex gap-2">
                  <Input
                    name="cod_barras"
                    value={form.cod_barras || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Código del fabricante</label>
                <Input name="cod_del_fabricante" value={form.cod_del_fabricante || ''} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del producto/servicio:*</label>
                <Input 
                  data-guide="nombre" 
                  name="nombre" 
                  value={form.nombre || ''} 
                  onChange={handleChange}
                  className={errores.nombre ? 'border-red-500 focus-visible:ring-red-500' : ''} 
                />
              </div>
              
              <div className="space-y-4" data-guide="costos-inventario">
                <div>
                  <label className="block text-sm font-medium mb-1">Inventario mínimo</label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="numeric"
                    name="stock_min"
                    value={form.stock_min ?? ''}
                    onChange={handleChange}
                    onKeyDown={onKeyDownInt}
                    onWheel={onWheelBlur}
                    onPaste={onPasteNonNegative}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Costo:*</label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    name="costo"
                    value={form.costo ?? ''}
                    onChange={handleChange}
                    onKeyDown={onKeyDownNumber}
                    onWheel={onWheelBlur}
                    onPaste={onPasteNonNegative}
                    className={errores.costo ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Inventario inicial{esServicio ? '' : ':*'}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="numeric"
                    name="cantidad_inicial"
                    value={form.cantidad_inicial ?? ''}
                    onChange={handleChange}
                    onKeyDown={onKeyDownInt}
                    onWheel={onWheelBlur}
                    onPaste={onPasteNonNegative}
                    required={!esServicio}
                    className={!esServicio && errores.cantidad_inicial ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-4" data-guide="clasificacion">
                  <div>
                    <label className="block text-sm font-medium mb-1">Departamento</label>
                    <select
                      name="idclase"
                      value={form.idclase || 0}
                      onChange={handleChange}
                      className="w-full border px-2 py-2 rounded"
                    >
                      <option value="">Seleccione Departamento</option>
                      {clases.map((cl) => (
                        <option key={cl.id} value={cl.id}>{cl.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Marca</label>
                    <select
                      name="idmarca"
                      value={form.idmarca || 0}
                      onChange={handleChange}
                      className="w-full border px-2 py-2 rounded"
                    >
                      <option value="">Seleccione Marca</option>
                      {marcas.map((m) => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Modelo</label>
                    <select
                      name="idmodelo"
                      value={form.idmodelo || 0}
                      onChange={handleChange}
                      className="w-full border px-2 py-2 rounded"
                    >
                      <option value="">Seleccione Modelo</option>
                      {modelos.map((mo) => (
                        <option key={mo.id} value={mo.id}>{mo.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex flex-col items-center" data-guide="imagen-upload">
                  <label className="block text-sm font-medium mb-1">Imagen del producto/servicio</label>
                  <div className="w-[150px] h-[150px] border rounded flex items-center justify-center overflow-hidden">
                    {imagenPreview && (
                      <Image
                        src={imagenPreview}
                        alt="Imagen"
                        width={150}
                        height={150}
                        className="object-cover"
                      />
                    )}
                  </div>
                  <Input
                    type="file"
                    name="imagen"
                    accept="image/*"
                    onChange={handleChange}
                    onClick={(e) => {
                      (e.currentTarget as HTMLInputElement).value = '';
                    }}
                    className="mt-2"
                    ref={fileInputRef}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unidad de medida</label>
                  <select
                    name="unidad_medida"
                    value={form.unidad_medida || ''}
                    onChange={handleChange}
                    className="w-full border px-2 py-2 rounded"
                  >
                    <option value="">Seleccione unidad</option>
                    {unidadesMedida.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    {form.unidad_medida &&
                      !unidadesMedida.includes(form.unidad_medida) && (
                        <option value={form.unidad_medida}>{form.unidad_medida}</option>
                      )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de medicamento</label>
                  <select
                    name="tipo_medicamento"
                    value={form.tipo_medicamento || ''}
                    onChange={handleChange}
                    className="w-full border px-2 py-2 rounded"
                  >
                    <option value="">Sin tipo</option>
                    <option value="ANTIBIOTICO">Antibiótico</option>
                    <option value="CONTROLADO">Controlado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-guide="sat-block">
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Clave Unidad (SAT)</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10"
                      onClick={() => setOpenUnidadSAT(true)}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Buscar clave unidad
                    </Button>
                  </div>
                  <div className="min-h-6 mt-1">
                    {selectedUnidadSAT ? (
                      <span className="inline-flex items-center gap-2 text-sm border rounded-full px-3 py-1">
                        <span className="font-semibold">{selectedUnidadSAT.clave}</span>
                        <span className="text-gray-600">{selectedUnidadSAT?.nombre ?? '—'}</span>
                        <button
                          className="text-gray-500 hover:text-red-500"
                          onClick={() => setSelectedUnidadSAT(null)}
                          title="Quitar selección"
                        >
                          ×
                        </button>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Sin selección SAT</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium">Clave Producto/Servicio (SAT)</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10"
                      onClick={() => setOpenProdServSAT(true)}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Buscar clave prod/serv
                    </Button>
                  </div>
                  <div className="min-h-6 mt-1">
                    {selectedProdServSAT ? (
                      <span className="inline-flex items-center gap-2 text-sm border rounded-full px-3 py-1">
                        <span className="font-semibold">{selectedProdServSAT.clave}</span>
                        <span className="text-gray-600">{selectedProdServSAT.descripcion}</span>
                        <button
                          className="text-gray-500 hover:text-red-500"
                          onClick={() => setSelectedProdServSAT(null)}
                          title="Quitar selección"
                        >
                          ×
                        </button>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Sin selección SAT</span>
                    )}
                  </div>
                </div>
              </div>

              <div data-guide="impuestos">
                <label className="block text-sm font-medium mb-1">Tipo de IVA</label>
                <select
                  name="impuesto"
                  value={form.impuesto || ''}
                  onChange={handleChange}
                  className="w-full border px-2 py-2 rounded"
                >
                  <option value="">Seleccione IVA</option>
                  {IVA_VALUES.map((value) => (
                    <option key={value} value={value}>{IVA_LABELS[value]}</option>
                  ))}
                  {form.impuesto &&
                    !IVA_VALUES.includes(form.impuesto as (typeof IVA_VALUES)[number]) && (
                      <option value={form.impuesto}>{form.impuesto}</option>
                    )}
                </select>
              
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    name="servicio"
                    checked={form.servicio === 1}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm({ ...form, servicio: checked ? 1 : 0 });
                      setErrores((prev) => {
                        if (checked && prev.cantidad_inicial) {
                          const { cantidad_inicial, ...rest } = prev;
                          return rest;
                        }
                        return prev;
                      });
                    }}
                  />
                  Es servicio
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end mt-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo de IEPS</label>
                    <select
                      name="tipo_ieps"
                      value={form.tipo_ieps || ''}
                      onChange={handleChange}
                      className="w-full border px-2 py-2 rounded"
                    >
                      <option value="">Seleccione tipo</option>
                      <option value="porcentaje">Porcentaje</option>
                      <option value="cantidad">Cantidad</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cantidad de IEPS</label>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      inputMode="decimal"
                      name="cantidad_ieps"
                      value={form.cantidad_ieps ?? ''}
                      onChange={handleChange}
                      onKeyDown={onKeyDownNumber}
                      onWheel={onWheelBlur}
                      onPaste={onPasteNonNegative}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div 
            className="mt-10 space-y-6 rounded-xl border border-border bg-white/5 p-6 shadow-sm dark:bg-slate-900/30"
            data-guide="precios-section"
          >
            <div>
              <h3 className="text-lg font-semibold">Precios y utilidades</h3>
              <p className="text-sm text-muted-foreground">
                Ajusta los precios de venta y visualiza la utilidad estimada para cada nivel.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {PRICE_FIELDS.map((n) => {
                const fieldKey = `precio${n}` as const;
                const hasError = Boolean(errores[fieldKey]);
                const label = PRICE_LABELS[n];
                return (
                  <div key={n} className="space-y-3">
                    <label htmlFor={`precio${n}`} className="text-sm font-medium text-foreground opacity-90">
                      {label}
                    </label>
                    <Input
                      id={`precio${n}`}
                      type="number"
                      min={0}
                      step="1"
                      inputMode="decimal"
                      name={fieldKey}
                      value={(form[fieldKey] as number | string) ?? ''}
                      placeholder={label}
                      onChange={handleChange}
                      onKeyDown={onKeyDownNumber}
                      onWheel={onWheelBlur}
                      onPaste={onPasteNonNegative}
                      className={cn(
                        PRICE_INPUT_BASE_CLASSES,
                        hasError
                          ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500'
                          : 'focus-visible:border-orange-500 focus-visible:ring-orange-500'
                      )}
                    />
                    <p className="text-xs font-medium text-muted-foreground">
                      Utilidad:{' '}
                      {typeof form[fieldKey] === 'string' || typeof form[fieldKey] === 'number'
                        ? `${calcularUtilidadNumero(Number(form[fieldKey])).toFixed(2)}%`
                        : 'N/A'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button id="btnGuardar" onClick={guardarProducto} data-guide="btn-guardar">
              <Save className="w-4 h-4 mr-2" />
              {form.id ? 'Actualizar' : 'Guardar'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={eliminarProducto}
              data-guide="btn-delete"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setForm({});
                setInsumos([]);
                resetImagenSelector();
                setErrores({});
                setSelectedUnidadSAT(null);
                setSelectedProdServSAT(null);
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="insumos">
          <div className="space-y-5">
            <div className="rounded-xl border bg-white/5 p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">Producto/Servicio seleccionado</div>
                  <div className="text-lg font-semibold">
                    {form.nombre ? form.nombre : '— Selecciona un producto/servicio —'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-gray-500"># Insumos</div>
                    <div className="text-xl font-semibold">{insumos.length}</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-gray-500">Cantidad total</div>
                    <div className="text-xl font-semibold">{sumQty(insumos)}</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-gray-500">Costo total aprox.</div>
                    <div className="text-xl font-semibold">{fmtMoney(sumCost(insumos))}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-4 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch">
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    onClick={() => {
                        if (isInventoryEmpty) {
                             toast.warning("No hay productos registrados. Agrega uno primero.");
                             return;
                        }
                        setInsumoSearchOpen(true)
                    }} 
                    className={`whitespace-nowrap ${isInventoryEmpty ? 'opacity-50 cursor-not-allowed' : ''}`}
                    data-guide="btn-search-insumo"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Buscar insumo
                  </Button>
                  <div className="flex items-center">
                    {insumoNombre ? (
                      <div className="px-3 py-1 rounded-full border text-sm bg-white/5 flex items-center gap-2">
                        <span className="font-medium">{insumoNombre}</span>
                        <button
                          type="button"
                          className="text-gray-500 hover:text-red-500"
                          onClick={() => {
                            setInsumoNombre('');
                            setInsumoCosto(null);
                            setInsumoPrecioPublico(null);
                            setInsumoCantidad('');
                            setInsumoId(null);
                            setEditIndex(null);
                          }}
                          title="Quitar insumo seleccionado"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Sin insumo seleccionado</div>
                    )}
                  </div>
                </div>

                <div 
                  className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3"
                  data-guide="insumos-inputs"
                >
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Costo</div>
                    <div className="h-10 flex items-center px-3 rounded-md border bg-white/50">
                      {fmtMoney(insumoCosto ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Precio público</div>
                    <div className="h-10 flex items-center px-3 rounded-md border bg-white/50">
                      {fmtMoney(insumoPrecioPublico ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Cantidad</div>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      inputMode="decimal"
                      placeholder="0"
                      value={insumoCantidad}
                      onChange={(e) => setInsumoCantidad(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddInsumo(); }}
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleAddInsumo}
                    disabled={
                      !form.id ||
                      !insumoId ||
                      insumoCantidad === '' ||
                      Number.isNaN(Number(insumoCantidad)) ||
                      Number(insumoCantidad) < 0
                    }
                    className="w-full sm:w-auto"
                    title={form.id ? '' : 'Selecciona un producto primero'}
                    data-guide="btn-add-insumo"
                  >
                    {editIndex !== null ? (
                      <>
                        <Pencil className="w-4 h-4 mr-2" />
                        Actualizar
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-500 mt-3">
                Tip: puedes escribir la cantidad y presionar <span className="font-semibold">Enter</span> para guardar rápido.
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr className="text-xs uppercase tracking-wide text-gray-500">
                    <th className="p-3">Insumo</th>
                    <th className="p-3 text-right">Costo</th>
                    <th className="p-3 text-right">Precio público</th>
                    <th className="p-3 text-right">Cantidad</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {insumos.length > 0 ? (
                    insumos.map((insumo, index) => {
                      const subtotal = Number(insumo.costo || 0) * Number(insumo.cantidad || 0);
                      return (
                        <tr key={`${insumo.id}-${index}`} className="hover:bg-gray-50/60">
                          <td className="p-3">
                            <div className="font-medium">{insumo.nombre}</div>
                            <div className="text-xs text-gray-500">ID: {insumo.id}</div>
                          </td>
                          <td className="p-3 text-right">{fmtMoney(insumo.costo)}</td>
                          <td className="p-3 text-right">{fmtMoney(insumo.precio)}</td>
                          <td className="p-3 text-right">{insumo.cantidad}</td>
                          <td className="p-3 text-right font-medium">{fmtMoney(subtotal)}</td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditInsumo(index)}
                                title="Editar cantidad"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteInsumo(index)}
                                title="Eliminar insumo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-sm text-gray-500">
                        No hay insumos agregados
                      </td>
                    </tr>
                  )}
                </tbody>

                {insumos.length > 0 && (
                  <tfoot className="bg-gray-50/70">
                    <tr>
                      <td className="p-3 font-semibold">Totales</td>
                      <td className="p-3" />
                      <td className="p-3" />
                      <td className="p-3 text-right font-semibold">{sumQty(insumos)}</td>
                      <td className="p-3 text-right font-semibold">{fmtMoney(sumCost(insumos))}</td>
                      <td className="p-3" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </TabsContent>

      </Tabs>
      <ProductSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={loadProductData}
      />
      {/* Clave Unidad (SAT) */}
      <CatalogoSATDialog
        open={openUnidadSAT}
        onOpenChange={setOpenUnidadSAT}
        title="Clave Unidad (SAT)"
        description="Busca y selecciona la clave SAT para la clave unidad de medida."
        endpoint={`${apiUrl}/facturacion/clave-unidad`}
        showNombre
        onSelect={(item) => {
          setSelectedUnidadSAT({ clave: item.clave, nombre: item.nombre ?? null, descripcion: item.descripcion });
          setForm(prev => ({ ...prev, clave_unidad_medida: item.clave }));
          toast.success(`Seleccionada: ${item.clave} — ${item.nombre ?? 'sin nombre'}`);
        }}
      />

      {/* Clave Producto/Servicio (SAT) */}
      <CatalogoSATDialog
        open={openProdServSAT}
        onOpenChange={setOpenProdServSAT}
        title="Clave Producto/Servicio (SAT)"
        description="Busca y selecciona la clave SAT del producto o servicio."
        endpoint={`${apiUrl}/facturacion/clave-prodserv`}
        showSimilarWords
        onSelect={(item) => {
          setSelectedProdServSAT(item);
          setForm(prev => ({ ...prev, clave_prodserv: item.clave as any }));
          toast.success(`Seleccionada: ${item.clave} — ${item.descripcion}`);
        }}
      />

      <ProductSearchDialog
        open={insumoSearchOpen}
        onOpenChange={setInsumoSearchOpen}
        onSelect={(p: any) => {
          setInsumoNombre(p.nombre);
          setInsumoCosto(p.costo);
          setInsumoPrecioPublico(p.precio1);
          setInsumoId(p.id);
        }}
      />
    </div>
  );
}