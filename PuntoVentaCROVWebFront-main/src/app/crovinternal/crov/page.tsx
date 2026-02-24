'use client';

import {
  type ChangeEvent,
  type SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios, { type AxiosError } from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { normalizeUnicodeText } from '@/lib/text';
import { getInternalAuthHeaders } from '@/lib/internalAuth';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import SimplePieChart from '@/components/SimplePieChart';
import SimpleBarChart from '@/components/SimpleBarChart';
import { ChevronDown, Minus, ChevronUp } from 'lucide-react';
import DialogAddOrEditSavings from '@/components/DialogAddOrEditSavings';
import DialogRetirarAhorro from '@/components/DialogRetirarAhorro';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarClock,
  Eye,
  Loader2,
  MailCheck,
  MapPin,
  Pencil,
  PieChart,
  PlusCircle,
  RefreshCw,
  Rewind,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  FastForward,
  Building2,
  Image as ImageIcon,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { removeAccents } from "@/lib/text";
import { catalogoColoresPerfil } from "@/lib/avatar";
import AvatarEmpleado from '@/components/crovinternal/AvatarEmpleado';

const WhatsAppIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M20.52 3.48A11.73 11.73 0 0 0 12 0a11.94 11.94 0 0 0-10.4 17.63L0 24l6.55-1.72A11.94 11.94 0 0 0 12 24h.01A11.99 11.99 0 0 0 24 12a11.73 11.73 0 0 0-3.48-8.52Zm-8.5 18.32h-.01a9.44 9.44 0 0 1-4.79-1.31l-.34-.2-3.89 1.02 1.04-3.79-.22-.39A9.44 9.44 0 1 1 12 21.8Zm5.25-7.15c-.29-.15-1.71-.84-1.98-.94s-.46-.15-.65.15-.75.94-.92 1.14-.34.22-.63.07a7.55 7.55 0 0 1-2.22-1.37 8.31 8.31 0 0 1-1.54-1.91c-.16-.29 0-.45.12-.6.12-.12.29-.34.43-.51a2 2 0 0 0 .29-.49.55.55 0 0 0-.03-.52c-.07-.15-.64-1.55-.88-2.13s-.47-.49-.65-.5h-.55a1.06 1.06 0 0 0-.76.35 3.21 3.21 0 0 0-1 2.38 5.55 5.55 0 0 0 1.17 2.94 12.64 12.64 0 0 0 4.82 4.39 16.36 16.36 0 0 0 1.6.59 3.86 3.86 0 0 0 1.78.11 2.91 2.91 0 0 0 1.91-1.35 2.36 2.36 0 0 0 .16-1.35c-.07-.16-.26-.22-.55-.37Z" />
  </svg>
);

type TipoSistema =
  | 'PUNTO_DE_VENTA_CROV'
  | 'CROV_RESTAURANTE'
  | 'CROV_HOTEL'
  | 'CROV_SPA'
  | 'CROV_INMOBILIARIA';

interface GiroComercial {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo?: number | boolean | null;
}

type GiroComercialRelation = {
  id?: number | string | null;
  nombre?: string | null;
  descripcion?: string | null;
} | null;

interface SistemaCrov {
  id: number;
  nombre: string;
  activo?: number | boolean | null;
  fecha_registro?: string | null;
}

interface SistemaCrovForm {
  nombre: string;
  activo: boolean;
}

const defaultSistemaForm: SistemaCrovForm = {
  nombre: '',
  activo: true,
};

// se usa en el apartado de /crovinternal/catalogos crov/ historial de ahorros
interface AhorroEmpleado {
  id: number,
  fecha: string,
  empleado: {
    id: number,
    nombre_completo: string,
  },
  monto: number,
  retiro: boolean,
};

// se usa en el apartado de /crovinternal/catalogos crov/mi ahorro
interface MiAhorroItem {
  id: number;
  monto: number;
  fecha: string;
  retiro: boolean;
}

interface HistorialMiAhorroResponse {
  ahorros: MiAhorroItem[]; 
  totalAhorro: number | null; 
}

interface ClienteCROV {
  id: number;
  nombre_cliente: string;
  nombre_negocio: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  tipo_sistema: TipoSistema;
  fecha_instalacion: string | null;
  fecha_fin_soporte: string | null;
  latitud?: number | string | null;
  longitud?: number | string | null;
  id_giro_comercial?: number | null;
  giro_comercial_id?: number | null;
  giro?: GiroComercialRelation;
  giro_comercial?: GiroComercialRelation;
  giro_comercial_nombre?: string | null;
  giro_comercial_descripcion?: string | null;
  logo?: string | null;
}

interface ClienteForm {
  nombre_cliente: string;
  nombre_negocio: string;
  direccion: string;
  telefono: string;
  correo: string;
  tipo_sistema: TipoSistema;
  fecha_instalacion: string;
  fecha_fin_soporte: string;
  id_giro_comercial: string;
  latitud: string;
  longitud: string;
}

const defaultForm: ClienteForm = {
  nombre_cliente: '',
  nombre_negocio: '',
  direccion: '',
  telefono: '',
  correo: '',
  tipo_sistema: 'PUNTO_DE_VENTA_CROV',
  fecha_instalacion: '',
  fecha_fin_soporte: '',
  id_giro_comercial: '',
  latitud: '',
  longitud: '',
};

interface GiroComercialForm {
  nombre: string;
}

const defaultGiroForm: GiroComercialForm = {
  nombre: '',
};

type ProspectoInteres =
  | 'PUNTO_DE_VENTA_CROV'
  | 'CROV_RESTAURANTE'
  | 'PUNTO_DE_VENTA_WEB';

interface ProspectoCROV {
  id: number;
  nombre: string;
  telefono: string;
  correo: string | null;
  interes: ProspectoInteres | null;
  id_cliente_crov: number | null;
  nombre_negocio: string | null;
  direccion_negocio: string | null;
  ultima_notificacion: string | null;
  fecha_creacion: string | null;
}

interface ProspectoForm {
  nombre: string;
  telefono: string;
  correo: string;
  interes: ProspectoInteres | '';
  id_cliente_crov: string;
  nombre_negocio: string;
  direccion_negocio: string;
}

const defaultProspectoForm: ProspectoForm = {
  nombre: '',
  telefono: '',
  correo: '',
  interes: '',
  id_cliente_crov: '',
  nombre_negocio: '',
  direccion_negocio: '',
};

interface PlantillaCRM {
  id: string;
  titulo: string;
  mensaje: string;
  activo: boolean;
}

interface ProspectoInteresStat {
  interes: ProspectoInteres | null;
  label: string;
  count: number;
  percentage: number;
}

interface ProspectosStatsSummary {
  total: number;
  conCliente: number;
  conClientePercentage: number;
  conCorreo: number;
  conCorreoPercentage: number;
  negociosUnicos: number;
  prospectosVencidos: number;
  prospectosRecientes: number;
  prospectosNotificadosRecientes: number;
  interestBreakdown: ProspectoInteresStat[];
  topInterestLabel: string;
  topInterestPercentage: number;
}

interface MantenimientoClienteCROV {
  id: number;
  id_cliente_crov: number | null;
  fecha_mantenimiento: string | null;
  fecha_proximo_mantenimiento: string | null;
  comentarios: string | null;
  activo: number;
  clienteNombre: string | null;
  clienteNegocio: string | null;
}

interface MantenimientoForm {
  id_cliente_crov: string;
  fecha_mantenimiento: string;
  fecha_proximo_mantenimiento: string;
  comentarios: string;
  activo: boolean;
}

const defaultMantenimientoForm: MantenimientoForm = {
  id_cliente_crov: '',
  fecha_mantenimiento: '',
  fecha_proximo_mantenimiento: '',
  comentarios: '',
  activo: true,
};

type CrovTabValue =
  | 'dashboard'
  | 'clientes'
  | 'sistemas'
  | 'giros'
  | 'mantenimientos'
  | 'prospectos'
  | 'empleados'
  | 'tickets'
  | 'historial_ahorros'
  | 'mi_ahorro';

interface WhatsappTargetMeta {
  prospecto: ProspectoCROV;
  rawPhone: string;
  sanitized: string;
  isValid: boolean;
}

const prospectoInteresOptions: { value: ProspectoInteres; label: string }[] = [
  { value: 'PUNTO_DE_VENTA_CROV', label: 'Punto de Venta CROV' },
  { value: 'CROV_RESTAURANTE', label: 'CROV Restaurante' },
  { value: 'PUNTO_DE_VENTA_WEB', label: 'Punto de Venta Web' },
];

const CLIENT_LOGO_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

const CLIENT_LOGO_MAX_BYTES = 10 * 1024 * 1024;

const normalizeGiroComercial = (raw: any): GiroComercial => {
  const rawId =
    raw?.id ?? raw?.giro_id ?? raw?.giroId ?? raw?.uuid ?? raw?.clave ?? raw?.value;
  const parsedId = Number(rawId);
  const normalizedId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : Date.now();

  const nombreRaw =
    typeof raw?.nombre === 'string'
      ? raw.nombre
      : typeof raw?.nombre_giro === 'string'
        ? raw.nombre_giro
        : typeof raw?.giro === 'string'
          ? raw.giro
          : '';

  const descripcionRaw =
    typeof raw?.descripcion === 'string'
      ? raw.descripcion
      : typeof raw?.descripcion_giro === 'string'
        ? raw.descripcion_giro
        : typeof raw?.detalle === 'string'
          ? raw.detalle
          : null;

  const activoRaw = raw?.activo ?? raw?.estatus ?? raw?.status ?? null;
  let activo: number | boolean | null | undefined = null;
  if (typeof activoRaw === 'number') {
    activo = activoRaw;
  } else if (typeof activoRaw === 'boolean') {
    activo = activoRaw ? 1 : 0;
  } else if (typeof activoRaw === 'string') {
    const lower = activoRaw.toLowerCase();
    if (['1', 'true', 'activo', 'activa', 'habilitado'].includes(lower)) {
      activo = 1;
    } else if (['0', 'false', 'inactivo', 'inactiva', 'deshabilitado'].includes(lower)) {
      activo = 0;
    }
  }

  return {
    id: normalizedId,
    nombre: nombreRaw?.trim() ? nombreRaw.trim() : `Giro #${normalizedId}`,
    descripcion: descripcionRaw?.trim() ? descripcionRaw.trim() : null,
    activo,
  };
};

const mapGiroFormToPayload = (form: GiroComercialForm) => ({
  nombre: form.nombre.trim(),
});

const normalizeSistemaCrov = (raw: any): SistemaCrov => {
  const rawId = raw?.id ?? raw?.uuid ?? raw?.sistema_id ?? raw?.sistemaId;
  const parsedId = Number(rawId);
  const normalizedId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : Date.now();

  const activoRaw = raw?.activo ?? raw?.estatus ?? raw?.status ?? 1;
  const activoBoolean =
    activoRaw === true ||
    activoRaw === 1 ||
    (typeof activoRaw === 'string' && ['1', 'true', 'activo', 'activa'].includes(activoRaw.toLowerCase()));

  return {
    id: normalizedId,
    nombre:
      typeof raw?.nombre === 'string' && raw.nombre.trim().length > 0
        ? raw.nombre.trim()
        : `Sistema #${normalizedId}`,
    activo: activoBoolean ? 1 : 0,
    fecha_registro: raw?.fecha_registro ?? raw?.created_at ?? raw?.createdAt ?? null,
  };
};

const mapSistemaFormToPayload = (
  form: SistemaCrovForm,
  existing?: SistemaCrov | null
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    nombre: form.nombre.trim(),
    activo: form.activo ? 1 : 0,
  };

  if (!existing) {
    payload.fecha_registro = new Date().toISOString();
  }

  return payload;
};

const toNumberOrNull = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const roundToSixDecimals = (value: number) =>
  Math.round(value * 1_000_000) / 1_000_000;

const toCoordinateNumber = (
  value: number | string | null | undefined
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundToSixDecimals(value) : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? roundToSixDecimals(parsed) : null;
  }

  return null;
};

const toCoordinateInputValue = (
  value: number | string | null | undefined
) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundToSixDecimals(value).toString() : '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
};

const getClienteGiroId = (cliente: ClienteCROV): number | null => {
  const candidates: (number | string | null | undefined)[] = [
    cliente.id_giro_comercial,
    cliente.giro_comercial_id,
    cliente.giro?.id,
    cliente.giro_comercial?.id,
  ];

  for (const candidate of candidates) {
    const parsed = toNumberOrNull(candidate as number | string | null | undefined);
    if (parsed && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const EMPTY_SELECT_VALUE = '__NONE__';

const getProspectoInteresLabel = (value: ProspectoInteres | null) => {
  if (!value) {
    return 'Sin especificar';
  }
  const option = prospectoInteresOptions.find((item) => item.value === value);
  return option?.label ?? value;
};

const formatPercentage = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '0%';
  }

  if (value >= 10) {
    return `${Math.round(value)}%`;
  }

  return `${Math.round(value * 10) / 10}%`;
};

const parseDateValue = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const tipoSistemaOptions: { value: TipoSistema; label: string }[] = [
  { value: 'PUNTO_DE_VENTA_CROV', label: 'Punto de Venta CROV' },
  { value: 'CROV_RESTAURANTE', label: 'CROV Restaurante' },
  { value: 'CROV_HOTEL', label: 'CROV Hotel' },
  { value: 'CROV_SPA', label: 'CROV Spa' },
  { value: 'CROV_INMOBILIARIA', label: 'CROV Inmobiliaria' },
];

const formatDisplayDate = (value: string | null) => {
  if (!value) return 'Sin fecha';
   const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const dateOnly = new Date(year, month - 1, day);
    if (!Number.isNaN(dateOnly.getTime())) {
      return dateOnly.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const toInputDate = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
};

const toDateOnlyISOString = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const mapFormToPayload = (form: ClienteForm) => ({
  nombre_cliente: form.nombre_cliente.trim(),
  nombre_negocio: form.nombre_negocio.trim(),
  direccion: form.direccion.trim() ? form.direccion.trim() : null,
  telefono: form.telefono.trim() ? form.telefono.trim() : null,
  correo: form.correo.trim() ? form.correo.trim() : null,
  tipo_sistema: form.tipo_sistema,
  fecha_instalacion: toDateOnlyISOString(form.fecha_instalacion),
  fecha_fin_soporte: toDateOnlyISOString(form.fecha_fin_soporte),
  id_giro_comercial: toNumberOrNull(form.id_giro_comercial),
  latitud: toCoordinateNumber(form.latitud),
  longitud: toCoordinateNumber(form.longitud),
});

const normalizeProspecto = (raw: any): ProspectoCROV => {
  const id = Number(
    raw?.id ?? raw?.prospecto_id ?? raw?.uuid ?? raw?.clave ?? raw?.prospectoId ?? 0
  );

  const nombre =
    raw?.nombre ??
    raw?.nombre_cliente ??
    raw?.nombre_prospecto ??
    raw?.cliente ??
    raw?.contacto ??
    'Sin nombre';

  const telefono =
    raw?.telefono ?? raw?.telefono_contacto ?? raw?.celular ?? raw?.telefonoProspecto ?? '';

  const correo =
    raw?.correo ?? raw?.correo_contacto ?? raw?.email ?? raw?.correoProspecto ?? null;

  const interes = raw?.interes ?? raw?.sistema_interes ?? raw?.tipo_interes ?? null;
  const idCliente =
    raw?.id_cliente_crov ?? raw?.cliente_id ?? raw?.idCliente ?? raw?.clienteId ?? null;

  const nombreNegocio =
    raw?.nombre_negocio ?? raw?.negocio ?? raw?.empresa ?? raw?.nombreComercial ?? null;

  const direccionNegocio =
    raw?.direccion_negocio ?? raw?.direccion ?? raw?.ubicacion ?? raw?.domicilio ?? null;

  const ultimaNotificacionRaw =
    raw?.ultima_notificacion ??
    raw?.ultimaNotificacion ??
    raw?.ultima_notificacion_at ??
    raw?.last_notification ??
    raw?.lastNotification ??
    null;

  const fechaCreacionRaw =
    raw?.fecha_creacion ??
    raw?.fechaCreacion ??
    raw?.created_at ??
    raw?.createdAt ??
    raw?.fecha_registro ??
    raw?.fechaRegistro ??
    null;

  let ultimaNotificacion: string | null = null;
  if (typeof ultimaNotificacionRaw === 'string') {
    ultimaNotificacion = ultimaNotificacionRaw.trim() ? ultimaNotificacionRaw : null;
  } else if (ultimaNotificacionRaw instanceof Date) {
    ultimaNotificacion = ultimaNotificacionRaw.toISOString();
  }

  let fechaCreacion: string | null = null;
  if (typeof fechaCreacionRaw === 'string') {
    fechaCreacion = fechaCreacionRaw.trim() ? fechaCreacionRaw : null;
  } else if (fechaCreacionRaw instanceof Date) {
    fechaCreacion = fechaCreacionRaw.toISOString();
  }

  const normalizedInteres =
    typeof interes === 'string' &&
    ['PUNTO_DE_VENTA_CROV', 'CROV_RESTAURANTE', 'PUNTO_DE_VENTA_WEB'].includes(interes)
      ? (interes as ProspectoInteres)
      : null;

  const parsedIdCliente =
    typeof idCliente === 'string'
      ? Number(idCliente.trim())
      : typeof idCliente === 'number'
        ? idCliente
        : null;

  const normalizedIdCliente =
    typeof parsedIdCliente === 'number' &&
    Number.isFinite(parsedIdCliente) &&
    parsedIdCliente > 0
      ? parsedIdCliente
      : null;

  return {
    id: Number.isFinite(id) && id > 0 ? id : Date.now(),
    nombre: typeof nombre === 'string' && nombre.trim() ? nombre.trim() : 'Sin nombre',
    telefono: typeof telefono === 'string' && telefono.trim() ? telefono.trim() : '',
    correo: typeof correo === 'string' && correo.trim() ? correo.trim() : null,
    interes: normalizedInteres,
    id_cliente_crov: normalizedIdCliente,
    nombre_negocio:
      typeof nombreNegocio === 'string' && nombreNegocio.trim()
        ? nombreNegocio.trim()
        : null,
    direccion_negocio:
      typeof direccionNegocio === 'string' && direccionNegocio.trim()
        ? direccionNegocio.trim()
        : null,
    ultima_notificacion: ultimaNotificacion,
    fecha_creacion: fechaCreacion,
  };
};

const normalizeMantenimiento = (raw: any): MantenimientoClienteCROV => {
  const rawId = raw?.id ?? raw?.mantenimiento_id ?? raw?.uuid ?? raw?.clave ?? 0;
  const parsedId = Number(rawId);
  const normalizedId =
    Number.isFinite(parsedId) && parsedId > 0 ? parsedId : Date.now();

  const clienteRaw =
    raw?.id_cliente_crov ?? raw?.cliente_id ?? raw?.idCliente ?? raw?.clienteId ?? null;
  const clienteId = toNumberOrNull(clienteRaw as number | string | null | undefined);

  const toDateString = (value: any): string | null => {
    if (!value && value !== 0) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }

    return null;
  };

  const fechaMantenimiento = toDateString(
    raw?.fecha_mantenimiento ?? raw?.fechaMantenimiento ?? raw?.fecha ?? null
  );
  const fechaProximo = toDateString(
    raw?.fecha_proximo_mantenimiento ??
      raw?.fechaProximoMantenimiento ??
      raw?.proximo_mantenimiento ??
      raw?.proximoMantenimiento ??
      null
  );

  const comentariosRaw = raw?.comentarios ?? raw?.comentario ?? raw?.notas ?? null;
  const comentarios =
    typeof comentariosRaw === 'string' && comentariosRaw.trim()
      ? comentariosRaw.trim()
      : null;

  const activoRaw = raw?.activo ?? raw?.estatus ?? raw?.status ?? raw?.is_active ?? 1;
  let activo = 1;
  if (typeof activoRaw === 'boolean') {
    activo = activoRaw ? 1 : 0;
  } else if (typeof activoRaw === 'number') {
    activo = Number(activoRaw) === 0 ? 0 : 1;
  } else if (typeof activoRaw === 'string') {
    const normalized = activoRaw.trim().toLowerCase();
    if (
      ['0', 'false', 'inactivo', 'inactiva', 'no', 'desactivado', 'deshabilitado'].includes(
        normalized
      )
    ) {
      activo = 0;
    } else {
      activo = 1;
    }
  }

  const clienteNombreRaw =
    raw?.nombre_cliente ?? raw?.cliente ?? raw?.clienteNombre ?? raw?.nombreCliente ?? null;
  const clienteNegocioRaw =
    raw?.nombre_negocio ?? raw?.negocio ?? raw?.nombreNegocio ?? raw?.comercio ?? null;

  return {
    id: normalizedId,
    id_cliente_crov: clienteId ?? null,
    fecha_mantenimiento: fechaMantenimiento,
    fecha_proximo_mantenimiento: fechaProximo,
    comentarios,
    activo,
    clienteNombre:
      typeof clienteNombreRaw === 'string' && clienteNombreRaw.trim()
        ? clienteNombreRaw.trim()
        : null,
    clienteNegocio:
      typeof clienteNegocioRaw === 'string' && clienteNegocioRaw.trim()
        ? clienteNegocioRaw.trim()
        : null,
  };
};

const normalizePlantilla = (raw: any): PlantillaCRM | null => {
  if (!raw) {
    return null;
  }

  const rawId =
    raw?.id ?? raw?.plantilla_id ?? raw?.uuid ?? raw?.clave ?? raw?.value ?? raw?.plantillaId;

  if (rawId === null || rawId === undefined) {
    return null;
  }

  const titulo =
    typeof raw?.titulo === 'string'
      ? raw.titulo
      : typeof raw?.nombre === 'string'
        ? raw.nombre
        : '';

  const mensajeRaw = typeof raw?.mensaje === 'string' ? raw.mensaje : '';
  const mensaje = normalizeUnicodeText(mensajeRaw);

  const activoRaw = raw?.activo ?? raw?.status ?? raw?.esta_activa ?? raw?.is_active ?? null;
  let activo = true;
  if (typeof activoRaw === 'number') {
    activo = activoRaw === 1;
  } else if (typeof activoRaw === 'boolean') {
    activo = activoRaw;
  } else if (typeof activoRaw === 'string') {
    const normalized = activoRaw.toLowerCase();
    if (['0', 'false', 'inactivo', 'inactiva', 'disabled'].includes(normalized)) {
      activo = false;
    } else if (['1', 'true', 'activo', 'activa', 'enabled'].includes(normalized)) {
      activo = true;
    }
  }

  return {
    id: String(rawId),
    titulo: titulo.trim(),
    mensaje,
    activo,
  };
};

const mapProspectoFormToPayload = (form: ProspectoForm) => ({
  nombre: form.nombre.trim(),
  telefono: form.telefono.trim(),
  correo: form.correo.trim() ? form.correo.trim() : null,
  interes: form.interes || null,
  id_cliente_crov: form.id_cliente_crov ? Number(form.id_cliente_crov) : null,
  nombre_negocio: form.nombre_negocio.trim() ? form.nombre_negocio.trim() : null,
  direccion_negocio: form.direccion_negocio.trim()
    ? form.direccion_negocio.trim()
    : null,
});

const mapMantenimientoFormToPayload = (form: MantenimientoForm) => {
  const idCliente = Number(form.id_cliente_crov);

  const payload: Record<string, unknown> = {
    id_cliente_crov: Number.isFinite(idCliente) && idCliente > 0 ? idCliente : null,
    fecha_mantenimiento: form.fecha_mantenimiento,
    fecha_proximo_mantenimiento: form.fecha_proximo_mantenimiento
      ? form.fecha_proximo_mantenimiento
      : null,
    comentarios: form.comentarios.trim() ? form.comentarios.trim() : null,
    activo: 1,
  };

  return payload;
};

type EmpleadoStatus = 'ACTIVO' | 'INACTIVO';
type EmpleadoPuesto =
  | 'SCRUM_MASTER'
  | 'TESTER'
  | 'DESARROLLADOR'
  | 'VENTAS'
  | 'SLA';

const EMPLEADO_PUESTO_EMPTY_VALUE = 'SIN_PUESTO';
const TICKET_RESPONSABLE_EMPTY_VALUE = 'SIN_RESPONSABLE';

interface EmpleadoCROV {
  id: number;
  nombreCompleto: string;
  puesto: EmpleadoPuesto | null;
  celular: string | null;
  correo: string | null;
  fechaNacimiento: string | null;
  estatus: EmpleadoStatus;
  totalAhorro: number;
  residente: number;
  proyectoResidencia: number | null;
  activo: number;
  montoAhorro: number | '';
  color_perfil: string;
  sistema_residencia: {id: number, nombre: string} | null;
  dias_vacaciones: number
}

interface EmpleadoForm {
  nombreCompleto: string;
  puesto: EmpleadoPuesto | typeof EMPLEADO_PUESTO_EMPTY_VALUE;
  celular: string;
  correo: string;
  password: string;
  fechaNacimiento: string;
  totalAhorro: number;
  residente: boolean;
  proyectoResidencia: number | null;
  activo: number;
  montoAhorro: number | '';
  dias_vacaciones: number;
}

const defaultEmpleadoForm: EmpleadoForm = {
  nombreCompleto: '',
  puesto: EMPLEADO_PUESTO_EMPTY_VALUE,
  celular: '',
  correo: '',
  password: '',
  fechaNacimiento: '',
  totalAhorro: 0,
  residente: false,
  proyectoResidencia: null,
  activo: 1,
  montoAhorro: '',
  dias_vacaciones: 0,
};

interface PermisoInternal {
  id: number;
  nombre: string;
}

const empleadoPuestoOptions: { value: EmpleadoPuesto; label: string }[] = [
  { value: 'SCRUM_MASTER', label: 'Scrum Master' },
  { value: 'TESTER', label: 'Tester' },
  { value: 'DESARROLLADOR', label: 'Desarrollador' },
  { value: 'VENTAS', label: 'Ventas' },
  { value: 'SLA', label: 'SLA' },
];

const empleadoPuestoLabels = empleadoPuestoOptions.reduce<
  Record<EmpleadoPuesto, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<EmpleadoPuesto, string>);

const normalizeEmpleado = (raw: any): EmpleadoCROV => {
  const id = Number(raw?.id ?? raw?.empleado_id ?? raw?.uuid ?? raw?.clave ?? 0);
  const nombreRaw =
    raw?.nombre_completo ??
    raw?.nombre ??
    raw?.nombre_empleado ??
    [raw?.nombre ?? '', raw?.apellido ?? '', raw?.apellido_paterno ?? '', raw?.apellido_materno ?? '']
      .filter((value: string) => typeof value === 'string' && value.trim())
      .join(' ');

  const puestoRaw = raw?.puesto ?? raw?.cargo ?? raw?.rol ?? null;
  const puesto =
    typeof puestoRaw === 'string'
      ? (empleadoPuestoOptions.find(
          (option) =>
            option.value === puestoRaw ||
            option.value === puestoRaw.toUpperCase() ||
            option.label.toLowerCase() === puestoRaw.toLowerCase()
        )?.value ?? null)
      : null;

  const celular = raw?.celular ?? raw?.telefono ?? raw?.telefono_contacto ?? null;
  const correo = raw?.correo ?? raw?.email ?? raw?.correo_electronico ?? null;
  const fechaNacimiento = raw?.fecha_nacimiento ?? raw?.fechaNacimiento ?? raw?.nacimiento ?? null;
  const totalAhorroRaw = raw?.totalAhorro ?? raw?.total_ahorro ?? 0;
  const montoAhorroRaw = raw?.monto_ahorro ?? raw?.montoAhorro ?? 0;
  const residenteRaw = raw?.residente ?? raw?.es_residente ?? 0; 
  const statusRaw = raw?.estatus ?? raw?.status ?? raw?.estado ?? null;
  const activeRaw = raw?.activo ?? raw?.is_active ?? raw?.activo_empleado ?? null;

  let activo = 1;
  if (typeof activeRaw === 'string') {
    const normalized = activeRaw.trim().toLowerCase();
    activo = normalized === '0' || normalized === 'false' ? 0 : 1;
  } else if (typeof activeRaw === 'number') {
    activo = Number(activeRaw) === 0 ? 0 : 1;
  } else if (typeof activeRaw === 'boolean') {
    activo = activeRaw ? 1 : 0;
  }

  let estatus: EmpleadoStatus = activo === 1 ? 'ACTIVO' : 'INACTIVO';
  if (typeof statusRaw === 'string') {
    const normalized = statusRaw.trim().toUpperCase();
    if (normalized === 'INACTIVO') {
      estatus = 'INACTIVO';
      activo = 0;
    } else if (normalized === 'ACTIVO') {
      estatus = 'ACTIVO';
      activo = 1;
    }
  } else if (typeof statusRaw === 'number') {
    const numericStatus = Number(statusRaw);
    if (numericStatus === 0) {
      estatus = 'INACTIVO';
      activo = 0;
    } else if (numericStatus === 1) {
      estatus = 'ACTIVO';
      activo = 1;
    }
  } else if (typeof statusRaw === 'boolean') {
    estatus = statusRaw ? 'ACTIVO' : 'INACTIVO';
    activo = statusRaw ? 1 : 0;
  }

  const totalAhorroNumber = Number(totalAhorroRaw);
  const montoAhorroNumber = Number(montoAhorroRaw);
  let residente = 0;
  if (typeof residenteRaw === 'string') {
    residente = residenteRaw.trim() === '1' || residenteRaw.trim().toLowerCase() === 'true' ? 1 : 0;
  } else if (typeof residenteRaw === 'number') {
    residente = Number(residenteRaw) === 1 ? 1 : 0;
  } else if (typeof residenteRaw === 'boolean') {
    residente = residenteRaw ? 1 : 0;
  }


  return {
    id: Number.isFinite(id) && id > 0 ? id : Date.now(),
    nombreCompleto:
      typeof nombreRaw === 'string' && nombreRaw.trim() ? nombreRaw.trim() : 'Sin nombre',
    puesto,
    celular: typeof celular === 'string' ? celular : null,
    correo: typeof correo === 'string' ? correo : null,
    fechaNacimiento: typeof fechaNacimiento === 'string' ? fechaNacimiento : null,
    totalAhorro: Number.isFinite(totalAhorroNumber) ? totalAhorroNumber : 0,
    montoAhorro: Number.isFinite(montoAhorroNumber) ? montoAhorroNumber : 0,
    residente,
    proyectoResidencia: raw?.id_sistema_residencia ?? null,
    estatus,
    activo,
    color_perfil: raw?.color_perfil ?? catalogoColoresPerfil[0],
    sistema_residencia: raw.sistema_residencia,
    dias_vacaciones: raw?.dias_vacaciones ?? 0,
  };
};

const normalizePermisoInternal = (raw: any): PermisoInternal => {
  const id = Number(raw?.id ?? raw?.permisoId ?? raw?.permiso_id ?? 0);
  const nombre = String(raw?.nombre ?? raw?.permiso ?? '');

  return { id, nombre };
};

const mapEmpleadoFormToPayload = (
  form: EmpleadoForm,
  { requirePassword = true }: { requirePassword?: boolean } = {}
) => {
  const trimmed = {
    nombreCompleto: form.nombreCompleto.trim(),
    celular: form.celular.trim(),
    correo: form.correo.trim(),
    password: form.password.trim(),
  };

  const estatus = form.activo === 1 ? 'ACTIVO' : 'INACTIVO';
  const totalAhorro = Number(form.totalAhorro);

  const payload: Record<string, unknown> = {
    nombre_completo: trimmed.nombreCompleto,
    puesto:
      form.puesto === EMPLEADO_PUESTO_EMPTY_VALUE ? null : (form.puesto as EmpleadoPuesto),
    celular: trimmed.celular || null,
    correo: trimmed.correo || null,
    password: trimmed.password,
    estatus,
    activo: form.activo,
    fecha_nacimiento: toDateOnlyISOString(form.fechaNacimiento),
    totalAhorro: Number.isFinite(totalAhorro) ? totalAhorro : 0,
    residente: form.residente ? 1 : 0,
    idProyectoResidencia: form.proyectoResidencia, 
    montoAhorro: form.montoAhorro,
    dias_vacaciones: form.dias_vacaciones,
  };

  return payload;
};

const GARANTIA_VALUES = ['SI', 'NO'] as const;
type GarantiaTicket = (typeof GARANTIA_VALUES)[number];

const TIPO_PROBLEMA_VALUES = [
  'DUDA',
  'FALLA_SISTEMA',
  'MANTENIMIENTO',
  'ERROR_CLIENTE',
  'ASISTENCIA_CON_EL_SISTEMA',
  'INSTALACION_DE_DEMO',
  'CAMBIO',
] as const;
type TipoProblemaTicket = (typeof TIPO_PROBLEMA_VALUES)[number];

const PRIORIDAD_VALUES = ['BAJA', 'MEDIA', 'URGENTE'] as const;
type PrioridadTicket = (typeof PRIORIDAD_VALUES)[number];

const ESTADO_SOLICITUD_VALUES = [
  'RECIBIDO',
  'EN_PROCESO',
  'RESUELTO',
  'PENDIENTE',
  'SIN_SOPORTE',
  'CLIENTE_NO_RESPONDE',
] as const;
type EstadoSolicitudTicket = (typeof ESTADO_SOLICITUD_VALUES)[number];

const garantiaOptions: { value: GarantiaTicket; label: string }[] = [
  { value: 'SI', label: 'Sí' },
  { value: 'NO', label: 'No' },
];

const garantiaLabels = garantiaOptions.reduce<Record<GarantiaTicket, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<GarantiaTicket, string>
);

const tipoProblemaOptions: { value: TipoProblemaTicket; label: string }[] = [
  { value: 'DUDA', label: 'Duda' },
  { value: 'FALLA_SISTEMA', label: 'Falla en el sistema' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'ERROR_CLIENTE', label: 'Error del cliente' },
  { value: 'ASISTENCIA_CON_EL_SISTEMA', label: 'Asistencia con el sistema' },
  { value: 'INSTALACION_DE_DEMO', label: 'Instalación de demo' },
  { value: 'CAMBIO', label: 'Cambio' },
];

const tipoProblemaLabels = tipoProblemaOptions.reduce<
  Record<TipoProblemaTicket, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<TipoProblemaTicket, string>);

const prioridadOptions: {
  value: PrioridadTicket;
  label: string;
  icon: React.ElementType;
  className: string;
}[] = [
  {
    value: 'URGENTE',
    label: 'Urgente',
    icon: ChevronUp,
    className:
      'border-red-200 bg-red-50 text-red-700',
  },
  {
    value: 'MEDIA',
    label: 'Media',
    icon: Minus,
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    value: 'BAJA',
    label: 'Baja',
    icon: ChevronDown,
    className:
      'border-blue-200 bg-blue-50 text-blue-700',
  },
];


const prioridadLabels = prioridadOptions.reduce<
  Record<PrioridadTicket, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<PrioridadTicket, string>);

const estadoSolicitudOptions: { value: EstadoSolicitudTicket; label: string }[] = [
  { value: 'RECIBIDO', label: 'Recibido' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'RESUELTO', label: 'Resuelto' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'SIN_SOPORTE', label: 'Sin soporte' },
  { value: 'CLIENTE_NO_RESPONDE', label: 'Cliente no responde' },
];

const estadoSolicitudLabels = estadoSolicitudOptions.reduce<
  Record<EstadoSolicitudTicket, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<EstadoSolicitudTicket, string>);

const estadoSolicitudBadgeStyles: Record<EstadoSolicitudTicket, string> = {
  RECIBIDO: 'border-blue-200 bg-blue-50 text-blue-700',
  EN_PROCESO: 'border-amber-200 bg-amber-50 text-amber-700',
  RESUELTO: 'border-green-200 bg-green-50 text-green-700',
  PENDIENTE: 'border-orange-200 bg-orange-50 text-orange-700',
  SIN_SOPORTE: 'border-slate-200 bg-slate-50 text-slate-600',
  CLIENTE_NO_RESPONDE: 'border-red-200 bg-red-50 text-red-700',
};

const estadoSolicitudChartColors: Record<EstadoSolicitudTicket, string> = {
  RECIBIDO: '#2563eb',
  EN_PROCESO: '#f97316',
  RESUELTO: '#22c55e',
  PENDIENTE: '#facc15',
  SIN_SOPORTE: '#64748b',
  CLIENTE_NO_RESPONDE: '#ef4444',
};

const prioridadBadgeStyles: Record<PrioridadTicket, string> = {
  URGENTE: 'border-red-200 bg-red-50 text-red-700',
  MEDIA: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  BAJA: 'border-slate-200 bg-slate-50 text-slate-600',
};

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toDateTimeInput = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const parseDateSafe = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const getDaysSinceDate = (value?: string | null) => {
  const date = parseDateSafe(value ?? null);
  if (!date) {
    return null;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    return 0;
  }

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const formatDateToInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string | null) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const startOfDayFromInput = (value: string | null) => {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const endOfDayFromInput = (value: string | null) => {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return null;
  }
  parsed.setHours(23, 59, 59, 999);
  return parsed;
};

const getDefaultTicketDateRange = () => {
  const end = new Date();
  end.setDate(end.getDate() + 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);

  return {
    start: formatDateToInput(start),
    end: formatDateToInput(end),
  };
};

const formatDurationHHMMSS = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const formatDurationHuman = (milliseconds: number) => {
  if (milliseconds <= 0) {
    return '0s';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

const parseTiempoAtencionToMs = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const parts = value.trim().split(':');
  if (parts.length !== 3) {
    return null;
  }

  const [hoursRaw, minutesRaw, secondsRaw] = parts;
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  const seconds = Number.parseInt(secondsRaw, 10);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    hours < 0 ||
    minutes < 0 ||
    seconds < 0
  ) {
    return null;
  }

  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
};

const calculateTiempoRespuesta = (
  fechaRecepcion?: string | null,
  fechaSolucion?: string | null
) => {
  const start = parseDateSafe(fechaRecepcion);
  const end = parseDateSafe(fechaSolucion);

  if (!start || !end) {
    return null;
  }

  const diff = end.getTime() - start.getTime();
  if (diff < 0) {
    return null;
  }

  return formatDurationHHMMSS(diff);
};

interface TicketSoporteCROV {
  id: number;
  folio: string;
  nombre_cliente: string;
  nombre_negocio: string;
  correo: string | null;
  telefono: string | null;
  garantia: GarantiaTicket;
  tipo_problema: TipoProblemaTicket;
  prioridad: PrioridadTicket;
  estado_solicitud: EstadoSolicitudTicket;
  descripcion: string | null;
  descripcion_solucion: string | null;
  fecha_registro: string | null;
  fecha_solucion: string | null;
  id_empleado_crov: number | null;
  empleadoNombre: string | null;
  tiempo_atencion: string | null;
}

const resolveTicketTiempoRespuesta = (ticket: TicketSoporteCROV) =>
  ticket.tiempo_atencion ??
  calculateTiempoRespuesta(ticket.fecha_registro, ticket.fecha_solucion);

const getTicketResponseDurationMs = (ticket: TicketSoporteCROV) => {
  const start = parseDateSafe(ticket.fecha_registro);
  const end = parseDateSafe(ticket.fecha_solucion);

  if (start && end && end.getTime() >= start.getTime()) {
    return end.getTime() - start.getTime();
  }

  return parseTiempoAtencionToMs(ticket.tiempo_atencion);
};

interface TicketForm {
  folio: string;
  nombre_cliente: string;
  nombre_negocio: string;
  correo: string;
  telefono: string;
  garantia: GarantiaTicket;
  tipo_problema: TipoProblemaTicket;
  prioridad: PrioridadTicket;
  estado_solicitud: EstadoSolicitudTicket;
  descripcion: string;
  descripcion_solucion: string;
  fecha_registro: string;
  fecha_solucion: string;
  id_empleado_crov: string;
}

const defaultTicketForm: TicketForm = {
  folio: '',
  nombre_cliente: '',
  nombre_negocio: '',
  correo: '',
  telefono: '',
  garantia: 'NO',
  tipo_problema: 'DUDA',
  prioridad: 'MEDIA',
  estado_solicitud: 'RECIBIDO',
  descripcion: '',
  descripcion_solucion: '',
  fecha_registro: '',
  fecha_solucion: '',
  id_empleado_crov: '',
};

const TICKET_FOLIO_PREFIX = 'CR-';
const TICKET_FOLIO_PAD_LENGTH = 6;

const formatTicketFolio = (value: number) =>
  `${TICKET_FOLIO_PREFIX}${value.toString().padStart(TICKET_FOLIO_PAD_LENGTH, '0')}`;

const parseTicketFolioNumber = (folio: string): number | null => {
  const match = folio.trim().match(/^CR-(\d{6})$/i);
  if (!match) {
    return null;
  }
  const number = Number.parseInt(match[1], 10);
  return Number.isFinite(number) ? number : null;
};

const normalizeTicket = (raw: any): TicketSoporteCROV => {
  const id = Number(raw?.id ?? raw?.ticket_id ?? raw?.ticketId ?? 0);

  const garantiaRaw = typeof raw?.garantia === 'string' ? raw.garantia.toUpperCase() : '';
  const garantia: GarantiaTicket = GARANTIA_VALUES.includes(garantiaRaw as GarantiaTicket)
    ? (garantiaRaw as GarantiaTicket)
    : 'NO';

  const tipoRaw = typeof raw?.tipo_problema === 'string' ? raw.tipo_problema.toUpperCase() : '';
  const tipo: TipoProblemaTicket = TIPO_PROBLEMA_VALUES.includes(
    tipoRaw as TipoProblemaTicket
  )
    ? (tipoRaw as TipoProblemaTicket)
    : 'DUDA';

  const prioridadRaw = typeof raw?.prioridad === 'string' ? raw.prioridad.toUpperCase() : '';
  const prioridad: PrioridadTicket = PRIORIDAD_VALUES.includes(prioridadRaw as PrioridadTicket)
    ? (prioridadRaw as PrioridadTicket)
    : 'MEDIA';

  const estadoRaw =
    typeof raw?.estado_solicitud === 'string' ? raw.estado_solicitud.toUpperCase() : '';
  const estado: EstadoSolicitudTicket = ESTADO_SOLICITUD_VALUES.includes(
    estadoRaw as EstadoSolicitudTicket
  )
    ? (estadoRaw as EstadoSolicitudTicket)
    : 'RECIBIDO';

  const parseDate = (value: any) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    return null;
  };

  const empleadoRaw = raw?.empleado ?? null;
  let empleadoNombre: string | null = null;
  if (empleadoRaw) {
    const normalized = normalizeEmpleado(empleadoRaw);
    empleadoNombre = normalized.nombreCompleto;
  } else if (typeof raw?.empleado_nombre === 'string') {
    empleadoNombre = raw.empleado_nombre;
  } else if (typeof raw?.empleadoNombre === 'string') {
    empleadoNombre = raw.empleadoNombre;
  }

  const empleadoIdRaw = raw?.id_empleado_crov ?? raw?.empleado_id ?? raw?.empleadoId ?? null;
  const empleadoIdNumber = Number(empleadoIdRaw);
  const idEmpleado = Number.isFinite(empleadoIdNumber) && empleadoIdNumber > 0 ? empleadoIdNumber : null;

  const safeString = (value: any) => {
    if (value === null || value === undefined) {
      return null;
    }
    return typeof value === 'string' ? value : String(value);
  };

  return {
    id: Number.isFinite(id) && id > 0 ? id : Date.now(),
    folio: typeof raw?.folio === 'string' ? raw.folio : String(raw?.folio ?? ''),
    nombre_cliente:
      typeof raw?.nombre_cliente === 'string' ? raw.nombre_cliente : String(raw?.nombre_cliente ?? ''),
    nombre_negocio:
      typeof raw?.nombre_negocio === 'string' ? raw.nombre_negocio : String(raw?.nombre_negocio ?? ''),
    correo: safeString(raw?.correo),
    telefono: safeString(raw?.telefono),
    garantia,
    tipo_problema: tipo,
    prioridad,
    estado_solicitud: estado,
    descripcion: safeString(raw?.descripcion),
    descripcion_solucion: safeString(raw?.descripcion_solucion),
    fecha_registro: parseDate(raw?.fecha_registro ?? raw?.fechaRegistro ?? raw?.created_at),
    fecha_solucion: parseDate(raw?.fecha_solucion ?? raw?.fechaSolucion ?? raw?.closed_at),
    id_empleado_crov: idEmpleado,
    empleadoNombre,
    tiempo_atencion: safeString(raw?.tiempo_atencion),
  };
};

const mapTicketCommonFields = (form: TicketForm) => {
  const payload: Record<string, unknown> = {
    folio: form.folio.trim(),
    nombre_cliente: form.nombre_cliente.trim(),
    nombre_negocio: form.nombre_negocio.trim(),
    garantia: form.garantia,
    tipo_problema: form.tipo_problema,
    prioridad: form.prioridad,
    estado_solicitud: form.estado_solicitud,
  };

  const correo = form.correo.trim();
  payload.correo = correo ? correo : null;

  const telefono = form.telefono.trim();
  payload.telefono = telefono ? telefono : null;

  const descripcion = form.descripcion.trim();
  payload.descripcion = descripcion ? descripcion : null;

  const descripcionSolucion = form.descripcion_solucion.trim();
  payload.descripcion_solucion = descripcionSolucion ? descripcionSolucion : null;

  const tiempoRespuesta =
    form.estado_solicitud === 'RESUELTO'
      ? calculateTiempoRespuesta(form.fecha_registro, form.fecha_solucion)
      : null;
  payload.tiempo_atencion = tiempoRespuesta;

  if (form.id_empleado_crov) {
    const empleadoId = Number(form.id_empleado_crov);
    payload.id_empleado_crov = Number.isFinite(empleadoId) ? empleadoId : null;
  } else {
    payload.id_empleado_crov = null;
  }

  return payload;
};

const toISOStringWithNowFallback = (value?: string) => {
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return new Date().toISOString();
};

const mapTicketFormToCreatePayload = (form: TicketForm) => {
  const payload = mapTicketCommonFields(form);

  payload.fecha_registro = toISOStringWithNowFallback(form.fecha_registro);

  payload.fecha_solucion =
    form.estado_solicitud === 'RESUELTO'
      ? toISOStringWithNowFallback(form.fecha_solucion)
      : null;

  return payload;
};

const mapTicketFormToUpdatePayload = (form: TicketForm) => {
  const payload = mapTicketCommonFields(form);

  if (form.fecha_registro) {
    payload.fecha_registro = toISOStringWithNowFallback(form.fecha_registro);
  }

  payload.fecha_solucion =
    form.estado_solicitud === 'RESUELTO'
      ? toISOStringWithNowFallback(form.fecha_solucion)
      : null;

  return payload;
};

export type CrovModuleMode = 'catalogs' | 'gerente';

const TABS_BY_MODE: Record<CrovModuleMode, CrovTabValue[]> = {
  catalogs: ['dashboard', 'clientes', 'mantenimientos', 'prospectos', 'tickets'],
  gerente: ['sistemas', 'giros', 'empleados', 'historial_ahorros', 'mi_ahorro'],
};

const CROV_TAB_PERMISSIONS: Partial<Record<CrovTabValue, string>> = {
  dashboard: 'CROV/Dashboard',
  clientes: 'CROV/CROV clientes',
  mantenimientos: 'CROV/Mantenimientos',
  prospectos:'CROV/Prospectos' ,
  tickets:'CROV/Ticket soporte CROV',
  sistemas:'Catalogos Crov/Sistemas',
  giros:'Catalogos Crov/Giros Comerciales',
  empleados:'Catalogos Crov/Empleado CROV',
  historial_ahorros: 'Catalogos Crov/Historial-Ahorros',
  mi_ahorro: 'Catalogos Crov/Mi Ahorro',
};

export function CrovModule({ mode = 'catalogs' }: { mode?: CrovModuleMode }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const clientesEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/clientes-crov` : null),
    [apiUrl]
  );
  const girosEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/giro-comercial` : null),
    [apiUrl]
  );
  const prospectosEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/prospectos-crov` : null),
    [apiUrl]
  );
  const plantillasEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crm/plantillas` : null),
    [apiUrl]
  );
  const empleadosEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/empleados-crov` : null),
    [apiUrl]
  );
  const permisosInternalEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/permisos-internal` : null),
    [apiUrl]
  );
  const ticketsEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/tickets-soporte-crov` : null),
    [apiUrl]
  );
  const mantenimientosEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/mantenimientos-clientes-crov` : null),
    [apiUrl]
  );
  const sistemasEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/sistemas-crov` : null),
    [apiUrl]
  );
  const historicoAhorrosEmpleadosEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/historial-ahorros` : null),
    [apiUrl]
  );
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('internalToken') : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

 const [internalUserId, setInternalUserId] = useState<number | null>(null);
  const [userPermisos, setUserPermisos] = useState<PermisoInternal[]>([]);
  const [userPermisosLoading, setUserPermisosLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedId = Number(localStorage.getItem('internalUserId') ?? 0);
    if (Number.isFinite(storedId) && storedId > 0) {
      setInternalUserId(storedId);
    } else {
      setInternalUserId(null);
    }
  }, []);

  useEffect(() => {
    if (!permisosInternalEndpoint || !token || !internalUserId) {
      return;
    }

    const fetchUserPermisos = async () => {
      setUserPermisosLoading(true);
      try {
        const res = await axios.get(`${permisosInternalEndpoint}/${internalUserId}`, {
          headers: authHeaders,
        });
        const permisos = Array.isArray(res.data)
          ? res.data
              .map((permiso: any) => normalizePermisoInternal(permiso))
              .filter((permiso: PermisoInternal) => permiso.id && permiso.nombre)
          : [];
        setUserPermisos(permisos);
      } catch (err) {
        console.error('Error al cargar permisos internos del usuario', err);
        setUserPermisos([]);
      } finally {
        setUserPermisosLoading(false);
      }
    };

    fetchUserPermisos();
  }, [authHeaders, internalUserId, permisosInternalEndpoint, token]);

  const hasInternalPermission = useMemo(() => {
    const permisosSet = new Set(userPermisos.map((permiso) => permiso.nombre.trim().toLowerCase()));
    return (permiso: string) => permisosSet.has(permiso.trim().toLowerCase());
  }, [userPermisos]);

  const visibleTabs = useMemo(() => {
    const baseTabs = TABS_BY_MODE[mode];
    if (!internalUserId || !token) {
      return baseTabs;
    }
    if (!userPermisosLoading && userPermisos.length === 0) {
      return [];
    }
    return baseTabs.filter((tab) => {
      const permiso = CROV_TAB_PERMISSIONS[tab];
      if (!permiso) {
        return true;
      }
      return hasInternalPermission(permiso);
    });
  }, [hasInternalPermission, internalUserId, mode, token, userPermisos, userPermisosLoading]);
  const defaultTab: CrovTabValue = visibleTabs[0] ?? 'dashboard';
  const [activeTab, setActiveTab] = useState<CrovTabValue>(defaultTab);

  useEffect(() => {
    const [firstTab] = visibleTabs;
    if (firstTab && !visibleTabs.includes(activeTab)) {
      setActiveTab(firstTab);
    }
  }, [activeTab, visibleTabs]);
  const [clientes, setClientes] = useState<ClienteCROV[]>([]);
  const [giros, setGiros] = useState<GiroComercial[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteCROV | null>(null);
  const [form, setForm] = useState<ClienteForm>(defaultForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [girosLoading, setGirosLoading] = useState(false);
  const [girosSaving, setGirosSaving] = useState(false);
  const [giroDialogOpen, setGiroDialogOpen] = useState(false);
  const [giroForm, setGiroForm] = useState<GiroComercialForm>(defaultGiroForm);
  const [editingGiro, setEditingGiro] = useState<GiroComercial | null>(null);
  const [giroDeletingId, setGiroDeletingId] = useState<number | null>(null);
  const [girosSearch, setGirosSearch] = useState('');
  const [sistemas, setSistemas] = useState<SistemaCrov[]>([]);
  const [sistemasLoading, setSistemasLoading] = useState(false);
  const [sistemasSaving, setSistemasSaving] = useState(false);
  const [sistemaDialogOpen, setSistemaDialogOpen] = useState(false);
  const [sistemaForm, setSistemaForm] = useState<SistemaCrovForm>(defaultSistemaForm);
  const [editingSistema, setEditingSistema] = useState<SistemaCrov | null>(null);
  const [sistemaDeletingId, setSistemaDeletingId] = useState<number | null>(null);
  const [sistemasSearch, setSistemasSearch] = useState('');
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [supportDate, setSupportDate] = useState('');
  const [supportSaving, setSupportSaving] = useState(false);
  const [supportCliente, setSupportCliente] = useState<ClienteCROV | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapCliente, setMapCliente] = useState<ClienteCROV | null>(null);
  const [mapCoordinates, setMapCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [logoCliente, setLogoCliente] = useState<ClienteCROV | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoSelectedPreview, setLogoSelectedPreview] = useState<string | null>(
    null,
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const logoObjectUrlRef = useRef<string | null>(null);
  const revokeLogoObjectUrl = useCallback(() => {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
  }, []);
  const updateLogoPreview = useCallback(
    (value: string | null, options?: { isBlob?: boolean }) => {
      const useBlobUrl = Boolean(options?.isBlob && value);
      revokeLogoObjectUrl();
      if (useBlobUrl) {
        logoObjectUrlRef.current = value;
      }
      setLogoPreviewUrl(value);
    },
    [revokeLogoObjectUrl],
  );
  const [supportStatusFilter, setSupportStatusFilter] = useState<
    'TODOS' | 'VIGENTE' | 'SIN SOPORTE'
  >('TODOS');
  const [prospectos, setProspectos] = useState<ProspectoCROV[]>([]);
  const [prospectosLoading, setProspectosLoading] = useState(false);
  const [prospectoDialogOpen, setProspectoDialogOpen] = useState(false);
  const [prospectoForm, setProspectoForm] =
    useState<ProspectoForm>(defaultProspectoForm);
  const [editingProspecto, setEditingProspecto] =
    useState<ProspectoCROV | null>(null);
  const [prospectosSaving, setProspectosSaving] = useState(false);
  const [prospectoDeletingId, setProspectoDeletingId] = useState<number | null>(null);
  const [prospectosSearch, setProspectosSearch] = useState('');
  const [prospectosPhoneFilter, setProspectosPhoneFilter] = useState('');
  const [prospectoClienteFilter, setProspectoClienteFilter] = useState('');
  const [selectedProspectoIds, setSelectedProspectoIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [mantenimientos, setMantenimientos] = useState<MantenimientoClienteCROV[]>([]);
  const [mantenimientosLoading, setMantenimientosLoading] = useState(false);
  const [mantenimientoDialogOpen, setMantenimientoDialogOpen] = useState(false);
  const [mantenimientoForm, setMantenimientoForm] =
    useState<MantenimientoForm>(defaultMantenimientoForm);
  const [editingMantenimiento, setEditingMantenimiento] =
    useState<MantenimientoClienteCROV | null>(null);
  const [mantenimientosSaving, setMantenimientosSaving] = useState(false);
  const [mantenimientoDeletingId, setMantenimientoDeletingId] = useState<number | null>(
    null
  );
  const [mantenimientosSearch, setMantenimientosSearch] = useState('');
  const [mantenimientoClienteFilter, setMantenimientoClienteFilter] = useState('');
  const [plantillas, setPlantillas] = useState<PlantillaCRM[]>([]);
  const [plantillasLoaded, setPlantillasLoaded] = useState(false);
  const [plantillasLoading, setPlantillasLoading] = useState(false);
  const [plantillasError, setPlantillasError] = useState<string | null>(null);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappTargets, setWhatsappTargets] = useState<ProspectoCROV[]>([]);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState('');
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const selectAllProspectosRef = useRef<HTMLInputElement | null>(null);
  const activePlantillas = useMemo(
    () => plantillas.filter((plantilla) => Boolean(plantilla.activo)),
    [plantillas],
  );
  const [empleados, setEmpleados] = useState<EmpleadoCROV[]>([]);
  const [empleadosLoading, setEmpleadosLoading] = useState(false);
  const [prospectoClienteView, setProspectoClienteView] = useState<
    ClienteCROV | null
  >(null);
  const [openProyectoResidenciaCombobox, setOpenProyectoResidenciaCombobox] = useState(false);

  const [crearNuevoAhorroDialogOpen, setCrearNuevoAhorroDialogOpen] = useState(false);
  const [historialAhorrosLoading, setHistorialAhorrosLoading] = useState(false);
  const [historialAhorros, setHistorialAhorros] = useState<AhorroEmpleado[]>([]);
  const [historialAhorrosSearch, setHistorialAhorrosSearch] = useState('');
  const [historialAhorroEditingId, setHistorialAhorroEditingId] = useState<number|null>(null);
  const [deletingAhorroEmpleado, setDeletingAhorroEmpleado] = useState(false);

  const [historialMisAhorros, setHistorialMisAhorros] = useState<HistorialMiAhorroResponse | null>(null);
  const [loadingHistorialMisAhorros, setLoadingHistorialMisAhorros] = useState(false);
  const [errorHistorialMisAhorros, setErrorHistorialMisAhorros] = useState<string | null>(null);


  const [totalAhorrosGeneralOPorEmpleado, setTotalAhorrosGeneralOPorEmpleado] = useState({ total: 0, label: "Total acumulado" });
  const [loadingTotalAhorrosGeneralOPorEmpleado , setLoadingTotalAhorrosGeneralOPorEmpleado] = useState(false);
  // el state de abajo se usa para cuando se modifica algo en el historial de ahorros, cambia el estado y avisa para que se
  // vuelva hacer el fetch de la info que aparece en la card del total de ahorros general o por empleado
  const [refreshTotalAhorrosTrigger, setRefreshTotalAhorrosTrigger] = useState(0); 

  const [empleadoDialogOpen, setEmpleadoDialogOpen] = useState(false);
  const [empleadoForm, setEmpleadoForm] = useState<EmpleadoForm>(defaultEmpleadoForm);
  const [editingEmpleado, setEditingEmpleado] = useState<EmpleadoCROV | null>(null);
  const [empleadosSaving, setEmpleadosSaving] = useState(false);
  const [empleadoDeletingId, setEmpleadoDeletingId] = useState<number | null>(null);
  const [empleadosSearch, setEmpleadosSearch] = useState('');
  const [empleadoPermisosOpen, setEmpleadoPermisosOpen] = useState(false);
  const [empleadoPermisos, setEmpleadoPermisos] = useState<EmpleadoCROV | null>(null);
  const [permisosDisponibles, setPermisosDisponibles] = useState<PermisoInternal[]>([]);
  const [permisosAsignados, setPermisosAsignados] = useState<PermisoInternal[]>([]);
  const [selectedPermisosDisponibles, setSelectedPermisosDisponibles] = useState<
    PermisoInternal[]
  >([]);
  const [selectedPermisosAsignados, setSelectedPermisosAsignados] = useState<
    PermisoInternal[]
  >([]);
  const [permisosLoading, setPermisosLoading] = useState(false);
  const [permisosSaving, setPermisosSaving] = useState(false);
  const [permisosError, setPermisosError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketSoporteCROV[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState<TicketForm>(defaultTicketForm);
  const [editingTicket, setEditingTicket] = useState<TicketSoporteCROV | null>(null);
  const [ticketsSaving, setTicketsSaving] = useState(false);
  const [ticketDeletingId, setTicketDeletingId] = useState<number | null>(null);
  const [ticketsSearch, setTicketsSearch] = useState('');
  const [ticketClienteSearch, setTicketClienteSearch] = useState('');
  const [ticketClienteSearchActive, setTicketClienteSearchActive] = useState(false);
  const defaultTicketDateRange = useMemo(() => getDefaultTicketDateRange(), []);
  const [ticketEstadoFilter, setTicketEstadoFilter] = useState<
    'TODOS' | EstadoSolicitudTicket
  >('TODOS');
  const [ticketPrioridadFilter, setTicketPrioridadFilter] = useState<
    'TODAS' | PrioridadTicket
  >('TODAS');
  const [ticketGarantiaFilter, setTicketGarantiaFilter] = useState<
    'TODAS' | GarantiaTicket
  >('TODAS');
  const [ticketFechaInicio, setTicketFechaInicio] = useState(
    defaultTicketDateRange.start
  );
  const [ticketFechaFin, setTicketFechaFin] = useState(defaultTicketDateRange.end);
  const [ticketDetail, setTicketDetail] = useState<TicketSoporteCROV | null>(null);
  const [ticketDetailOpen, setTicketDetailOpen] = useState(false);
  const [dashboardFechaInicio, setDashboardFechaInicio] = useState(
    defaultTicketDateRange.start
  );
  const [dashboardFechaFin, setDashboardFechaFin] = useState(
    defaultTicketDateRange.end
  );

  const {
    startDate: dashboardFechaInicioDate,
    endDate: dashboardFechaFinDate,
    startTimestamp: dashboardStartTimestamp,
    endTimestamp: dashboardEndTimestamp,
    isValid: isDashboardRangeValid,
  } = useMemo(() => {
    const startDate = startOfDayFromInput(dashboardFechaInicio);
    const endDate = endOfDayFromInput(dashboardFechaFin);

    const startTimestamp = startDate?.getTime() ?? null;
    const endTimestamp = endDate?.getTime() ?? null;

    const isValid = !(
      startTimestamp !== null &&
      endTimestamp !== null &&
      startTimestamp > endTimestamp
    );

    return {
      startDate,
      endDate,
      startTimestamp,
      endTimestamp,
      isValid,
    };
  }, [dashboardFechaInicio, dashboardFechaFin]);

  const dashboardTickets = useMemo(() => {
    if (!isDashboardRangeValid) {
      return [] as TicketSoporteCROV[];
    }

    return tickets.filter((ticket) => {
      const registroDate = parseDateSafe(ticket.fecha_registro);
      if (!registroDate) {
        return false;
      }

      const time = registroDate.getTime();
      if (dashboardStartTimestamp !== null && time < dashboardStartTimestamp) {
        return false;
      }

      if (dashboardEndTimestamp !== null && time > dashboardEndTimestamp) {
        return false;
      }

      return true;
    });
  }, [
    tickets,
    dashboardStartTimestamp,
    dashboardEndTimestamp,
    isDashboardRangeValid,
  ]);

  const dashboardRangeLabel = useMemo(() => {
    if (!dashboardFechaInicioDate && !dashboardFechaFinDate) {
      return 'Todos los tickets';
    }

    const formatter = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const startLabel = dashboardFechaInicioDate
      ? formatter.format(dashboardFechaInicioDate)
      : '—';
    const endLabel = dashboardFechaFinDate
      ? formatter.format(dashboardFechaFinDate)
      : '—';

    return `${startLabel} - ${endLabel}`;
  }, [dashboardFechaInicioDate, dashboardFechaFinDate]);

  const dashboardStats = useMemo(() => {
    if (!isDashboardRangeValid) {
      return {
        totalTickets: 0,
        resolvedTickets: 0,
        resolvedWithDuration: 0,
        totalResponseMs: 0,
        averageResponseMs: null as number | null,
        statusData: [] as { label: string; value: number; color: string }[],
        priorityData: [] as { label: string; value: number; detail?: string }[],
      };
    }

    const statusCounts = new Map<EstadoSolicitudTicket, number>();
    ESTADO_SOLICITUD_VALUES.forEach((status) => statusCounts.set(status, 0));

    const priorityCounts = new Map<PrioridadTicket, number>();
    PRIORIDAD_VALUES.forEach((priority) => priorityCounts.set(priority, 0));

    let resolvedTicketsCount = 0;
    let resolvedWithDuration = 0;
    let totalResponseMs = 0;

    dashboardTickets.forEach((ticket) => {
      statusCounts.set(
        ticket.estado_solicitud,
        (statusCounts.get(ticket.estado_solicitud) ?? 0) + 1
      );

      priorityCounts.set(
        ticket.prioridad,
        (priorityCounts.get(ticket.prioridad) ?? 0) + 1
      );

      if (ticket.estado_solicitud === 'RESUELTO') {
        resolvedTicketsCount += 1;
        const durationMs = getTicketResponseDurationMs(ticket);
        if (durationMs !== null) {
          resolvedWithDuration += 1;
          totalResponseMs += durationMs;
        }
      }
    });

    const totalTickets = dashboardTickets.length;

    const statusData = ESTADO_SOLICITUD_VALUES.map((status) => ({
      label: estadoSolicitudLabels[status],
      value: statusCounts.get(status) ?? 0,
      color: estadoSolicitudChartColors[status],
    })).filter((item) => item.value > 0);

    const priorityData = PRIORIDAD_VALUES.map((priority) => {
      const value = priorityCounts.get(priority) ?? 0;
      return {
        label: prioridadLabels[priority],
        value,
        detail:
          totalTickets > 0 ? `${((value / totalTickets) * 100).toFixed(1)}%` : undefined,
      };
    }).filter((item) => item.value > 0);

    const averageResponseMs =
      resolvedWithDuration > 0 ? totalResponseMs / resolvedWithDuration : null;

    return {
      totalTickets,
      resolvedTickets: resolvedTicketsCount,
      resolvedWithDuration,
      totalResponseMs,
      averageResponseMs,
      statusData,
      priorityData,
    };
  }, [dashboardTickets, isDashboardRangeValid]);

  const nextTicketFolio = useMemo(() => {
    const highestNumber = tickets.reduce((max, ticket) => {
      const current = parseTicketFolioNumber(ticket.folio);
      if (current === null) {
        return max;
      }
      return current > max ? current : max;
    }, 0);

    const nextNumber = highestNumber > 0 ? highestNumber + 1 : 1;
    return formatTicketFolio(nextNumber);
  }, [tickets]);

  const tipoSistemaLabels = useMemo(
    () =>
      tipoSistemaOptions.reduce<Record<TipoSistema, string>>((acc, option) => {
        acc[option.value] = option.label;
        return acc;
      }, {} as Record<TipoSistema, string>),
    []
  );

  const ticketClienteMatches = useMemo(() => {
    if (!ticketClienteSearchActive) {
      return [];
    }

    const term = ticketClienteSearch.trim().toLowerCase();
    const digits = ticketClienteSearch.replace(/\D/g, '');

    if (term.length < 2 && digits.length < 3) {
      return [];
    }

    return clientes
      .filter((cliente) => {
        const nombreCliente = cliente.nombre_cliente.toLowerCase();
        const nombreNegocio = cliente.nombre_negocio.toLowerCase();
        const telefono = (cliente.telefono ?? '').toLowerCase();
        const telefonoDigits = (cliente.telefono ?? '').replace(/\D/g, '');

        return (
          nombreCliente.includes(term) ||
          nombreNegocio.includes(term) ||
          (telefono && telefono.includes(term)) ||
          (digits && telefonoDigits.includes(digits))
        );
      })
      .slice(0, 20);
  }, [clientes, ticketClienteSearch, ticketClienteSearchActive]);

  const handleTicketClienteSelect = useCallback(
    (cliente: ClienteCROV) => {
      setTicketForm((prev) => ({
        ...prev,
        nombre_cliente: cliente.nombre_cliente ?? '',
        nombre_negocio: cliente.nombre_negocio ?? '',
        correo: cliente.correo ?? '',
        telefono: cliente.telefono ?? '',
      }));

      const label = [cliente.nombre_cliente, cliente.nombre_negocio]
        .filter((value) => value && value.trim().length > 0)
        .join(' · ');

      setTicketClienteSearch(label);
      setTicketClienteSearchActive(false);
    },
    [setTicketClienteSearch, setTicketClienteSearchActive, setTicketForm]
  );

  const ticketClienteSearchTrimmed = ticketClienteSearch.trim();
  const ticketClienteSearchDigits = ticketClienteSearch.replace(/\D/g, '');
  const ticketClienteSearchHasEnoughInput =
    ticketClienteSearchTrimmed.length >= 2 || ticketClienteSearchDigits.length >= 3;

  const ticketClienteSelectedSummary = useMemo(() => {
    const parts = [ticketForm.nombre_cliente, ticketForm.nombre_negocio]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return parts.join(' · ');
  }, [ticketForm.nombre_cliente, ticketForm.nombre_negocio]);

  const fetchGiros = useCallback(async () => {
    if (!girosEndpoint || !token) {
      return;
    }

    setGirosLoading(true);
    setError(null);

    try {
      const res = await axios.get(girosEndpoint, {
        headers: authHeaders,
      });
      const payload = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
      const normalized = payload.map((item: any) => normalizeGiroComercial(item));
      setGiros(normalized);
    } catch (err) {
      console.error('Error al obtener giros comerciales', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudieron cargar los giros comerciales.';
      setError(message);
    } finally {
      setGirosLoading(false);
    }
  }, [girosEndpoint, token]);

  const fetchProspectos = useCallback(async () => {
    if (!prospectosEndpoint || !token) {
      return;
    }
    setProspectosLoading(true);
    setError(null);
    try {
      const res = await axios.get(prospectosEndpoint, {
        headers: authHeaders,
      });
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
      const normalized = data.map((item: any) => normalizeProspecto(item));
      setProspectos(normalized);
    } catch (err) {
      console.error('Error al obtener prospectos CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudieron cargar los prospectos CROV.';
      setError(message);
    } finally {
      setProspectosLoading(false);
    }
  }, [prospectosEndpoint, token]);

  const fetchMantenimientos = useCallback(async () => {
    if (!mantenimientosEndpoint || !token) {
      return;
    }
    setMantenimientosLoading(true);
    setError(null);
    try {
      const res = await axios.get(mantenimientosEndpoint, {
        headers: authHeaders,
      });
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
      const normalized = data.map((item: any) => normalizeMantenimiento(item));
      setMantenimientos(normalized);
    } catch (err) {
      console.error('Error al obtener mantenimientos de clientes CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudieron cargar los mantenimientos de clientes CROV.';
      setError(message);
    } finally {
      setMantenimientosLoading(false);
    }
  }, [mantenimientosEndpoint, token]);

  const fetchPlantillas = useCallback(async () => {
    if (!plantillasEndpoint || !token) {
      return;
    }

    setPlantillasLoading(true);
    setPlantillasError(null);

    try {
      const res = await axios.get(plantillasEndpoint, {
        headers: authHeaders,
      });
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
      const normalized = data
        .map((item: any) => normalizePlantilla(item))
        .filter((item): item is PlantillaCRM => item !== null);
      setPlantillas(normalized);
      setPlantillasLoaded(true);
    } catch (err) {
      console.error('Error al obtener plantillas de WhatsApp', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message || 'No se pudieron cargar las plantillas.';
      setPlantillasError(message);
      setPlantillasLoaded(false);
    } finally {
      setPlantillasLoading(false);
    }
  }, [plantillasEndpoint, token]);

  const fetchClientes = useCallback(async () => {
    if (!clientesEndpoint || !token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<ClienteCROV[]>(clientesEndpoint, {
        headers: authHeaders,
      });
      const payload = Array.isArray(res.data) ? res.data : [];
      setClientes(payload);
    } catch (err) {
      console.error('Error al obtener clientes CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudieron cargar los clientes CROV.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clientesEndpoint, token]);

  const fetchClienteLogo = useCallback(
    async (clienteId: number) => {
      if (!apiUrl || !token) {
        return;
      }

      setLogoLoading(true);
      setLogoError(null);
      try {
        const response = await fetch(
          `${apiUrl}/cliente-crov-logo/${clienteId}`,
          {
            headers: authHeaders,
          },
        );

        if (response.status === 404 || response.status === 204) {
          updateLogoPreview(null);
          return;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          let message = 'No se pudo obtener el logotipo del cliente.';
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              message =
                errorData?.mensaje ||
                errorData?.message ||
                errorData?.error ||
                message;
            } catch {
              message = errorText;
            }
          }
          setLogoError(message);
          updateLogoPreview(null);
          return;
        }

        const contentType = response.headers.get('content-type') ?? '';

        if (contentType.includes('application/json')) {
          const data = await response.json().catch(() => null);
          const url =
            typeof data?.url === 'string'
              ? data.url
              : typeof data?.imageUrl === 'string'
                ? data.imageUrl
                : typeof data?.logo === 'string'
                  ? data.logo
                  : null;
          updateLogoPreview(url);
          return;
        }

        if (contentType.startsWith('image/')) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          updateLogoPreview(objectUrl, { isBlob: true });
          return;
        }

        const text = (await response.text().catch(() => '')).trim();
        updateLogoPreview(text || null);
      } catch (error) {
        console.error('Error al obtener logotipo de cliente CROV', error);
        setLogoError('No se pudo obtener el logotipo del cliente.');
        updateLogoPreview(null);
      } finally {
        setLogoLoading(false);
      }
    },
    [apiUrl, token, updateLogoPreview],
  );

  const fetchEmpleados = useCallback(async () => {
    if (!empleadosEndpoint || !token) {
      return;
    }
    setEmpleadosLoading(true);
    setError(null);
    try {
      const res = await axios.get(empleadosEndpoint, {
        headers: authHeaders,
      });
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
      const normalized = data.map((item: any) => normalizeEmpleado(item));
      setEmpleados(normalized);
    } catch (err) {
      console.error('Error al obtener empleados CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudieron cargar los empleados CROV.';
      setError(message);
    } finally {
      setEmpleadosLoading(false);
    }
  }, [empleadosEndpoint, token]);

  const fetchTickets = useCallback(async () => {
    if (!ticketsEndpoint || !token) {
      return;
    }
    setTicketsLoading(true);
    setError(null);
    try {
      const res = await axios.get(ticketsEndpoint, {
        headers: authHeaders,
      });
      const payload = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.tickets)
          ? res.data.tickets
          : [];
      const normalized = payload.map((item: any) => normalizeTicket(item));
      setTickets(normalized);
    } catch (err) {
      console.error('Error al obtener tickets de soporte CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudieron cargar los tickets de soporte CROV.';
      setError(message);
    } finally {
      setTicketsLoading(false);
    }
  }, [ticketsEndpoint, token]);

  const fetchSistemas = useCallback(async () => {
    if (!sistemasEndpoint || !token) {
      return;
    }

    setSistemasLoading(true);
    setError(null);

    try {
      const res = await axios.get(sistemasEndpoint, {
        headers: authHeaders,
      });
      const payload = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];

      const normalized = payload.map((item: any) => normalizeSistemaCrov(item));
      setSistemas(normalized);
    } catch (err) {
      console.error('Error al obtener sistemas CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message || 'No se pudieron cargar los sistemas CROV.';
      setError(message);
    } finally {
      setSistemasLoading(false);
    }
  }, [sistemasEndpoint, token]);

  const fetchHistorialMiAhorro = useCallback(async () => {
    if (!token) {
      return;
    }

    const internalUserId = localStorage.getItem('internalUserId') ?? '';

    setLoadingHistorialMisAhorros(true);
    setErrorHistorialMisAhorros(null);
    try {
      const res = await axios.get(`${apiUrl}/crovinternal/historial-ahorros/${internalUserId}/mi-ahorro`,
        {headers: authHeaders}
      );

      setHistorialMisAhorros(res.data);

    } catch(error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message =
      axiosError.response?.data?.message || 'No se pudo obtener el historial de mi ahorro.';
      setHistorialMisAhorros(null);
      setErrorHistorialMisAhorros(message);
    } finally {
      setLoadingHistorialMisAhorros(false);
    }
  }, [token]);

  const fetchHistorialAhorros = useCallback(async () => {
    if (!historicoAhorrosEmpleadosEndpoint || !token) {
      return;
    }

    setHistorialAhorrosLoading(true);
    setError(null);

    try {
      const res = await axios.get(historicoAhorrosEmpleadosEndpoint, {
        headers: authHeaders,
      });
      let payload = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
      setHistorialAhorros(payload);
      setRefreshTotalAhorrosTrigger(prev => prev + 1); // recarga la tarjeta de total
    } catch (err) {
      console.error('Error al obtener el historial de ahorros', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message || 'No se pudieron cargar los ahorros CROV.';
      setError(message);
    } finally {
      setHistorialAhorrosLoading(false);
    }
  }, [sistemasEndpoint, token]);

  useEffect(() => {
    fetchHistorialMiAhorro();
  }, [fetchHistorialMiAhorro]);

  useEffect(() => {
    fetchGiros();
  }, [fetchGiros]);

  useEffect(() => {
    fetchProspectos();
  }, [fetchProspectos]);

  useEffect(() => {
    fetchMantenimientos();
  }, [fetchMantenimientos]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchSistemas();
  }, [fetchSistemas]);

  useEffect(() => {
    fetchHistorialAhorros();
  }, [fetchHistorialAhorros]);

  useEffect(() => {
    return () => {
      revokeLogoObjectUrl();
    };
  }, [revokeLogoObjectUrl]);

  useEffect(() => {
    if (!logoDialogOpen || !logoCliente) {
      return;
    }

    if (logoCliente.logo) {
      void fetchClienteLogo(logoCliente.id);
    } else {
      updateLogoPreview(null);
    }
  }, [fetchClienteLogo, logoCliente, logoDialogOpen, updateLogoPreview]);

  useEffect(() => {
    if (logoDialogOpen) {
      return;
    }

    const timeout = setTimeout(() => {
      setLogoCliente(null);
      updateLogoPreview(null);
      setLogoFile(null);
      setLogoError(null);
      setLogoLoading(false);
      setLogoUploading(false);
      setLogoInputKey((prev) => prev + 1);
      setLogoSelectedPreview((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    }, 150);

    return () => clearTimeout(timeout);
  }, [logoDialogOpen, updateLogoPreview]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (!giroDialogOpen) {
      setTimeout(() => {
        setEditingGiro(null);
        setGiroForm(defaultGiroForm);
      }, 150);
    }
  }, [giroDialogOpen]);

  useEffect(() => {
    if (!dialogOpen) {
      setTimeout(() => {
        setEditingCliente(null);
        setForm(defaultForm);
      }, 150);
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (!supportDialogOpen) {
      setTimeout(() => {
        setSupportCliente(null);
        setSupportDate('');
      }, 150);
    }
  }, [supportDialogOpen]);

  useEffect(() => {
    if (!mapDialogOpen) {
      setTimeout(() => {
        setMapCliente(null);
        setMapCoordinates(null);
      }, 150);
    }
  }, [mapDialogOpen]);

  useEffect(() => {
    if (!prospectoDialogOpen) {
      setTimeout(() => {
        setEditingProspecto(null);
        setProspectoForm(defaultProspectoForm);
        setProspectoClienteFilter('');
      }, 150);
    }
  }, [prospectoDialogOpen]);

  useEffect(() => {
    if (!empleadoDialogOpen) {
      setTimeout(() => {
        setEditingEmpleado(null);
        setEmpleadoForm(defaultEmpleadoForm);
      }, 150);
    }
  }, [empleadoDialogOpen]);

  useEffect(() => {
    if (!ticketDialogOpen) {
      setTimeout(() => {
        setEditingTicket(null);
        setTicketForm(defaultTicketForm);
      }, 150);
    }
  }, [ticketDialogOpen]);

  useEffect(() => {
    if (!ticketDetailOpen) {
      setTimeout(() => {
        setTicketDetail(null);
      }, 150);
    }
  }, [ticketDetailOpen]);

  useEffect(() => {
    if (!whatsappDialogOpen) {
      setTimeout(() => {
        setWhatsappTargets([]);
        setSelectedPlantillaId('');
        setWhatsappError(null);
      }, 150);
    }
  }, [whatsappDialogOpen]);

  useEffect(() => {
    if (!whatsappDialogOpen) {
      return;
    }
    if (plantillasLoaded || plantillasLoading) {
      return;
    }
    void fetchPlantillas();
  }, [whatsappDialogOpen, plantillasLoaded, plantillasLoading, fetchPlantillas]);

  useEffect(() => {
    if (!whatsappDialogOpen) {
      return;
    }
    if (activePlantillas.length === 0) {
      setSelectedPlantillaId('');
      return;
    }

    setSelectedPlantillaId((prev) => {
      if (prev && activePlantillas.some((plantilla) => plantilla.id === prev)) {
        return prev;
      }
      return activePlantillas[0].id;
    });
  }, [activePlantillas, whatsappDialogOpen]);

  useEffect(() => {
    if (!empleadoForm.residente && empleadoForm.proyectoResidencia !== null) {
      updateEmpleadoFormField('proyectoResidencia', null);
    }
  }, [empleadoForm.residente]);

  // useEffect que trae info sobre el total de ahorros, en el apartado del historial de ahorros, esa 
  // info se muestra en el card que esta arriba de la barra de busqueda por empleado
  useEffect(() => {
      // Fuente de cancelación para Axios
      const source = axios.CancelToken.source();
  
      const fetchTotalAhorrosGeneralOPorEmpleado = async () => {
        setLoadingTotalAhorrosGeneralOPorEmpleado(true);
        try {
          const response = await axios.get(
            `${historicoAhorrosEmpleadosEndpoint}/total-ahorros`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: { 
                q: historialAhorrosSearch || undefined 
              },
              cancelToken: source.token,
            }
          );
  
          const { total, titulo } = response.data; 
  
          setTotalAhorrosGeneralOPorEmpleado({
            total: total || 0, 
            label: titulo || "Total acumulado",
          });
  
        } catch (error) {
          if (!axios.isCancel(error)) {
            console.error("Error fetching total:", error);
            setTotalAhorrosGeneralOPorEmpleado({
               total: 0,
               label: "Error al obtener total de ahorros" 
            });
          }
        } finally {
          // Solo quitamos el loading si no se canceló la petición
          if (!axios.isCancel(source.token)) {
            setLoadingTotalAhorrosGeneralOPorEmpleado(false);
          }
        }
      };
  
      // Debounce de 500ms
      const timeoutId = setTimeout(() => {
        fetchTotalAhorrosGeneralOPorEmpleado();
      }, 500);
  
      // Cleanup: Limpiar timeout y cancelar petición anterior
      return () => {
        clearTimeout(timeoutId);
        source.cancel("Nueva búsqueda iniciada");
      };
    }, [historialAhorrosSearch, token, refreshTotalAhorrosTrigger]);


  const handleMantenimientoCreate = () => {
    setSuccessMessage(null);
    setEditingMantenimiento(null);
    setMantenimientoForm(defaultMantenimientoForm);
    setMantenimientoClienteFilter('');
    setMantenimientoDialogOpen(true);
  };

  const handleMantenimientoEdit = (mantenimiento: MantenimientoClienteCROV) => {
    setSuccessMessage(null);
    setEditingMantenimiento(mantenimiento);
    setMantenimientoForm({
      id_cliente_crov:
        mantenimiento.id_cliente_crov !== null
          ? String(mantenimiento.id_cliente_crov)
          : '',
      fecha_mantenimiento: toInputDate(mantenimiento.fecha_mantenimiento),
      fecha_proximo_mantenimiento: toInputDate(
        mantenimiento.fecha_proximo_mantenimiento
      ),
      comentarios: mantenimiento.comentarios ?? '',
      activo: mantenimiento.activo !== 0,
    });
    setMantenimientoClienteFilter('');
    setMantenimientoDialogOpen(true);
  };

  const updateMantenimientoFormField = <Key extends keyof MantenimientoForm>(
    key: Key,
    value: MantenimientoForm[Key]
  ) => {
    setMantenimientoForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleMantenimientoDelete = async (
    mantenimiento: MantenimientoClienteCROV
  ) => {
    if (!mantenimientosEndpoint || !token) {
      return;
    }

    setSuccessMessage(null);
    setError(null);
    setMantenimientoDeletingId(mantenimiento.id);

    try {
      await axios.delete(`${mantenimientosEndpoint}/${mantenimiento.id}`, {
        headers: authHeaders,
      });
      setSuccessMessage('Mantenimiento eliminado correctamente.');
      await fetchMantenimientos();
    } catch (err) {
      console.error('Error al eliminar mantenimiento CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudo eliminar el mantenimiento seleccionado.';
      setError(message);
    } finally {
      setMantenimientoDeletingId(null);
    }
  };

  const handleMantenimientoSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!mantenimientosEndpoint || !token) {
      return;
    }

    const payload = mapMantenimientoFormToPayload(mantenimientoForm);

    if (!payload.id_cliente_crov) {
      setError('Selecciona un cliente CROV válido.');
      return;
    }

    if (!payload.fecha_mantenimiento) {
      setError('Completa la fecha del mantenimiento.');
      return;
    }

    setMantenimientosSaving(true);
    setSuccessMessage(null);
    setError(null);

    try {
      if (editingMantenimiento) {
        await axios.put(`${mantenimientosEndpoint}/${editingMantenimiento.id}`, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Mantenimiento actualizado correctamente.');
      } else {
        await axios.post(mantenimientosEndpoint, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Mantenimiento creado correctamente.');
      }

      setMantenimientoDialogOpen(false);
      setEditingMantenimiento(null);
      setMantenimientoForm(defaultMantenimientoForm);
      setMantenimientoClienteFilter('');
      await fetchMantenimientos();
    } catch (err) {
      console.error('Error al guardar mantenimiento CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudo guardar el mantenimiento del cliente CROV.';
      setError(message);
    } finally {
      setMantenimientosSaving(false);
    }
  };

  const handleProspectoCreate = () => {
    setSuccessMessage(null);
    setEditingProspecto(null);
    setProspectoForm(defaultProspectoForm);
    setProspectoClienteFilter('');
    setProspectoDialogOpen(true);
  };

  const handleProspectoEdit = (prospecto: ProspectoCROV) => {
    setSuccessMessage(null);
    setEditingProspecto(prospecto);
    setProspectoForm({
      nombre: prospecto.nombre ?? '',
      telefono: prospecto.telefono ?? '',
      correo: prospecto.correo ?? '',
      interes: prospecto.interes ?? '',
      id_cliente_crov: prospecto.id_cliente_crov
        ? String(prospecto.id_cliente_crov)
        : '',
      nombre_negocio: prospecto.nombre_negocio ?? '',
      direccion_negocio: prospecto.direccion_negocio ?? '',
    });
    setProspectoClienteFilter('');
    setProspectoDialogOpen(true);
  };

  const handleProspectoWhatsapp = (prospecto: ProspectoCROV) => {
    setWhatsappError(null);
    setPlantillasError(null);
    setWhatsappTargets([prospecto]);
    setWhatsappDialogOpen(true);
  };

  const handleProspectosWhatsappMass = () => {
    if (selectedProspectosList.length === 0) {
      return;
    }

    setWhatsappError(null);
    setPlantillasError(null);
    setWhatsappTargets(selectedProspectosList);
    setWhatsappDialogOpen(true);
  };

  const toggleProspectoSelection = useCallback(
    (prospectoId: number, checked: boolean) => {
      setSelectedProspectoIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(prospectoId);
        } else {
          next.delete(prospectoId);
        }
        return next;
      });
    },
    [],
  );

  const handleToggleAllProspectos = useCallback(
    (checked: boolean, prospectosToToggle: ProspectoCROV[]) => {
      setSelectedProspectoIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          prospectosToToggle.forEach((prospecto) => {
            next.add(prospecto.id);
          });
        } else {
          prospectosToToggle.forEach((prospecto) => {
            next.delete(prospecto.id);
          });
        }
        return next;
      });
    },
    [],
  );

  const updateProspectoFormField = <Key extends keyof ProspectoForm>(
    key: Key,
    value: ProspectoForm[Key]
  ) => {
    setProspectoForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleProspectoDelete = async (prospecto: ProspectoCROV) => {
    if (!prospectosEndpoint || !token) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el prospecto "${prospecto.nombre}"?`
    );
    if (!confirmed) {
      return;
    }

    setProspectoDeletingId(prospecto.id);
    setError(null);
    setSuccessMessage(null);

    try {
      await axios.delete(`${prospectosEndpoint}/${prospecto.id}`, {
        headers: authHeaders,
      });
      setProspectos((prev) => prev.filter((item) => item.id !== prospecto.id));
      setSuccessMessage('Prospecto CROV eliminado correctamente.');
    } catch (err) {
      console.error('Error al eliminar prospecto CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudo eliminar el prospecto CROV.';
      setError(message);
    } finally {
      setProspectoDeletingId(null);
    }
  };

  const handleWhatsappSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (totalWhatsappTargets === 0) {
      return;
    }

    if (!selectedPlantilla) {
      setWhatsappError('Selecciona una plantilla para continuar.');
      return;
    }

    const mensaje = normalizeUnicodeText(selectedPlantilla.mensaje?.trim() ?? '');
    if (!mensaje) {
      setWhatsappError('La plantilla seleccionada no tiene mensaje configurado.');
      return;
    }

    if (!hasValidWhatsappTarget) {
      setWhatsappError(
        'Ninguno de los prospectos seleccionados cuenta con un número de teléfono válido.',
      );
      return;
    }

    const encodedMensaje = encodeURIComponent(mensaje);
    const [firstTarget, ...remainingTargets] = validWhatsappTargets;
    const whatsappDesktopUrl = `whatsapp://send?phone=${firstTarget.sanitized}&text=${encodedMensaje}`;
    const whatsappWebUrl = `https://api.whatsapp.com/send?phone=${firstTarget.sanitized}&text=${encodedMensaje}`;

    let popup: Window | null = null;
    try {
      popup = window.open(whatsappDesktopUrl, '_blank');
    } catch (err) {
      console.error('No se pudo abrir WhatsApp de escritorio', err);
      popup = null;
    }

    if (!popup) {
      window.open(whatsappWebUrl, '_blank', 'noopener,noreferrer');
    } else {
      const fallbackTimer = window.setTimeout(() => {
        try {
          if (!popup || popup.closed) {
            window.open(whatsappWebUrl, '_blank', 'noopener,noreferrer');
            return;
          }

          popup.location.href = whatsappWebUrl;
        } catch (err) {
          console.error('No se pudo redirigir a WhatsApp Web', err);
          window.open(whatsappWebUrl, '_blank', 'noopener,noreferrer');
        }
      }, 600);

      popup.addEventListener('close', () => {
        window.clearTimeout(fallbackTimer);
      });
    }

    remainingTargets.forEach((target, index) => {
      window.setTimeout(() => {
        window.open(
          `https://api.whatsapp.com/send?phone=${target.sanitized}&text=${encodedMensaje}`,
          '_blank',
          'noopener,noreferrer',
        );
      }, (index + 1) * 200);
    });

    setWhatsappError(null);
    setSendingWhatsapp(true);

    try {
      if (prospectosEndpoint && token) {
        const results = await Promise.allSettled(
          validWhatsappTargets.map((target) =>
            axios.post(
              `${prospectosEndpoint}/${target.prospecto.id}/ultima-notificacion`,
              null,
              {
                headers: authHeaders,
              }
            )
          )
        );

        const nowIso = new Date().toISOString();
        const successIds: number[] = [];
        let failedCount = 0;

        results.forEach((result, index) => {
          const target = validWhatsappTargets[index];
          if (result.status === 'fulfilled') {
            successIds.push(target.prospecto.id);
          } else {
            failedCount += 1;
            console.error(
              'Error al registrar la última notificación del prospecto',
              target.prospecto.id,
              result.reason,
            );
          }
        });

        if (successIds.length > 0) {
          setProspectos((prev) =>
            prev.map((item) =>
              successIds.includes(item.id)
                ? { ...item, ultima_notificacion: nowIso }
                : item
            )
          );
        }

        if (failedCount > 0) {
          setWhatsappError(
            failedCount === validWhatsappTargets.length
              ? 'El mensaje se abrió en WhatsApp, pero no se pudo registrar la última notificación de los prospectos seleccionados. Intenta nuevamente.'
              : 'El mensaje se abrió en WhatsApp, pero no se pudo registrar la última notificación de algunos prospectos seleccionados. Intenta nuevamente.'
          );
          return;
        }
      }

      setWhatsappDialogOpen(false);
      setSelectedProspectoIds((prev) => {
        if (validWhatsappTargets.length === 0) {
          return prev;
        }

        const next = new Set(prev);
        validWhatsappTargets.forEach((target) => {
          next.delete(target.prospecto.id);
        });
        return next;
      });
    } catch (err) {
      console.error('Error al registrar la última notificación del prospecto', err);
      setWhatsappError(
        'El mensaje se abrió en WhatsApp, pero no se pudo registrar la última notificación. Intenta nuevamente.'
      );
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const handleProspectoSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!prospectosEndpoint || !token) {
      return;
    }

    setProspectosSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload = mapProspectoFormToPayload(prospectoForm);

    try {
      if (editingProspecto) {
        await axios.put(`${prospectosEndpoint}/${editingProspecto.id}`, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Prospecto CROV actualizado correctamente.');
      } else {
        await axios.post(prospectosEndpoint, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Prospecto CROV creado correctamente.');
      }
      setProspectoDialogOpen(false);
      await fetchProspectos();
    } catch (err) {
      console.error('Error al guardar prospecto CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'Ocurrió un error al guardar el prospecto CROV.';
      setError(message);
    } finally {
      setProspectosSaving(false);
    }
  };

  const handleGiroCreate = () => {
    setSuccessMessage(null);
    setEditingGiro(null);
    setGiroForm(defaultGiroForm);
    setGiroDialogOpen(true);
  };

  const handleSistemaCreate = () => {
    setSuccessMessage(null);
    setEditingSistema(null);
    setSistemaForm(defaultSistemaForm);
    setSistemaDialogOpen(true);
  };

  const handleGiroEdit = (giro: GiroComercial) => {
    setSuccessMessage(null);
    setEditingGiro(giro);
    setGiroForm({
      nombre: giro.nombre ?? '',
    });
    setGiroDialogOpen(true);
  };

  const handleSistemaEdit = (sistema: SistemaCrov) => {
    setSuccessMessage(null);
    setEditingSistema(sistema);
    const activoValue =
      sistema.activo === true ||
      sistema.activo === 1 ||
      (typeof sistema.activo === 'string' && sistema.activo === '1');
    setSistemaForm({
      nombre: sistema.nombre ?? '',
      activo: activoValue,
    });
    setSistemaDialogOpen(true);
  };

  const handleGiroDelete = async (giro: GiroComercial) => {
    if (!girosEndpoint || !token) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el giro comercial "${giro.nombre}"?`
    );
    if (!confirmed) {
      return;
    }

    setGiroDeletingId(giro.id);
    setError(null);
    setSuccessMessage(null);

    try {
      await axios.delete(`${girosEndpoint}/${giro.id}`, {
        headers: authHeaders,
      });
      setGiros((prev) => prev.filter((item) => item.id !== giro.id));
      setSuccessMessage('Giro comercial eliminado correctamente.');
    } catch (err) {
      console.error('Error al eliminar giro comercial', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudo eliminar el giro comercial.';
      setError(message);
    } finally {
      setGiroDeletingId(null);
    }
  };

  const handleSistemaDelete = async (sistema: SistemaCrov) => {
    if (!sistemasEndpoint || !token) {
      return;
    }

    const confirmed = window.confirm(`¿Eliminar el sistema "${sistema.nombre}"?`);
    if (!confirmed) {
      return;
    }

    setSistemaDeletingId(sistema.id);
    setError(null);
    setSuccessMessage(null);

    try {
      await axios.delete(`${sistemasEndpoint}/${sistema.id}`, {
        headers: authHeaders,
      });
      setSistemas((prev) => prev.filter((item) => item.id !== sistema.id));
      setSuccessMessage('Sistema CROV eliminado correctamente.');
    } catch (err) {
      console.error('Error al eliminar sistema CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message || 'No se pudo eliminar el sistema CROV.';
      setError(message);
    } finally {
      setSistemaDeletingId(null);
    }
  };

  const handleGiroSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!girosEndpoint || !token) {
      return;
    }

    setGirosSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload = mapGiroFormToPayload(giroForm);

    try {
      if (editingGiro) {
        await axios.put(`${girosEndpoint}/${editingGiro.id}`, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Giro comercial actualizado correctamente.');
      } else {
        await axios.post(girosEndpoint, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Giro comercial creado correctamente.');
      }
      setGiroDialogOpen(false);
      await fetchGiros();
    } catch (err) {
      console.error('Error al guardar giro comercial', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'Ocurrió un error al guardar el giro comercial.';
      setError(message);
    } finally {
      setGirosSaving(false);
    }
  };

  const handleSistemaSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sistemasEndpoint || !token) {
      return;
    }

    setSistemasSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload = mapSistemaFormToPayload(sistemaForm, editingSistema);

    try {
      if (editingSistema) {
        await axios.put(`${sistemasEndpoint}/${editingSistema.id}`, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Sistema CROV actualizado correctamente.');
      } else {
        await axios.post(sistemasEndpoint, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Sistema CROV creado correctamente.');
      }
      setSistemaDialogOpen(false);
      await fetchSistemas();
    } catch (err) {
      console.error('Error al guardar sistema CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message || 'Ocurrió un error al guardar el sistema CROV.';
      setError(message);
    } finally {
      setSistemasSaving(false);
    }
  };

  const updateGiroFormField = <Key extends keyof GiroComercialForm>(
    key: Key,
    value: GiroComercialForm[Key]
  ) => {
    setGiroForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateSistemaFormField = <Key extends keyof SistemaCrovForm>(
    key: Key,
    value: SistemaCrovForm[Key]
  ) => {
    setSistemaForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCreate = () => {
    setSuccessMessage(null);
    setEditingCliente(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const handleLogo = (cliente: ClienteCROV) => {
    setSuccessMessage(null);
    setLogoCliente(cliente);
    setLogoDialogOpen(true);
    setLogoError(null);
    setLogoFile(null);
    setLogoSelectedPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  };

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setLogoFile(null);
      setLogoSelectedPreview((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      return;
    }

    if (!CLIENT_LOGO_ALLOWED_MIME_TYPES.includes(file.type)) {
      setLogoError('Solo se permiten imágenes PNG, JPG/JPEG o WEBP.');
      setLogoFile(null);
      setLogoSelectedPreview((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setLogoInputKey((prev) => prev + 1);
      return;
    }

    if (file.size > CLIENT_LOGO_MAX_BYTES) {
      setLogoError('El archivo supera el límite de 10 MB.');
      setLogoFile(null);
      setLogoSelectedPreview((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setLogoInputKey((prev) => prev + 1);
      return;
    }

    setLogoFile(file);
    setLogoSelectedPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  };

  const handleLogoUpload = async () => {
    if (!logoCliente) {
      setLogoError('Selecciona un cliente válido.');
      return;
    }

    if (!apiUrl || !token) {
      setLogoError(
        'No se encontró la configuración de la API o tu sesión expiró. Intenta iniciar sesión nuevamente.',
      );
      return;
    }

    if (!logoFile) {
      setLogoError('Selecciona un archivo de imagen para subir.');
      return;
    }

    if (!CLIENT_LOGO_ALLOWED_MIME_TYPES.includes(logoFile.type)) {
      setLogoError('Solo se permiten imágenes PNG, JPG/JPEG o WEBP.');
      return;
    }

    if (logoFile.size > CLIENT_LOGO_MAX_BYTES) {
      setLogoError('El archivo supera el límite de 10 MB.');
      return;
    }

    setLogoUploading(true);
    setLogoError(null);

    try {
      const headers =
        getInternalAuthHeaders(token, {
          'Content-Type': 'application/json',
        }) ?? { 'Content-Type': 'application/json' };

      const presignRes = await fetch(`${apiUrl}/uploadsRoutes/presigned-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clienteCrovId: logoCliente.id,
          contentType: logoFile.type || 'application/octet-stream',
          fileName: logoFile.name,
          fileSize: logoFile.size,
        }),
      });

      const presignData = await presignRes.json().catch(() => null);
      if (!presignRes.ok || !presignData) {
        const message =
          presignData?.mensaje ||
          presignData?.message ||
          'No se pudo preparar la subida del logotipo.';
        setLogoError(message);
        return;
      }

      const { url, fields, key } = presignData as {
        url: string;
        fields?: Record<string, string>;
        key: string;
      };

      if (!url || !key) {
        setLogoError('No se pudo preparar la subida del logotipo.');
        return;
      }

      const uploadForm = new FormData();
      Object.entries(fields || {}).forEach(([fieldKey, fieldValue]) => {
        uploadForm.append(fieldKey, fieldValue);
      });

      if (!(fields && 'Content-Type' in fields)) {
        uploadForm.append(
          'Content-Type',
          logoFile.type || 'application/octet-stream',
        );
      }
      uploadForm.append('file', logoFile);

      const uploadRes = await fetch(url, { method: 'POST', body: uploadForm });
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text().catch(() => '');
        console.error('Error al subir logotipo a S3', uploadRes.status, errorText);
        setLogoError('No se pudo subir el logotipo. Intenta nuevamente.');
        return;
      }

      const confirmRes = await fetch(`${apiUrl}/uploadsRoutes/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ clienteCrovId: logoCliente.id, key }),
      });

      const confirmData = await confirmRes.json().catch(() => null);
      if (!confirmRes.ok || !confirmData) {
        const message =
          confirmData?.mensaje ||
          confirmData?.message ||
          'No se pudo confirmar la subida del logotipo.';
        setLogoError(message);
        return;
      }

      const confirmedKey =
        typeof confirmData?.key === 'string' && confirmData.key.length > 0
          ? confirmData.key
          : key;
      const updatedLogo = confirmData?.cliente?.logo ?? confirmedKey ?? null;

      setSuccessMessage('Logotipo del cliente CROV actualizado correctamente.');
      setClientes((prev) =>
        prev.map((item) =>
          item.id === logoCliente.id
            ? {
                ...item,
                logo: updatedLogo,
              }
            : item,
        ),
      );
      setLogoCliente((prev) =>
        prev && prev.id === logoCliente.id ? { ...prev, logo: updatedLogo } : prev,
      );
      setLogoFile(null);
      setLogoSelectedPreview((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setLogoInputKey((prev) => prev + 1);
      await fetchClienteLogo(logoCliente.id);
    } catch (error) {
      console.error('Error al subir logotipo de cliente CROV', error);
      setLogoError('Error al subir el logotipo. Intenta nuevamente.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleEdit = (cliente: ClienteCROV) => {
    setSuccessMessage(null);
    setEditingCliente(cliente);
    setForm({
      nombre_cliente: cliente.nombre_cliente ?? '',
      nombre_negocio: cliente.nombre_negocio ?? '',
      direccion: cliente.direccion ?? '',
      telefono: cliente.telefono ?? '',
      correo: cliente.correo ?? '',
      tipo_sistema: cliente.tipo_sistema,
      fecha_instalacion: toInputDate(cliente.fecha_instalacion),
      fecha_fin_soporte: toInputDate(cliente.fecha_fin_soporte),
      id_giro_comercial: (() => {
        const giroId = getClienteGiroId(cliente);
        return giroId ? String(giroId) : '';
      })(),
      latitud: toCoordinateInputValue(cliente.latitud),
      longitud: toCoordinateInputValue(cliente.longitud),
    });
    setDialogOpen(true);
  };

  const handleSupport = (cliente: ClienteCROV) => {
    setSuccessMessage(null);
    setSupportCliente(cliente);
    setSupportDate(toInputDate(cliente.fecha_fin_soporte));
    setSupportDialogOpen(true);
  };

  const handleViewMap = (cliente: ClienteCROV) => {
    setSuccessMessage(null);
    setMapCliente(cliente);
    const lat = toCoordinateNumber(cliente.latitud);
    const lng = toCoordinateNumber(cliente.longitud);
    if (lat !== null && lng !== null) {
      setMapCoordinates({ lat, lng });
    } else {
      setMapCoordinates(null);
    }
    setMapDialogOpen(true);
  };

  const handleDelete = async (cliente: ClienteCROV) => {
    if (!clientesEndpoint || !token) {
      return;
    }
    const confirmed = window.confirm(
      `¿Eliminar el cliente "${cliente.nombre_cliente}"?`
    );
    if (!confirmed) return;
    setDeletingId(cliente.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await axios.delete(`${clientesEndpoint}/${cliente.id}`, {
        headers: authHeaders,
      });
      setClientes((prev) => prev.filter((item) => item.id !== cliente.id));
      setSuccessMessage('Cliente CROV eliminado correctamente.');
    } catch (err) {
      console.error('Error al eliminar cliente CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudo eliminar el cliente CROV.';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAhorroEmpleado = async (ahorro: AhorroEmpleado) => {
    if (!historicoAhorrosEmpleadosEndpoint || !token) {
      return;
    }
    const confirmed = window.confirm(
      `¿Eliminar el ahorro del empleado "${ahorro.empleado.nombre_completo}", con un monto de $ ${ahorro.monto}, del dia ${formatDisplayDate(ahorro.fecha)}?`
    );
    if (!confirmed) return;
    try {
      setDeletingAhorroEmpleado(true);
      await axios.delete(`${historicoAhorrosEmpleadosEndpoint}/${ahorro.id}`, {
        headers: authHeaders,
      });
      await fetchHistorialAhorros();
    } catch (err) {
      console.error('Error al eliminar ahorro de empleado', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudo eliminar el cliente CROV.';
      setError(message);
    } finally {
      setDeletingAhorroEmpleado(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientesEndpoint || !token) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    const payload = mapFormToPayload(form);

    try {
      if (editingCliente) {
        await axios.put(`${clientesEndpoint}/${editingCliente.id}`, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Cliente CROV actualizado correctamente.');
      } else {
        await axios.post(clientesEndpoint, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Cliente CROV creado correctamente.');
      }
      setDialogOpen(false);
      await fetchClientes();
    } catch (err) {
      console.error('Error al guardar cliente CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'Ocurrió un error al guardar el cliente CROV.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const updateFormField = <Key extends keyof ClienteForm>(
    key: Key,
    value: ClienteForm[Key]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSupportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientesEndpoint || !token || !supportCliente) {
      return;
    }

    setSupportSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await axios.patch(
        `${clientesEndpoint}/${supportCliente.id}/fecha-fin-soporte`,
        {
          fecha_fin_soporte: toDateOnlyISOString(supportDate),
        },
        {
          headers: authHeaders,
        }
      );
      setSupportDialogOpen(false);
      await fetchClientes();
      setSuccessMessage('Fecha de fin de soporte actualizada correctamente.');
    } catch (err) {
      console.error('Error al actualizar la fecha de soporte CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'Ocurrió un error al actualizar la fecha de soporte.';
      setError(message);
    } finally {
      setSupportSaving(false);
    }
  };

  const handleEmpleadoCreate = () => {
    setSuccessMessage(null);
    setEditingEmpleado(null);
    setEmpleadoForm(defaultEmpleadoForm);
    setEmpleadoDialogOpen(true);
  };

  const handleEmpleadoEdit = async (empleado: EmpleadoCROV) => {
    setSuccessMessage(null);
    setEditingEmpleado(empleado);
    setEmpleadoForm({
      nombreCompleto: empleado.nombreCompleto ?? '',
      puesto: empleado.puesto ?? EMPLEADO_PUESTO_EMPTY_VALUE,
      celular: empleado.celular ?? '',
      correo: empleado.correo ?? '',
      password: '',
      fechaNacimiento: empleado.fechaNacimiento ? toInputDate(empleado.fechaNacimiento) : '',
      totalAhorro: empleado.totalAhorro ?? 0,
      residente: empleado.residente === 1,
      proyectoResidencia: empleado.proyectoResidencia ?? null,
      activo: typeof empleado.activo === 'number' ? empleado.activo : 1,
      montoAhorro: empleado.montoAhorro ?? 0,
      dias_vacaciones: empleado.dias_vacaciones ?? 0,
    });
    setEmpleadoDialogOpen(true);
  };

  const fetchEmpleadoPermisos = async (empleadoId: number) => {
    if (!permisosInternalEndpoint || !token) {
      return;
    }
    setPermisosLoading(true);
    setPermisosError(null);

    try {
      const [todosResponse, asignadosResponse] = await Promise.all([
        axios.get(permisosInternalEndpoint, { headers: authHeaders }),
        axios.get(`${permisosInternalEndpoint}/${empleadoId}`, { headers: authHeaders }),
      ]);

      const todosRaw = Array.isArray(todosResponse.data) ? todosResponse.data : [];
      const asignadosRaw = Array.isArray(asignadosResponse.data)
        ? asignadosResponse.data
        : [];

      const todos = todosRaw
        .map((permiso: any) => normalizePermisoInternal(permiso))
        .filter((permiso: PermisoInternal) => permiso.id && permiso.nombre);
      const asignados = asignadosRaw
        .map((permiso: any) => normalizePermisoInternal(permiso))
        .filter((permiso: PermisoInternal) => permiso.id && permiso.nombre);

      const asignadosIds = new Set(asignados.map((permiso) => permiso.id));
      setPermisosAsignados(asignados);
      setPermisosDisponibles(todos.filter((permiso) => !asignadosIds.has(permiso.id)));
    } catch (err) {
      console.error('Error al cargar permisos del empleado CROV', err);
      setPermisosError('No se pudieron cargar los permisos del empleado.');
    } finally {
      setPermisosLoading(false);
    }
  };

  const openEmpleadoPermisos = async (empleado: EmpleadoCROV) => {
    setEmpleadoPermisos(empleado);
    setSelectedPermisosDisponibles([]);
    setSelectedPermisosAsignados([]);
    setPermisosError(null);
    setEmpleadoPermisosOpen(true);
    await fetchEmpleadoPermisos(empleado.id);
  };

  const togglePermisoDisponible = (permiso: PermisoInternal) => {
    setSelectedPermisosDisponibles((prev) =>
      prev.some((item) => item.id === permiso.id)
        ? prev.filter((item) => item.id !== permiso.id)
        : [...prev, permiso]
    );
  };

  const togglePermisoAsignado = (permiso: PermisoInternal) => {
    setSelectedPermisosAsignados((prev) =>
      prev.some((item) => item.id === permiso.id)
        ? prev.filter((item) => item.id !== permiso.id)
        : [...prev, permiso]
    );
  };

  const asignarPermisosEmpleado = async () => {
    if (
      !permisosInternalEndpoint ||
      !token ||
      !empleadoPermisos ||
      selectedPermisosDisponibles.length === 0
    ) {
      return;
    }
    setPermisosSaving(true);
    setPermisosError(null);

    try {
      await axios.put(
        `${permisosInternalEndpoint}/${empleadoPermisos.id}`,
        {
          permisos: selectedPermisosDisponibles.map((permiso) => ({
            permisoId: permiso.id,
            permitido: true,
          })),
        },
        { headers: authHeaders }
      );

      setPermisosAsignados((prev) => [...prev, ...selectedPermisosDisponibles]);
      setPermisosDisponibles((prev) =>
        prev.filter(
          (permiso) => !selectedPermisosDisponibles.some((item) => item.id === permiso.id)
        )
      );
      setSelectedPermisosDisponibles([]);
    } catch (err) {
      console.error('Error al asignar permisos al empleado CROV', err);
      setPermisosError('No se pudieron asignar los permisos seleccionados.');
    } finally {
      setPermisosSaving(false);
    }
  };

  const quitarPermisosEmpleado = async () => {
    if (
      !permisosInternalEndpoint ||
      !token ||
      !empleadoPermisos ||
      selectedPermisosAsignados.length === 0
    ) {
      return;
    }
    setPermisosSaving(true);
    setPermisosError(null);

    try {
      await axios.put(
        `${permisosInternalEndpoint}/${empleadoPermisos.id}`,
        {
          permisos: selectedPermisosAsignados.map((permiso) => ({
            permisoId: permiso.id,
            permitido: false,
          })),
        },
        { headers: authHeaders }
      );

      setPermisosDisponibles((prev) => [...prev, ...selectedPermisosAsignados]);
      setPermisosAsignados((prev) =>
        prev.filter(
          (permiso) => !selectedPermisosAsignados.some((item) => item.id === permiso.id)
        )
      );
      setSelectedPermisosAsignados([]);
    } catch (err) {
      console.error('Error al quitar permisos del empleado CROV', err);
      setPermisosError('No se pudieron quitar los permisos seleccionados.');
    } finally {
      setPermisosSaving(false);
    }
  };

  const limpiarPermisosSeleccion = () => {
    setSelectedPermisosDisponibles([]);
    setSelectedPermisosAsignados([]);
  };

  const handleEmpleadoDelete = async (empleado: EmpleadoCROV) => {
    if (!empleadosEndpoint || !token) {
      return;
    }
    const confirmed = window.confirm(
      `¿Eliminar el empleado "${empleado.nombreCompleto}"?`
    );
    if (!confirmed) return;

    setEmpleadoDeletingId(empleado.id);
    setError(null);
    setSuccessMessage(null);

    try {
     const payload = mapEmpleadoFormToPayload(
        {
          nombreCompleto: empleado.nombreCompleto,
          puesto: empleado.puesto ?? EMPLEADO_PUESTO_EMPTY_VALUE,
          celular: empleado.celular ?? '',
          correo: empleado.correo ?? '',
          password: '',
          fechaNacimiento: empleado.fechaNacimiento
            ? toInputDate(empleado.fechaNacimiento)
            : '',
          totalAhorro: empleado.totalAhorro ?? 0,
          residente: empleado.residente === 1,
          activo: 0,
          montoAhorro: empleado.montoAhorro ?? 0,
          proyectoResidencia: empleado.proyectoResidencia ?? null,
        },
        { requirePassword: false }
      );

      await axios.put(`${empleadosEndpoint}/${empleado.id}`, payload, {
        headers: authHeaders,
      });
      setEmpleados((prev) => prev.filter((item) => item.id !== empleado.id));
      setSuccessMessage('Empleado CROV eliminado correctamente.');
    } catch (err) {
      console.error('Error al eliminar empleado CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudo eliminar el empleado CROV.';
      setError(message);
    } finally {
      setEmpleadoDeletingId(null);
    }
  };

  const handleEmpleadoSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!empleadosEndpoint || !token) {
      return;
    }

    setEmpleadosSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload = mapEmpleadoFormToPayload(empleadoForm, {
      requirePassword: !editingEmpleado,
    });

    try {
      if (editingEmpleado) {
        await axios.put(`${empleadosEndpoint}/${editingEmpleado.id}`, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Empleado CROV actualizado correctamente.');
      } else {
        await axios.post(empleadosEndpoint, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Empleado CROV creado correctamente.');
      }
      setEmpleadoDialogOpen(false);
      await fetchEmpleados();
    } catch (err) {
      console.error('Error al guardar empleado CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'Ocurrió un error al guardar el empleado CROV.';
      setError(message);
    } finally {
      setEmpleadosSaving(false);
    }
  };

  const updateEmpleadoFormField = <Key extends keyof EmpleadoForm>(
    key: Key,
    value: EmpleadoForm[Key]
  ) => {
    setEmpleadoForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTicketCreate = () => {
    setSuccessMessage(null);
    setError(null);
    setEditingTicket(null);
    setTicketForm({
      ...defaultTicketForm,
      folio: nextTicketFolio,
      fecha_registro: toDateTimeInput(new Date().toISOString()),
    });
    setTicketClienteSearch('');
    setTicketClienteSearchActive(false);
    setTicketDialogOpen(true);
  };

  const handleTicketEdit = (ticket: TicketSoporteCROV) => {
    setSuccessMessage(null);
    setEditingTicket(ticket);
    setTicketForm({
      folio: ticket.folio ?? '',
      nombre_cliente: ticket.nombre_cliente ?? '',
      nombre_negocio: ticket.nombre_negocio ?? '',
      correo: ticket.correo ?? '',
      telefono: ticket.telefono ?? '',
      garantia: ticket.garantia,
      tipo_problema: ticket.tipo_problema,
      prioridad: ticket.prioridad,
      estado_solicitud: ticket.estado_solicitud,
      descripcion: ticket.descripcion ?? '',
      descripcion_solucion: ticket.descripcion_solucion ?? '',
      fecha_registro:
        toDateTimeInput(ticket.fecha_registro) || toDateTimeInput(new Date().toISOString()),
      fecha_solucion: toDateTimeInput(ticket.fecha_solucion) || '',
      id_empleado_crov: ticket.id_empleado_crov ? String(ticket.id_empleado_crov) : '',
    });
    const label = [ticket.nombre_cliente, ticket.nombre_negocio]
      .filter((value) => value && value.trim().length > 0)
      .join(' · ');
    setTicketClienteSearch(label);
    setTicketClienteSearchActive(false);
    setTicketDialogOpen(true);
  };

  const handleTicketView = (ticket: TicketSoporteCROV) => {
    setTicketDetail(ticket);
    setTicketDetailOpen(true);
  };

  const handleTicketDelete = async (ticket: TicketSoporteCROV) => {
    if (!ticketsEndpoint || !token) {
      return;
    }
    const confirmed = window.confirm(
      `¿Eliminar el ticket de soporte con folio "${ticket.folio}"?`
    );
    if (!confirmed) return;

    setTicketDeletingId(ticket.id);
    setError(null);
    setSuccessMessage(null);

    try {
      await axios.delete(`${ticketsEndpoint}/${ticket.id}`, {
        headers: authHeaders,
      });
      setTickets((prev) => prev.filter((item) => item.id !== ticket.id));
      setSuccessMessage('Ticket de soporte CROV eliminado correctamente.');
    } catch (err) {
      console.error('Error al eliminar ticket de soporte CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'No se pudo eliminar el ticket de soporte CROV.';
      setError(message);
    } finally {
      setTicketDeletingId(null);
    }
  };

  const handleTicketSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!ticketsEndpoint || !token) {
      return;
    }

    setTicketsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload = editingTicket
      ? mapTicketFormToUpdatePayload(ticketForm)
      : mapTicketFormToCreatePayload(ticketForm);

    try {
      if (editingTicket) {
        await axios.put(`${ticketsEndpoint}/${editingTicket.id}`, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Ticket de soporte CROV actualizado correctamente.');
      } else {
        await axios.post(ticketsEndpoint, payload, {
          headers: authHeaders,
        });
        setSuccessMessage('Ticket de soporte CROV creado correctamente.');
      }
      setTicketDialogOpen(false);
      await fetchTickets();
    } catch (err) {
      console.error('Error al guardar ticket de soporte CROV', err);
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        'Ocurrió un error al guardar el ticket de soporte CROV.';
      setError(message);
    } finally {
      setTicketsSaving(false);
    }
  };

  const updateTicketFormField = <Key extends keyof TicketForm>(
    key: Key,
    value: TicketForm[Key]
  ) => {
    setTicketForm((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      if (key === 'estado_solicitud') {
        const estado = value as EstadoSolicitudTicket;
        if (estado === 'RESUELTO') {
          next.fecha_solucion =
            prev.estado_solicitud === 'RESUELTO' && prev.fecha_solucion
              ? prev.fecha_solucion
              : toDateTimeInput(new Date().toISOString());
        } else {
          next.fecha_solucion = '';
        }
      }

      return next;
    });
  };

  const getSupportStatus = (fechaFinSoporte: string | null) => {
    if (!fechaFinSoporte) {
      return { label: 'SIN SOPORTE', className: 'text-red-600' };
    }

    const endDate = new Date(fechaFinSoporte);
    if (Number.isNaN(endDate.getTime())) {
      return { label: 'SIN SOPORTE', className: 'text-red-600' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (today <= endDate) {
      return { label: 'VIGENTE', className: 'text-green-600' };
    }

    return { label: 'SIN SOPORTE', className: 'text-red-600' };
  };

  const girosById = useMemo(() => {
    const map = new Map<number, GiroComercial>();
    giros.forEach((giro) => {
      const id = Number(giro.id);
      if (Number.isFinite(id)) {
        map.set(id, giro);
      }
    });
    return map;
  }, [giros]);

  const resolveClienteGiro = useCallback(
    (cliente: ClienteCROV) => {
      const giroId = getClienteGiroId(cliente);
      const relation = cliente.giro ?? cliente.giro_comercial ?? null;

      const relationNombre =
        typeof relation?.nombre === 'string' && relation.nombre.trim()
          ? relation.nombre.trim()
          : null;
      const relationDescripcion =
        typeof relation?.descripcion === 'string' && relation.descripcion.trim()
          ? relation.descripcion.trim()
          : null;

      const fallbackNombre =
        relationNombre ??
        (typeof cliente.giro_comercial_nombre === 'string' &&
        cliente.giro_comercial_nombre.trim()
          ? cliente.giro_comercial_nombre.trim()
          : null);
      const fallbackDescripcion =
        relationDescripcion ??
        (typeof cliente.giro_comercial_descripcion === 'string' &&
        cliente.giro_comercial_descripcion.trim()
          ? cliente.giro_comercial_descripcion.trim()
          : null);

      if (giroId) {
        const giro = girosById.get(giroId);
        if (giro) {
          return {
            id: giroId,
            nombre: giro.nombre,
            descripcion: giro.descripcion ?? null,
          };
        }

        return {
          id: giroId,
          nombre: fallbackNombre,
          descripcion: fallbackDescripcion,
        };
      }

      if (fallbackNombre || fallbackDescripcion) {
        return {
          id: null,
          nombre: fallbackNombre,
          descripcion: fallbackDescripcion,
        };
      }

      return null;
    },
    [girosById]
  );

  const clienteById = useMemo(() => {
    const map = new Map<number, ClienteCROV>();
    clientes.forEach((cliente) => {
      map.set(cliente.id, cliente);
    });
    return map;
  }, [clientes]);

  const prospectosByClienteId = useMemo(() => {
    const map = new Map<number, ProspectoCROV[]>();
    prospectos.forEach((prospecto) => {
      if (!prospecto.id_cliente_crov) {
        return;
      }

      const list = map.get(prospecto.id_cliente_crov) ?? [];
      list.push(prospecto);
      map.set(prospecto.id_cliente_crov, list);
    });
    return map;
  }, [prospectos]);

  const prospectosClienteSeleccionados = useMemo(() => {
    if (!prospectoClienteView) {
      return [] as ProspectoCROV[];
    }

    return prospectosByClienteId.get(prospectoClienteView.id) ?? [];
  }, [prospectoClienteView, prospectosByClienteId]);

  const prospectoClienteOptions = useMemo(() => {
    const term = prospectoClienteFilter.trim().toLowerCase();
    const selectedId = prospectoForm.id_cliente_crov
      ? Number(prospectoForm.id_cliente_crov)
      : null;

    const filtered = clientes
      .filter((cliente) => {
        if (!term) {
          return true;
        }

        const nombreCliente = cliente.nombre_cliente?.toLowerCase() ?? '';
        const nombreNegocio = cliente.nombre_negocio?.toLowerCase() ?? '';
        const direccion = cliente.direccion?.toLowerCase() ?? '';

        return (
          nombreCliente.includes(term) ||
          nombreNegocio.includes(term) ||
          direccion.includes(term)
        );
      })
      .map((cliente) => ({
        value: String(cliente.id),
        label: `${cliente.nombre_cliente}${
          cliente.nombre_negocio ? ` · ${cliente.nombre_negocio}` : ''
        }`,
      }));

    if (selectedId && !filtered.some((option) => Number(option.value) === selectedId)) {
      const selectedCliente = clientes.find((cliente) => cliente.id === selectedId);
      if (selectedCliente) {
        filtered.unshift({
          value: String(selectedCliente.id),
          label: `${selectedCliente.nombre_cliente}${
            selectedCliente.nombre_negocio ? ` · ${selectedCliente.nombre_negocio}` : ''
          }`,
        });
      }
    }

    return filtered;
  }, [clientes, prospectoClienteFilter, prospectoForm.id_cliente_crov]);

  const mantenimientoClienteOptions = useMemo(() => {
    const term = mantenimientoClienteFilter.trim().toLowerCase();
    const selectedId = mantenimientoForm.id_cliente_crov
      ? Number(mantenimientoForm.id_cliente_crov)
      : null;

    const filtered = clientes
      .filter((cliente) => {
        if (!term) {
          return true;
        }

        const nombreCliente = cliente.nombre_cliente?.toLowerCase() ?? '';
        const nombreNegocio = cliente.nombre_negocio?.toLowerCase() ?? '';
        const direccion = cliente.direccion?.toLowerCase() ?? '';

        return (
          nombreCliente.includes(term) ||
          nombreNegocio.includes(term) ||
          direccion.includes(term)
        );
      })
      .map((cliente) => ({
        value: String(cliente.id),
        label: `${cliente.nombre_cliente}${
          cliente.nombre_negocio ? ` · ${cliente.nombre_negocio}` : ''
        }`,
      }));

    if (selectedId && !filtered.some((option) => Number(option.value) === selectedId)) {
      const selectedCliente = clientes.find((cliente) => cliente.id === selectedId);
      if (selectedCliente) {
        filtered.unshift({
          value: String(selectedCliente.id),
          label: `${selectedCliente.nombre_cliente}${
            selectedCliente.nombre_negocio ? ` · ${selectedCliente.nombre_negocio}` : ''
          }`,
        });
      } else {
        const mantenimientoRelacionado = mantenimientos.find(
          (item) => item.id_cliente_crov === selectedId
        );

        if (mantenimientoRelacionado) {
          const labelParts = [
            mantenimientoRelacionado.clienteNombre || `Cliente #${selectedId}`,
          ];
          if (mantenimientoRelacionado.clienteNegocio) {
            labelParts.push(mantenimientoRelacionado.clienteNegocio);
          }
          filtered.unshift({
            value: String(selectedId),
            label: labelParts.join(' · '),
          });
        }
      }
    }

    return filtered;
  }, [
    clientes,
    mantenimientoClienteFilter,
    mantenimientoForm.id_cliente_crov,
    mantenimientos,
  ]);

  const resolveMantenimientoCliente = useCallback(
    (mantenimiento: MantenimientoClienteCROV) => {
      const cliente =
        mantenimiento.id_cliente_crov !== null
          ? clienteById.get(mantenimiento.id_cliente_crov)
          : null;

      const nombreCliente =
        cliente?.nombre_cliente ?? mantenimiento.clienteNombre ?? 'Sin cliente';
      const nombreNegocio = cliente?.nombre_negocio ?? mantenimiento.clienteNegocio ?? null;

      return {
        cliente,
        nombreCliente,
        nombreNegocio,
      };
    },
    [clienteById]
  );

  const filteredMantenimientos = useMemo(() => {
    const term = mantenimientosSearch.trim().toLowerCase();

    return mantenimientos.filter((mantenimiento) => {
      const { nombreCliente, nombreNegocio } = resolveMantenimientoCliente(mantenimiento);
      const comentarios = mantenimiento.comentarios ?? '';
      const fechaMantenimiento = mantenimiento.fecha_mantenimiento ?? '';
      const fechaProximo = mantenimiento.fecha_proximo_mantenimiento ?? '';

      if (!term) {
        return true;
      }

      return (
        nombreCliente.toLowerCase().includes(term) ||
        (nombreNegocio?.toLowerCase().includes(term) ?? false) ||
        comentarios.toLowerCase().includes(term) ||
        fechaMantenimiento.toLowerCase().includes(term) ||
        fechaProximo.toLowerCase().includes(term)
      );
    });
  }, [mantenimientos, mantenimientosSearch, resolveMantenimientoCliente]);

  const prospectosStats = useMemo<ProspectosStatsSummary>(() => {
    const total = prospectos.length;

    if (total === 0) {
      return {
        total,
        conCliente: 0,
        conClientePercentage: 0,
        conCorreo: 0,
        conCorreoPercentage: 0,
        negociosUnicos: 0,
        prospectosVencidos: 0,
        prospectosRecientes: 0,
        prospectosNotificadosRecientes: 0,
        interestBreakdown: [],
        topInterestLabel: 'Sin información',
        topInterestPercentage: 0,
      };
    }

    let conCliente = 0;
    let conCorreo = 0;
    let prospectosVencidos = 0;
    let prospectosRecientes = 0;
    let prospectosNotificadosRecientes = 0;
    const negociosSet = new Set<string>();
    const interestCounts = new Map<ProspectoInteres | null, number>();
    const nowMs = Date.now();
    const diezDiasMs = 10 * 24 * 60 * 60 * 1000;
    const cincoDiasMs = 5 * 24 * 60 * 60 * 1000;
    const sieteDiasMs = 7 * 24 * 60 * 60 * 1000;

    prospectos.forEach((prospecto) => {
      if (prospecto.id_cliente_crov !== null) {
        conCliente += 1;
      }

      if (prospecto.correo) {
        conCorreo += 1;
      }

      const negocioNombre = prospecto.nombre_negocio?.trim().toLowerCase();
      if (negocioNombre) {
        negociosSet.add(negocioNombre);
      }

      const key = prospecto.interes ?? null;
      interestCounts.set(key, (interestCounts.get(key) ?? 0) + 1);

      const ultimaNotificacionDate = parseDateValue(prospecto.ultima_notificacion);
      if (!ultimaNotificacionDate || nowMs - ultimaNotificacionDate.getTime() > diezDiasMs) {
        prospectosVencidos += 1;
      }

      if (ultimaNotificacionDate && nowMs - ultimaNotificacionDate.getTime() <= cincoDiasMs) {
        prospectosNotificadosRecientes += 1;
      }

      const fechaCreacionDate = parseDateValue(prospecto.fecha_creacion);
      if (fechaCreacionDate && nowMs - fechaCreacionDate.getTime() <= sieteDiasMs) {
        prospectosRecientes += 1;
      }
    });

    const interestBreakdown = Array.from(interestCounts.entries())
      .map(([interes, count]) => ({
        interes,
        label: getProspectoInteresLabel(interes),
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const topInterest = interestBreakdown[0] ?? null;

    return {
      total,
      conCliente,
      conClientePercentage: (conCliente / total) * 100,
      conCorreo,
      conCorreoPercentage: (conCorreo / total) * 100,
      negociosUnicos: negociosSet.size,
      prospectosVencidos,
      prospectosRecientes,
      prospectosNotificadosRecientes,
      interestBreakdown,
      topInterestLabel: topInterest?.label ?? 'Sin información',
      topInterestPercentage: topInterest?.percentage ?? 0,
    };
  }, [prospectos]);

  const filteredProspectos = useMemo(() => {
    const nameTerm = prospectosSearch.trim().toLowerCase();
    const phoneTerm = prospectosPhoneFilter.replace(/\D/g, '');

    return prospectos.filter((prospecto) => {
      const associatedCliente = prospecto.id_cliente_crov
        ? clienteById.get(prospecto.id_cliente_crov)
        : null;

      const matchesName = nameTerm
        ? prospecto.nombre.toLowerCase().includes(nameTerm) ||
          (prospecto.nombre_negocio?.toLowerCase().includes(nameTerm) ?? false) ||
          (prospecto.direccion_negocio?.toLowerCase().includes(nameTerm) ?? false) ||
          getProspectoInteresLabel(prospecto.interes).toLowerCase().includes(nameTerm) ||
          (associatedCliente?.nombre_cliente?.toLowerCase().includes(nameTerm) ?? false) ||
          (associatedCliente?.nombre_negocio?.toLowerCase().includes(nameTerm) ?? false)
        : true;

      if (!matchesName) {
        return false;
      }

      const telefonoDigits = (prospecto.telefono ?? '').replace(/\D/g, '');
      const matchesPhone = phoneTerm
        ? telefonoDigits.includes(phoneTerm)
        : true;

      return matchesPhone;
    });
  }, [clienteById, prospectos, prospectosPhoneFilter, prospectosSearch]);

  const selectedProspectosList = useMemo(() => {
    if (selectedProspectoIds.size === 0) {
      return [] as ProspectoCROV[];
    }

    return prospectos.filter((prospecto) =>
      selectedProspectoIds.has(prospecto.id),
    );
  }, [prospectos, selectedProspectoIds]);

  const filteredProspectosSelection = useMemo(() => {
    if (filteredProspectos.length === 0) {
      return {
        total: 0,
        selected: 0,
        allSelected: false,
        someSelected: false,
      };
    }

    let selectedCount = 0;
    filteredProspectos.forEach((prospecto) => {
      if (selectedProspectoIds.has(prospecto.id)) {
        selectedCount += 1;
      }
    });

    const allSelected = selectedCount === filteredProspectos.length;
    const someSelected = selectedCount > 0 && selectedCount < filteredProspectos.length;

    return {
      total: filteredProspectos.length,
      selected: selectedCount,
      allSelected,
      someSelected,
    };
  }, [filteredProspectos, selectedProspectoIds]);

  const validSelectedProspectos = useMemo(
    () =>
      selectedProspectosList.filter((prospecto) => {
        const sanitized = (prospecto.telefono ?? '').replace(/\D/g, '');
        return Boolean(sanitized);
      }),
    [selectedProspectosList],
  );

  const invalidSelectedProspectos = useMemo(
    () =>
      selectedProspectosList.filter((prospecto) => {
        const sanitized = (prospecto.telefono ?? '').replace(/\D/g, '');
        return !sanitized;
      }),
    [selectedProspectosList],
  );

  const whatsappTargetsMeta = useMemo<WhatsappTargetMeta[]>(
    () =>
      whatsappTargets.map((prospecto) => {
        const rawPhone = prospecto.telefono?.trim() ?? '';
        const sanitized = rawPhone.replace(/\D/g, '');

        return {
          prospecto,
          rawPhone,
          sanitized,
          isValid: Boolean(sanitized),
        };
      }),
    [whatsappTargets],
  );

  const validWhatsappTargets = useMemo(
    () => whatsappTargetsMeta.filter((item) => item.isValid),
    [whatsappTargetsMeta],
  );

  const invalidWhatsappTargets = useMemo(
    () => whatsappTargetsMeta.filter((item) => !item.isValid),
    [whatsappTargetsMeta],
  );

  const hasValidWhatsappTarget = validWhatsappTargets.length > 0;
  const totalWhatsappTargets = whatsappTargetsMeta.length;
  const isSingleWhatsappTarget = totalWhatsappTargets === 1;
  const firstWhatsappTarget = isSingleWhatsappTarget
    ? whatsappTargetsMeta[0] ?? null
    : null;
  const totalSelectedProspectos = selectedProspectosList.length;
  const totalValidSelectedProspectos = validSelectedProspectos.length;
  const totalInvalidSelectedProspectos = invalidSelectedProspectos.length;
  const areAllFilteredProspectosSelected = filteredProspectosSelection.allSelected;
  const areSomeFilteredProspectosSelected = filteredProspectosSelection.someSelected;

  useEffect(() => {
    if (!selectAllProspectosRef.current) {
      return;
    }

    selectAllProspectosRef.current.indeterminate =
      areSomeFilteredProspectosSelected && !areAllFilteredProspectosSelected;
  }, [areAllFilteredProspectosSelected, areSomeFilteredProspectosSelected]);

  const selectedPlantilla = useMemo(() => {
    if (!selectedPlantillaId) {
      return null;
    }

    return (
      activePlantillas.find((plantilla) => plantilla.id === selectedPlantillaId) ?? null
    );
  }, [activePlantillas, selectedPlantillaId]);

  const filteredClientes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const nombreCliente = cliente.nombre_cliente?.toLowerCase() ?? '';
      const nombreNegocio = cliente.nombre_negocio?.toLowerCase() ?? '';
      const direccion = cliente.direccion?.toLowerCase() ?? '';
      const giroInfo = resolveClienteGiro(cliente);
      const giroNombre = giroInfo?.nombre?.toLowerCase() ?? '';
      const giroDescripcion = giroInfo?.descripcion?.toLowerCase() ?? '';

      const matchesSearch =
        !term ||
        nombreCliente.includes(term) ||
        nombreNegocio.includes(term) ||
        direccion.includes(term) ||
        giroNombre.includes(term) ||
        giroDescripcion.includes(term);

      if (!matchesSearch) {
        return false;
      }

      if (supportStatusFilter === 'TODOS') {
        return true;
      }

      const soporte = getSupportStatus(cliente.fecha_fin_soporte).label;
      return soporte === supportStatusFilter;
    });
  }, [clientes, resolveClienteGiro, searchTerm, supportStatusFilter]);

  const filteredGiros = useMemo(() => {
    const term = girosSearch.trim().toLowerCase();

    if (!term) {
      return giros;
    }

    return giros.filter((giro) => {
      const nombre = giro.nombre?.toLowerCase() ?? '';
      const descripcion = giro.descripcion?.toLowerCase() ?? '';

      return nombre.includes(term) || descripcion.includes(term);
    });
  }, [giros, girosSearch]);

  const filteredSistemas = useMemo(() => {
    const term = sistemasSearch.trim().toLowerCase();

    if (!term) {
      return sistemas;
    }

    return sistemas.filter((sistema) => {
      const nombre = sistema.nombre?.toLowerCase() ?? '';
      const fecha = sistema.fecha_registro?.toLowerCase() ?? '';

      return nombre.includes(term) || fecha.includes(term);
    });
  }, [sistemas, sistemasSearch]);

  const filteredHistorialAhorros = useMemo(() => {
    const term = removeAccents(historialAhorrosSearch.trim().toLowerCase());

    if (!term) {
      return historialAhorros;
    }

    return historialAhorros.filter((ahorro: AhorroEmpleado ) => {
      const nombreEmpleado = removeAccents(ahorro.empleado.nombre_completo?.toLowerCase() ?? '');
      const fecha = formatDisplayDate(ahorro.fecha)?.toLowerCase() ?? '';

      return nombreEmpleado.includes(term) || fecha.includes(term);
    });
  }, [historialAhorros, historialAhorrosSearch]);

  const filteredEmpleados = useMemo(() => {
    const term = empleadosSearch.trim().toLowerCase();

    return empleados.filter((empleado) => {
      if (empleado.activo !== 1) {
        return false;
      }

      const nombre = empleado.nombreCompleto.toLowerCase();
      const puestoLabel = empleado.puesto ? empleadoPuestoLabels[empleado.puesto] : '';
      const puesto = puestoLabel.toLowerCase();
      const celular = empleado.celular?.toLowerCase() ?? '';
      const correo = empleado.correo?.toLowerCase() ?? '';

      const matchesSearch =
        !term ||
        nombre.includes(term) ||
        puesto.includes(term) ||
        celular.includes(term) ||
        correo.includes(term);

      return matchesSearch;
    });
  }, [empleados, empleadosSearch]);

  const resolveEmpleadoNombre = useCallback(
    (ticket: TicketSoporteCROV) => {
      if (ticket.empleadoNombre) {
        return ticket.empleadoNombre;
      }
      if (ticket.id_empleado_crov) {
        const empleado = empleados.find((item) => item.id === ticket.id_empleado_crov);
        return empleado ? empleado.nombreCompleto : null;
      }
      return null;
    },
    [empleados]
  );

  const filteredTickets = useMemo(() => {
    const term = ticketsSearch.trim().toLowerCase();
    const startDate = startOfDayFromInput(ticketFechaInicio);
    const endDate = endOfDayFromInput(ticketFechaFin);

    return tickets.filter((ticket) => {
      const empleadoNombre = resolveEmpleadoNombre(ticket)?.toLowerCase() ?? '';
      const matchesSearch =
        !term ||
        ticket.folio.toLowerCase().includes(term) ||
        ticket.nombre_cliente.toLowerCase().includes(term) ||
        ticket.nombre_negocio.toLowerCase().includes(term) ||
        (ticket.correo?.toLowerCase().includes(term) ?? false) ||
        (ticket.telefono?.toLowerCase().includes(term) ?? false) ||
        empleadoNombre.includes(term);

      if (!matchesSearch) {
        return false;
      }

      if (ticketEstadoFilter !== 'TODOS' && ticket.estado_solicitud !== ticketEstadoFilter) {
        return false;
      }

      if (ticketPrioridadFilter !== 'TODAS' && ticket.prioridad !== ticketPrioridadFilter) {
        return false;
      }

      if (ticketGarantiaFilter !== 'TODAS' && ticket.garantia !== ticketGarantiaFilter) {
        return false;
      }

      const registroDate = parseDateSafe(ticket.fecha_registro);
      if (startDate && (!registroDate || registroDate < startDate)) {
        return false;
      }

      if (endDate && (!registroDate || registroDate > endDate)) {
        return false;
      }

      return true;
    });
  }, [
    tickets,
    ticketsSearch,
    ticketEstadoFilter,
    ticketPrioridadFilter,
    ticketGarantiaFilter,
    resolveEmpleadoNombre,
    ticketFechaInicio,
    ticketFechaFin,
  ]);

  const averageResponseLabel =
    dashboardStats.averageResponseMs !== null
      ? formatDurationHHMMSS(Math.round(dashboardStats.averageResponseMs))
      : 'Sin datos';

  const totalResponseLabel =
    dashboardStats.totalResponseMs > 0
      ? formatDurationHuman(dashboardStats.totalResponseMs)
      : '—';

  const resolvedDurationDetail = dashboardStats.resolvedWithDuration
    ? `Basado en ${dashboardStats.resolvedWithDuration} ${
        dashboardStats.resolvedWithDuration === 1 ? 'ticket' : 'tickets'
      } con tiempos registrados.`
    : 'Sin tiempos registrados.';
     if (!visibleTabs.length && !userPermisosLoading) {
    return (
      <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
        No tienes permisos para acceder a los módulos de CROV.
      </div>
    );
  }
  return (
    <Tabs
  value={activeTab}
  onValueChange={(value) => setActiveTab(value as CrovTabValue)}
  className="space-y-4"
>
      <TabsList>
        {visibleTabs.includes('dashboard') && (
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        )}
        {visibleTabs.includes('clientes') && (
          <TabsTrigger value="clientes">CROV clientes</TabsTrigger>
        )}
        {visibleTabs.includes('mantenimientos') && (
          <TabsTrigger value="mantenimientos">Mantenimientos</TabsTrigger>
        )}
        {visibleTabs.includes('sistemas') && (
          <TabsTrigger value="sistemas">Sistemas</TabsTrigger>
        )}
        {visibleTabs.includes('giros') && (
          <TabsTrigger value="giros">Giros comerciales</TabsTrigger>
        )}
        {visibleTabs.includes('prospectos') && (
          <TabsTrigger value="prospectos">Prospectos</TabsTrigger>
        )}
        {visibleTabs.includes('empleados') && (
          <TabsTrigger value="empleados">Empleados CROV</TabsTrigger>
        )}
        {visibleTabs.includes('tickets') && (
          <TabsTrigger value="tickets">Tickets soporte CROV</TabsTrigger>
        )}
        {visibleTabs.includes('historial_ahorros') && (
          <TabsTrigger value="historial_ahorros">Historial de ahorros</TabsTrigger>
        )}
        {visibleTabs.includes('mi_ahorro') && (
          <TabsTrigger value="mi_ahorro">Mi ahorro</TabsTrigger>
        )}
      </TabsList>

      {successMessage && (
        <div className="fixed left-1/2 top-4 z-50 w-full max-w-md -translate-x-1/2 transform px-4">
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 shadow-lg">
            {successMessage}
          </div>
        </div>
      )}

      {visibleTabs.includes('dashboard') && (
        <TabsContent value="dashboard" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-orange-600">
              Dashboard CROV
            </h2>
            <p className="text-sm text-muted-foreground">
              Visualiza el comportamiento de los tickets de soporte en el rango seleccionado.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 text-sm">
              <label
                htmlFor="dashboard-fecha-inicio"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Fecha inicio
              </label>
              <Input
                id="dashboard-fecha-inicio"
                type="date"
                value={dashboardFechaInicio}
                onChange={(event) => setDashboardFechaInicio(event.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label
                htmlFor="dashboard-fecha-fin"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Fecha fin
              </label>
              <Input
                id="dashboard-fecha-fin"
                type="date"
                value={dashboardFechaFin}
                onChange={(event) => setDashboardFechaFin(event.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {!isDashboardRangeValid && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            La fecha inicial no puede ser mayor que la fecha final.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-blue-100 bg-blue-500 p-5 text-white shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">
              Total de tickets
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {isDashboardRangeValid ? dashboardStats.totalTickets : '—'}
            </p>
            <p className="mt-1 text-xs opacity-80">{dashboardRangeLabel}</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-500 p-5 text-white shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">
              Tickets resueltos
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {isDashboardRangeValid ? dashboardStats.resolvedTickets : '—'}
            </p>
            <p className="mt-1 text-xs opacity-80">En el periodo seleccionado</p>
          </div>
          <div className="rounded-xl border border-yellow-100 bg-yellow-400 p-5 text-slate-900 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-900/80">
              Tiempo de respuesta promedio
            </p>
            <p className="mt-2 text-3xl font-semibold">{averageResponseLabel}</p>
            <p className="mt-1 text-xs text-slate-900/80">Total acumulado: {totalResponseLabel}</p>
            <p className="mt-1 text-xs text-slate-900/70">{resolvedDurationDetail}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  Tickets por estado
                </h3>
                <p className="text-sm text-muted-foreground">{dashboardRangeLabel}</p>
              </div>
              <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
                {isDashboardRangeValid ? dashboardStats.totalTickets : 0} tickets
              </Badge>
            </div>
            <div className="mt-6 flex flex-col items-center justify-center gap-4">
              {ticketsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando métricas...
                </div>
              ) : !isDashboardRangeValid ? (
                <p className="text-sm text-red-500">Selecciona un rango de fechas válido.</p>
              ) : dashboardStats.statusData.length > 0 ? (
                <SimplePieChart
                  data={dashboardStats.statusData}
                  valueFormatter={(value) =>
                    `${value} ${value === 1 ? 'ticket' : 'tickets'}`
                  }
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  No hay tickets registrados en el rango seleccionado.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  Tickets por prioridad
                </h3>
                <p className="text-sm text-muted-foreground">{dashboardRangeLabel}</p>
              </div>
            </div>
            <div className="mt-6">
              {ticketsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando métricas...
                </div>
              ) : !isDashboardRangeValid ? (
                <p className="text-sm text-red-500">Selecciona un rango de fechas válido.</p>
              ) : dashboardStats.priorityData.length > 0 ? (
                <SimpleBarChart
                  data={dashboardStats.priorityData}
                  gradient="from-sky-500 to-indigo-500"
                  valueFormatter={(value) => `${value}`}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  No hay tickets registrados en el rango seleccionado.
                </p>
              )}
            </div>
          </div>
        </div>
        </TabsContent>
      )}

      {visibleTabs.includes('clientes') && (
        <TabsContent value="clientes" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-orange-600">Clientes CROV</h2>
            <p className="text-sm text-muted-foreground">
              Administra el catálogo de clientes de CROV y registra nuevas instalaciones.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchClientes()}
              disabled={loading || !clientesEndpoint || !token}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!clientesEndpoint || !token}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Nuevo cliente
            </Button>
          </div>
        </div>

        {!apiUrl && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
          </div>
        )}
        {!token && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            No se encontró el token interno. Inicia sesión nuevamente.
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-full max-w-sm">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por cliente, negocio, dirección o giro"
              className="w-full"
            />
          </div>
          <div className="w-full max-w-xs">
            <Select
              value={supportStatusFilter}
              onValueChange={(value) =>
                setSupportStatusFilter(
                  value as 'TODOS' | 'VIGENTE' | 'SIN SOPORTE'
                )
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Filtrar por estatus soporte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="VIGENTE">Vigente</SelectItem>
                <SelectItem value="SIN SOPORTE">Sin soporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-100">
                <TableHead className="whitespace-nowrap">Nombre del cliente</TableHead>
                <TableHead className="whitespace-nowrap">Nombre del negocio</TableHead>
                <TableHead>Tipo de sistema</TableHead>
                <TableHead>Giro comercial</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Fecha de instalación</TableHead>
                <TableHead>Fecha fin soporte</TableHead>
                <TableHead>Estatus soporte</TableHead>
                <TableHead className="whitespace-nowrap">Prospectos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    Cargando clientes CROV...
                  </TableCell>
                </TableRow>
              )}

              {!loading && filteredClientes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    {searchTerm.trim()
                      ? 'No se encontraron clientes que coincidan con la búsqueda.'
                      : 'No hay clientes CROV registrados.'}
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                filteredClientes.map((cliente) => {
                  const lat = toCoordinateNumber(cliente.latitud);
                  const lng = toCoordinateNumber(cliente.longitud);
                  const hasCoordinates = lat !== null && lng !== null;

                  return (
                    <TableRow key={cliente.id} className="border-t">
                    <TableCell className="font-medium">{cliente.nombre_cliente}</TableCell>
                    <TableCell>{cliente.nombre_negocio}</TableCell>
                    <TableCell>{tipoSistemaLabels[cliente.tipo_sistema]}</TableCell>
                    <TableCell>
                      {(() => {
                        const giroInfo = resolveClienteGiro(cliente);
                        if (!giroInfo) {
                          return (
                            <span className="text-sm text-muted-foreground">
                              Sin giro asignado
                            </span>
                          );
                        }

                        const nombreRaw =
                          typeof giroInfo.nombre === 'string'
                            ? giroInfo.nombre.trim()
                            : '';
                        const descripcionRaw =
                          typeof giroInfo.descripcion === 'string'
                            ? giroInfo.descripcion.trim()
                            : '';

                        if (!nombreRaw && !descripcionRaw && !giroInfo.id) {
                          return (
                            <span className="text-sm text-muted-foreground">
                              Sin giro asignado
                            </span>
                          );
                        }

                        const displayNombre = nombreRaw
                          ? nombreRaw
                          : giroInfo.id
                            ? `Giro #${giroInfo.id}`
                            : 'Sin nombre';

                        return (
                          <div className="flex flex-col text-sm">
                            <span className="font-medium text-slate-900">{displayNombre}</span>
                            {descripcionRaw ? (
                              <span className="text-xs text-muted-foreground">
                                {descripcionRaw}
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{cliente.telefono || 'Sin teléfono'}</span>
                        <span className="text-xs text-muted-foreground">
                          {cliente.correo || 'Sin correo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{cliente.direccion || 'Sin dirección'}</TableCell>
                    <TableCell>{formatDisplayDate(cliente.fecha_instalacion)}</TableCell>
                    <TableCell>{formatDisplayDate(cliente.fecha_fin_soporte)}</TableCell>
                    <TableCell>
                      {(() => {
                        const status = getSupportStatus(cliente.fecha_fin_soporte);
                        return (
                          <span className={`font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const clienteProspectos =
                          prospectosByClienteId.get(cliente.id) ?? [];
                        if (clienteProspectos.length === 0) {
                          return (
                            <span className="text-sm text-muted-foreground">
                              Sin prospectos
                            </span>
                          );
                        }

                        return (
                          <div className="flex items-center gap-2">
                            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                              {clienteProspectos.length}{' '}
                              {clienteProspectos.length === 1
                                ? 'prospecto'
                                : 'prospectos'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => setProspectoClienteView(cliente)}
                              aria-label="Ver prospectos del cliente"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMap(cliente)}
                          className={hasCoordinates
                            ? 'text-emerald-600 hover:text-emerald-700'
                            : 'text-muted-foreground hover:text-muted-foreground'}
                          aria-label="Ver ubicación en Google Maps"
                          aria-disabled={!hasCoordinates}
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLogo(cliente)}
                          className={cliente.logo
                            ? 'text-emerald-600 hover:text-emerald-700'
                            : 'text-muted-foreground hover:text-muted-foreground'}
                          aria-label={cliente.logo
                            ? 'Ver o actualizar logotipo del cliente'
                            : 'Subir logotipo del cliente'}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(cliente)}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSupport(cliente)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <CalendarClock className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cliente)}
                          className="text-red-600 hover:text-red-700"
                          disabled={deletingId === cliente.id}
                        >
                          {deletingId === cliente.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        <Dialog open={logoDialogOpen} onOpenChange={setLogoDialogOpen}>
          <DialogContent className="max-w-lg space-y-4">
            <DialogHeader>
              <DialogTitle>
                {logoCliente
                  ? `Logotipo de ${
                      logoCliente.nombre_negocio?.trim() ||
                      logoCliente.nombre_cliente?.trim() ||
                      'cliente'
                    }`
                  : 'Logotipo del cliente CROV'}
              </DialogTitle>
            </DialogHeader>

            {logoError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {logoError}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Logotipo actual</p>
              <div className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                {logoLoading ? (
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Cargando logotipo...
                  </div>
                ) : logoPreviewUrl ? (
                  <Image
                    src={logoPreviewUrl}
                    alt="Logotipo del cliente"
                    width={400}
                    height={160}
                    className="max-h-36 w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay logotipo cargado para este cliente.
                  </p>
                )}
              </div>
              {logoPreviewUrl && !logoLoading ? (
                <a
                  href={logoPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Abrir en una nueva pestaña
                </a>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="cliente-logo-file"
              >
                Subir nuevo logotipo
              </label>
              <Input
                key={logoInputKey}
                id="cliente-logo-file"
                type="file"
                accept={CLIENT_LOGO_ALLOWED_MIME_TYPES.join(',')}
                onChange={handleLogoFileChange}
                disabled={logoUploading}
              />
              <p className="text-xs text-muted-foreground">
                Formatos permitidos: PNG, JPG/JPEG o WEBP. Tamaño máximo 10 MB.
              </p>
              {logoSelectedPreview ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-600">
                    Vista previa del nuevo logotipo
                  </p>
                  <Image
                    src={logoSelectedPreview}
                    alt="Vista previa del nuevo logotipo"
                    width={400}
                    height={160}
                    className="max-h-36 w-full object-contain"
                    unoptimized
                  />
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLogoDialogOpen(false)}
                disabled={logoUploading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleLogoUpload}
                disabled={logoUploading || !logoCliente}
                className="bg-orange-500 text-white hover:bg-orange-600"
              >
                {logoUploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo...
                  </span>
                ) : (
                  'Guardar logotipo'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCliente ? 'Editar cliente CROV' : 'Nuevo cliente CROV'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="nombre_cliente">
                  Nombre del cliente
                </label>
                <Input
                  id="nombre_cliente"
                  value={form.nombre_cliente}
                  onChange={(event) => updateFormField('nombre_cliente', event.target.value)}
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="nombre_negocio">
                  Nombre del negocio
                </label>
                <Input
                  id="nombre_negocio"
                  value={form.nombre_negocio}
                  onChange={(event) => updateFormField('nombre_negocio', event.target.value)}
                  placeholder="Ej. Tienda La Esquina"
                  required
                />
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium">Tipo de sistema</label>
                <Select
                  value={form.tipo_sistema}
                  onValueChange={(value: TipoSistema) => updateFormField('tipo_sistema', value)}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Selecciona el sistema" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg z-50">

                    {tipoSistemaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="cliente_giro">
                  Giro comercial (opcional)
                </label>
                <Select
                  value={form.id_giro_comercial || EMPTY_SELECT_VALUE}
                  onValueChange={(value) =>
                    updateFormField(
                      'id_giro_comercial',
                      value === EMPTY_SELECT_VALUE ? '' : value
                    )
                  }
                >
                  <SelectTrigger id="cliente_giro" className="w-full bg-white">
                    <SelectValue placeholder="Selecciona el giro comercial" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg z-50">

                    <SelectItem value={EMPTY_SELECT_VALUE}>Sin giro asignado</SelectItem>
                    {giros.map((giro) => (
                      <SelectItem key={giro.id} value={String(giro.id)}>
                        <div className="flex flex-col">
                          <span className="font-medium">{giro.nombre}</span>
                          {giro.descripcion?.trim() ? (
                            <span className="text-xs text-muted-foreground">
                              {giro.descripcion.trim()}
                            </span>
                          ) : null}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="direccion">
                  Dirección
                </label>
                <Input
                  id="direccion"
                  value={form.direccion}
                  onChange={(event) => updateFormField('direccion', event.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="latitud">
                    Latitud (opcional)
                  </label>
                  <Input
                    id="latitud"
                    type="number"
                    step="0.000001"
                    inputMode="decimal"
                    value={form.latitud}
                    onChange={(event) => updateFormField('latitud', event.target.value)}
                    placeholder="Ej. 21.512345"
                  />
                </div>
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="longitud">
                    Longitud (opcional)
                  </label>
                  <Input
                    id="longitud"
                    type="number"
                    step="0.000001"
                    inputMode="decimal"
                    value={form.longitud}
                    onChange={(event) => updateFormField('longitud', event.target.value)}
                    placeholder="Ej. -104.900123"
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="telefono">
                  Teléfono
                </label>
                <Input
                  id="telefono"
                  value={form.telefono}
                  onChange={(event) => updateFormField('telefono', event.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="correo">
                  Correo electrónico
                </label>
                <Input
                  id="correo"
                  type="email"
                  value={form.correo}
                  onChange={(event) => updateFormField('correo', event.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="fecha_instalacion">
                  Fecha de instalación
                </label>
                <Input
                  id="fecha_instalacion"
                  type="date"
                  value={form.fecha_instalacion}
                  onChange={(event) => updateFormField('fecha_instalacion', event.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingCliente ? (
                    'Guardar cambios'
                  ) : (
                    'Crear cliente'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {(() => {
                  const negocio = mapCliente?.nombre_negocio?.trim();
                  if (negocio) {
                    return negocio;
                  }
                  const clienteNombre = mapCliente?.nombre_cliente?.trim();
                  if (clienteNombre) {
                    return clienteNombre;
                  }
                  return 'Ubicación del cliente';
                })()}
              </DialogTitle>
            </DialogHeader>
            {mapCoordinates ? (
              <div className="space-y-3">
                <div className="aspect-video w-full overflow-hidden rounded-md border">
                  <iframe
                    title={`Ubicación de ${mapCliente?.nombre_negocio ?? mapCliente?.nombre_cliente ?? 'cliente'}`}
                    src={`https://www.google.com/maps?q=${mapCoordinates.lat},${mapCoordinates.lng}&z=16&output=embed`}
                    className="h-full w-full border-0"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Latitud: {mapCoordinates.lat.toFixed(6)} · Longitud:{' '}
                  {mapCoordinates.lng.toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Visualiza la ubicación exacta registrada para el cliente en Google Maps.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Este cliente no tiene coordenadas registradas. Agrega la latitud y longitud en el formulario para mostrar el
                mapa.
              </p>
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Actualizar fin de soporte</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="fecha_fin_soporte">
                  Selecciona la fecha de fin de soporte
                </label>
                <Input
                  id="fecha_fin_soporte"
                  type="date"
                  value={supportDate}
                  onChange={(event) => setSupportDate(event.target.value)}
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSupportDialogOpen(false)}
                  disabled={supportSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={supportSaving}
                >
                  {supportSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Guardar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={prospectoClienteView !== null}
          onOpenChange={(open) => {
            if (!open) {
              setProspectoClienteView(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Prospectos de {prospectoClienteView?.nombre_cliente ?? 'cliente'}
              </DialogTitle>
            </DialogHeader>
            {prospectosClienteSeleccionados.length > 0 ? (
              <div className="space-y-3">
                {prospectosClienteSeleccionados.map((prospecto) => (
                  <div
                    key={prospecto.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {prospecto.nombre}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Teléfono: {prospecto.telefono || 'Sin teléfono'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Este cliente no tiene prospectos asociados.
              </p>
            )}
          </DialogContent>
        </Dialog>
        </TabsContent>
      )}

      {visibleTabs.includes('mantenimientos') && (
        <TabsContent value="mantenimientos" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-orange-600">Mantenimientos</h2>
              <p className="text-sm text-muted-foreground">
                Registra y da seguimiento a los mantenimientos programados para clientes CROV.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMantenimientos()}
                disabled={mantenimientosLoading || !mantenimientosEndpoint || !token}
              >
                {mantenimientosLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Actualizar
              </Button>
              <Button
                size="sm"
                onClick={handleMantenimientoCreate}
                className="bg-orange-500 text-white hover:bg-orange-600"
                disabled={!mantenimientosEndpoint || !token || clientes.length === 0}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo mantenimiento
              </Button>
            </div>
          </div>

          {!apiUrl && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
              Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
            </div>
          )}
          {!token && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
              No se encontró el token interno. Inicia sesión nuevamente.
            </div>
          )}
          {clientes.length === 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              Registra clientes CROV para poder asociarlos a los mantenimientos.
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="w-full max-w-sm">
            <Input
              value={mantenimientosSearch}
              onChange={(event) => setMantenimientosSearch(event.target.value)}
              placeholder="Buscar por cliente, negocio, fecha o comentario"
              className="w-full"
            />
          </div>

          <div className="overflow-auto rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100">
                  <TableHead>Cliente</TableHead>
                  <TableHead className="whitespace-nowrap">Último mantenimiento</TableHead>
                  <TableHead className="whitespace-nowrap">Próximo mantenimiento</TableHead>
                  <TableHead>Comentarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[130px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mantenimientosLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Cargando mantenimientos...
                    </TableCell>
                  </TableRow>
                )}

                {!mantenimientosLoading && filteredMantenimientos.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      {mantenimientosSearch.trim()
                        ? 'No se encontraron mantenimientos que coincidan con la búsqueda.'
                        : 'Aún no se registran mantenimientos para los clientes CROV.'}
                    </TableCell>
                  </TableRow>
                )}

                {!mantenimientosLoading &&
                  filteredMantenimientos.map((mantenimiento) => {
                    const { nombreCliente, nombreNegocio } =
                      resolveMantenimientoCliente(mantenimiento);
                    const fechaMantenimientoLabel = formatDisplayDate(
                      mantenimiento.fecha_mantenimiento
                    );
                    const fechaProximoLabel = formatDisplayDate(
                      mantenimiento.fecha_proximo_mantenimiento
                    );
                    const fechaProximoDate = parseDateValue(
                      mantenimiento.fecha_proximo_mantenimiento
                    );
                    let proximoClassName = '';
                    let rowClassName = '';
                    if (fechaProximoDate) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const nextDate = new Date(fechaProximoDate);
                      nextDate.setHours(0, 0, 0, 0);
                      if (nextDate.getTime() < today.getTime()) {
                        proximoClassName = 'text-red-600 font-medium';
                        rowClassName = 'bg-red-100';
                      } else {
                        const diffMs = nextDate.getTime() - today.getTime();
                        const diffDays = diffMs / (1000 * 60 * 60 * 24);
                        if (diffDays <= 10) {
                          proximoClassName = 'text-amber-600 font-medium';
                          rowClassName = 'bg-yellow-100';
                        }
                      }
                    }

                    const activo = mantenimiento.activo !== 0;

                    return (
                      <TableRow
                        key={mantenimiento.id}
                        className={rowClassName ? `${rowClassName} border-t` : 'border-t'}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{nombreCliente}</span>
                            {nombreNegocio ? (
                              <span className="text-xs text-muted-foreground">
                                {nombreNegocio}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{fechaMantenimientoLabel}</TableCell>
                        <TableCell className={proximoClassName}>{fechaProximoLabel}</TableCell>
                        <TableCell className="max-w-md text-sm text-slate-600">
                          {mantenimiento.comentarios?.trim()
                            ? mantenimiento.comentarios
                            : 'Sin comentarios'}
                        </TableCell>
                        <TableCell>
                          {activo ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              Activo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMantenimientoEdit(mantenimiento)}
                              className="text-slate-600 hover:text-slate-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMantenimientoDelete(mantenimiento)}
                              className="text-red-600 hover:text-red-700"
                              disabled={mantenimientoDeletingId === mantenimiento.id}
                            >
                              {mantenimientoDeletingId === mantenimiento.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          <Dialog
            open={mantenimientoDialogOpen}
            onOpenChange={(open) => {
              setMantenimientoDialogOpen(open);
              if (!open) {
                setEditingMantenimiento(null);
                setMantenimientoForm(defaultMantenimientoForm);
                setMantenimientoClienteFilter('');
              }
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMantenimiento
                    ? 'Editar mantenimiento'
                    : 'Nuevo mantenimiento'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleMantenimientoSubmit} className="space-y-4">
                <div className="grid gap-3">
                  <span className="text-sm font-medium">Cliente CROV</span>
                  <div className="grid gap-2">
                    <Input
                      id="mantenimiento_cliente_busqueda"
                      value={mantenimientoClienteFilter}
                      onChange={(event) =>
                        setMantenimientoClienteFilter(event.target.value)
                      }
                      placeholder="Buscar cliente por nombre, negocio o dirección"
                      disabled={mantenimientosSaving}
                    />
                    <Select
                      value={mantenimientoForm.id_cliente_crov || EMPTY_SELECT_VALUE}
                      onValueChange={(value) =>
                        updateMantenimientoFormField(
                          'id_cliente_crov',
                          value === EMPTY_SELECT_VALUE ? '' : value
                        )
                      }
                      disabled={mantenimientosSaving || clientes.length === 0}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecciona el cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE} disabled>
                          Selecciona un cliente
                        </SelectItem>
                        {mantenimientoClienteOptions.length > 0 ? (
                          mantenimientoClienteOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__NO_RESULTS__" disabled>
                            {clientes.length === 0
                              ? 'No hay clientes registrados.'
                              : 'Ningún cliente coincide con la búsqueda.'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3">
                  <label
                    className="text-sm font-medium"
                    htmlFor="mantenimiento_fecha"
                  >
                    Fecha del mantenimiento
                  </label>
                  <Input
                    id="mantenimiento_fecha"
                    type="date"
                    value={mantenimientoForm.fecha_mantenimiento}
                    onChange={(event) =>
                      updateMantenimientoFormField(
                        'fecha_mantenimiento',
                        event.target.value
                      )
                    }
                    disabled={mantenimientosSaving}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <label
                    className="text-sm font-medium"
                    htmlFor="mantenimiento_comentarios"
                  >
                    Comentarios adicionales
                  </label>
                  <textarea
                    id="mantenimiento_comentarios"
                    value={mantenimientoForm.comentarios}
                    onChange={(event) =>
                      updateMantenimientoFormField('comentarios', event.target.value)
                    }
                    placeholder="Notas, pendientes o acuerdos del mantenimiento"
                    disabled={mantenimientosSaving}
                    className="min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMantenimientoDialogOpen(false)}
                    disabled={mantenimientosSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-500 text-white hover:bg-orange-600"
                    disabled={mantenimientosSaving}
                  >
                    {mantenimientosSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : editingMantenimiento ? (
                      'Guardar cambios'
                    ) : (
                      'Registrar mantenimiento'
                    )}
                  </Button>
                </DialogFooter>
              </form>
        </DialogContent>
      </Dialog>
    </TabsContent>
  )}

  {visibleTabs.includes('sistemas') && (
    <TabsContent value="sistemas" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-orange-600">Sistemas</h2>
          <p className="text-sm text-muted-foreground">
            Administra el catálogo de sistemas CROV disponibles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSistemas()}
            disabled={sistemasLoading || !sistemasEndpoint || !token}
          >
            {sistemasLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={handleSistemaCreate}
            className="bg-orange-500 text-white hover:bg-orange-600"
            disabled={!sistemasEndpoint || !token}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo sistema
          </Button>
        </div>
      </div>

      {!apiUrl && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
          Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
        </div>
      )}
      {!token && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
          No se encontró el token interno. Inicia sesión nuevamente.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="w-full max-w-sm">
        <Input
          value={sistemasSearch}
          onChange={(event) => setSistemasSearch(event.target.value)}
          placeholder="Buscar por nombre o fecha de registro"
          className="w-full"
        />
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-100">
              <TableHead className="whitespace-nowrap">Nombre</TableHead>
              <TableHead className="whitespace-nowrap">Fecha de registro</TableHead>
              <TableHead className="whitespace-nowrap">Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sistemasLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando sistemas...
                </TableCell>
              </TableRow>
            )}

            {!sistemasLoading && filteredSistemas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  {sistemasSearch.trim()
                    ? 'No se encontraron sistemas que coincidan con la búsqueda.'
                    : 'No hay sistemas registrados.'}
                </TableCell>
              </TableRow>
            )}

            {!sistemasLoading &&
              filteredSistemas.map((sistema) => {
                const activoValue =
                  sistema.activo === true ||
                  sistema.activo === 1 ||
                  (typeof sistema.activo === 'string' && sistema.activo === '1');

                return (
                  <TableRow key={sistema.id} className="border-t">
                    <TableCell className="font-medium">{sistema.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sistema.fecha_registro ? formatDateTime(sistema.fecha_registro) : '—'}
                    </TableCell>
                    <TableCell>
                      {sistema.activo === null || sistema.activo === undefined ? (
                        <span className="text-sm text-muted-foreground">Sin dato</span>
                      ) : activoValue ? (
                        <span className="text-sm font-semibold text-green-600">Activo</span>
                      ) : (
                        <span className="text-sm font-semibold text-red-600">Inactivo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSistemaEdit(sistema)}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSistemaDelete(sistema)}
                          className="text-red-600 hover:text-red-700"
                          disabled={sistemaDeletingId === sistema.id}
                        >
                          {sistemaDeletingId === sistema.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={sistemaDialogOpen} onOpenChange={setSistemaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSistema ? 'Editar sistema' : 'Nuevo sistema'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSistemaSubmit} className="space-y-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium" htmlFor="sistema_nombre">
                Nombre del sistema
              </label>
              <Input
                id="sistema_nombre"
                value={sistemaForm.nombre}
                onChange={(event) => updateSistemaFormField('nombre', event.target.value)}
                placeholder="Ej. Punto de Venta CROV"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="sistema_activo"
                checked={sistemaForm.activo}
                onCheckedChange={(checked) => updateSistemaFormField('activo', Boolean(checked))}
              />
              <label htmlFor="sistema_activo" className="text-sm">
                Sistema activo (por defecto está activo)
              </label>
            </div>

            {!editingSistema && (
              <p className="text-xs text-muted-foreground">
                La fecha de registro se asignará automáticamente con la fecha de hoy.
              </p>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSistemaDialogOpen(false)}
                disabled={sistemasSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={sistemasSaving}
              >
                {sistemasSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : editingSistema ? (
                  'Guardar cambios'
                ) : (
                  'Registrar sistema'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TabsContent>
  )}

      {visibleTabs.includes('giros') && (
        <TabsContent value="giros" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-orange-600">Giros comerciales</h2>
            <p className="text-sm text-muted-foreground">
              Administra los giros comerciales disponibles para asignar a los clientes CROV.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchGiros()}
              disabled={girosLoading || !girosEndpoint || !token}
            >
              {girosLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
            <Button
              size="sm"
              onClick={handleGiroCreate}
              className="bg-orange-500 text-white hover:bg-orange-600"
              disabled={!girosEndpoint || !token}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Nuevo giro
            </Button>
          </div>
        </div>

        {!apiUrl && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
          </div>
        )}
        {!token && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            No se encontró el token interno. Inicia sesión nuevamente.
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="w-full max-w-sm">
          <Input
            value={girosSearch}
            onChange={(event) => setGirosSearch(event.target.value)}
            placeholder="Buscar por nombre o descripción"
            className="w-full"
          />
        </div>

        <div className="overflow-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-100">
                <TableHead className="whitespace-nowrap">Nombre</TableHead>
                <TableHead className="whitespace-nowrap">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {girosLoading && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    Cargando giros comerciales...
                  </TableCell>
                </TableRow>
              )}

              {!girosLoading && filteredGiros.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    {girosSearch.trim()
                      ? 'No se encontraron giros comerciales que coincidan con la búsqueda.'
                      : 'No hay giros comerciales registrados.'}
                  </TableCell>
                </TableRow>
              )}

              {!girosLoading &&
                filteredGiros.map((giro) => {
                  const activoValue = giro.activo;
                  const isActive =
                    activoValue === true ||
                    activoValue === 1 ||
                    (typeof activoValue === 'string' && activoValue === '1');

                  return (
                    <TableRow key={giro.id} className="border-t">
                      <TableCell className="font-medium">{giro.nombre}</TableCell>
                      <TableCell>
                        {activoValue === null || activoValue === undefined ? (
                          <span className="text-sm text-muted-foreground">Sin dato</span>
                        ) : isActive ? (
                          <span className="text-sm font-semibold text-green-600">Activo</span>
                        ) : (
                          <span className="text-sm font-semibold text-red-600">Inactivo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGiroEdit(giro)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGiroDelete(giro)}
                            className="text-red-600 hover:text-red-700"
                            disabled={giroDeletingId === giro.id}
                          >
                            {giroDeletingId === giro.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        <Dialog open={giroDialogOpen} onOpenChange={setGiroDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingGiro ? 'Editar giro comercial' : 'Nuevo giro comercial'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGiroSubmit} className="space-y-4">
              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="giro_nombre">
                  Nombre del giro
                </label>
                <Input
                  id="giro_nombre"
                  value={giroForm.nombre}
                  onChange={(event) => updateGiroFormField('nombre', event.target.value)}
                  placeholder="Ej. Retail"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGiroDialogOpen(false)}
                  disabled={girosSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={girosSaving}
                >
                  {girosSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingGiro ? (
                    'Guardar cambios'
                  ) : (
                    'Crear giro'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </TabsContent>
      )}

      {visibleTabs.includes('prospectos') && (
        <TabsContent value="prospectos" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-orange-600">Prospectos CROV</h2>
            <p className="text-sm text-muted-foreground">
              Da seguimiento a los prospectos de CROV y convierte nuevas oportunidades.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchProspectos()}
              disabled={prospectosLoading || !prospectosEndpoint || !token}
            >
              {prospectosLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
            <Button
              size="sm"
              onClick={handleProspectoCreate}
              className="bg-orange-500 text-white hover:bg-orange-600"
              disabled={!prospectosEndpoint || !token}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Nuevo prospecto
            </Button>
          </div>
        </div>

        {!apiUrl && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
          </div>
        )}
        {!token && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            No se encontró el token interno. Inicia sesión nuevamente.
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {prospectosLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Actualizando métricas de prospectos...
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Prospectos totales</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {prospectosStats.total.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 p-3 text-orange-600">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {prospectosStats.total > 0
                  ? 'Pipeline activo de oportunidades comerciales.'
                  : 'Registra tus primeras oportunidades para ver métricas.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Con cliente asignado</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {prospectosStats.conCliente.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 p-3 text-orange-600">
                  <UserCheck className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {prospectosStats.total > 0 ? (
                  <>
                    {formatPercentage(prospectosStats.conClientePercentage)} del total ya están vinculados a un
                    cliente.{' '}
                    {Math.max(prospectosStats.total - prospectosStats.conCliente, 0).toLocaleString('es-MX')}{' '}
                    pendientes por vincular.
                  </>
                ) : (
                  'Registra prospectos para comenzar a vincularlos.'
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Con correo confirmado</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {prospectosStats.conCorreo.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 p-3 text-orange-600">
                  <MailCheck className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {prospectosStats.total > 0
                  ? `${formatPercentage(prospectosStats.conCorreoPercentage)} cuentan con correo para un seguimiento directo.`
                  : 'Agrega correos para agilizar el primer contacto.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Negocios identificados</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {prospectosStats.negociosUnicos.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 p-3 text-orange-600">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {prospectosStats.negociosUnicos > 0 ? (
                  <>
                    {formatPercentage(
                      (prospectosStats.negociosUnicos /
                        (prospectosStats.total > 0 ? prospectosStats.total : 1)) * 100,
                    )}{' '}
                    del total cuentan con nombre de negocio registrado.
                  </>
                ) : (
                  'Aún no se registran nombres de negocio.'
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Prospectos vencidos</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {prospectosStats.prospectosVencidos.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 p-3 text-orange-600">
                  <CalendarClock className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Creados (7 días)</span>
                  <span className="font-medium text-slate-800">
                    {prospectosStats.prospectosRecientes.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Notificados (5 días)</span>
                  <span className="font-medium text-slate-800">
                    {prospectosStats.prospectosNotificadosRecientes.toLocaleString('es-MX')}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Se consideran vencidos si han pasado más de 10 días desde la última notificación.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Interés de los prospectos</h3>
                  <p className="text-sm text-muted-foreground">
                    {prospectosStats.interestBreakdown.length > 0
                      ? `Principal: ${prospectosStats.topInterestLabel} (${formatPercentage(prospectosStats.topInterestPercentage)})`
                      : 'Sin información de interés registrada.'}
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 p-3 text-orange-600">
                  <PieChart className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              {prospectosStats.interestBreakdown.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {prospectosStats.interestBreakdown.map((item) => (
                    <div key={item.interes ?? 'sin-interes'} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="text-muted-foreground">
                          {item.count.toLocaleString('es-MX')} · {formatPercentage(item.percentage)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600"
                          style={{
                            width: `${Math.max(item.percentage, item.count > 0 ? 4 : 0)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Registra el interés de cada prospecto para identificar tendencias comerciales.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full max-w-sm">
            <Input
              value={prospectosSearch}
              onChange={(event) => setProspectosSearch(event.target.value)}
              placeholder="Buscar por nombre o negocio"
              className="w-full"
            />
          </div>
          <div className="w-full max-w-xs">
            <Input
              value={prospectosPhoneFilter}
              onChange={(event) => setProspectosPhoneFilter(event.target.value)}
              placeholder="Filtrar por teléfono"
              className="w-full"
            />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleProspectosWhatsappMass}
              className="border-green-600 text-green-600 hover:bg-green-50"
              disabled={totalSelectedProspectos === 0}
              title={
                totalSelectedProspectos === 0
                  ? 'Selecciona prospectos para enviar un WhatsApp masivo.'
                  : totalValidSelectedProspectos === 0
                    ? 'Los prospectos seleccionados no tienen teléfono válido.'
                    : undefined
              }
            >
              <WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp masivo
              {totalValidSelectedProspectos > 0
                ? ` (${totalValidSelectedProspectos})`
                : ''}
            </Button>
            {totalSelectedProspectos > 0 ? (
              <span className="text-xs text-muted-foreground">
                {totalSelectedProspectos} seleccionado
                {totalSelectedProspectos === 1 ? '' : 's'}
                {totalInvalidSelectedProspectos > 0
                  ? ` · ${totalInvalidSelectedProspectos} sin teléfono válido`
                  : ''}
              </span>
            ) : null}
          </div>
        </div>

        <div className="overflow-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-100">
                <TableHead className="w-12">
                  <div className="flex justify-center">
                    <Checkbox
                      ref={selectAllProspectosRef}
                      checked={areAllFilteredProspectosSelected}
                      onCheckedChange={(checked) =>
                        handleToggleAllProspectos(checked, filteredProspectos)
                      }
                      aria-label="Seleccionar todos los prospectos visibles"
                    />
                  </div>
                </TableHead>
                <TableHead className="whitespace-nowrap">Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Interés</TableHead>
                <TableHead className="whitespace-nowrap">Cliente CROV</TableHead>
                <TableHead className="whitespace-nowrap">Nombre del negocio</TableHead>
                <TableHead className="whitespace-nowrap">Dirección del negocio</TableHead>
                <TableHead className="whitespace-nowrap">Última notificación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prospectosLoading && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    Cargando prospectos CROV...
                  </TableCell>
                </TableRow>
              )}

              {!prospectosLoading && filteredProspectos.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    {prospectosSearch.trim() || prospectosPhoneFilter.trim()
                      ? 'No se encontraron prospectos que coincidan con los filtros.'
                      : 'No hay prospectos CROV registrados.'}
                  </TableCell>
                </TableRow>
              )}

              {!prospectosLoading &&
                filteredProspectos.map((prospecto) => {
                  const clienteRelacionado = prospecto.id_cliente_crov
                    ? clienteById.get(prospecto.id_cliente_crov)
                    : null;
                  const diasDesdeUltima = getDaysSinceDate(prospecto.ultima_notificacion);
                  const rowHighlightClass =
                    diasDesdeUltima === null
                      ? ''
                      : diasDesdeUltima > 10
                        ? 'bg-red-50'
                        : diasDesdeUltima >= 5
                          ? 'bg-yellow-50'
                          : '';

                  return (
                    <TableRow
                      key={prospecto.id}
                      className={`border-t ${rowHighlightClass}`.trim()}
                    >
                      <TableCell className="w-12">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={selectedProspectoIds.has(prospecto.id)}
                            onCheckedChange={(checked) =>
                              toggleProspectoSelection(prospecto.id, checked)
                            }
                            aria-label={`Seleccionar prospecto ${prospecto.nombre}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{prospecto.nombre}</TableCell>
                      <TableCell>{prospecto.telefono || 'Sin teléfono'}</TableCell>
                      <TableCell>{prospecto.correo || 'Sin correo'}</TableCell>
                      <TableCell>
                        {prospecto.interes ? (
                          <Badge className="border border-orange-200 bg-orange-50 text-orange-700" variant="outline">
                            {getProspectoInteresLabel(prospecto.interes)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin especificar</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {clienteRelacionado ? (
                          <div className="flex flex-col text-sm">
                            <span>{clienteRelacionado.nombre_cliente}</span>
                            {clienteRelacionado.nombre_negocio ? (
                              <span className="text-xs text-muted-foreground">
                                {clienteRelacionado.nombre_negocio}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin cliente</span>
                        )}
                      </TableCell>
                      <TableCell>{prospecto.nombre_negocio || 'Sin negocio'}</TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground">
                        {prospecto.direccion_negocio || 'Sin dirección'}
                      </TableCell>
                      <TableCell>
                        {prospecto.ultima_notificacion ? (
                          <div className="flex flex-col text-sm">
                            <span>{formatDateTime(prospecto.ultima_notificacion)}</span>
                            {diasDesdeUltima !== null ? (
                              <span className="text-xs text-muted-foreground">
                                Hace{' '}
                                {diasDesdeUltima === 0
                                  ? 'menos de 1 día'
                                  : `${diasDesdeUltima} ${
                                      diasDesdeUltima === 1 ? 'día' : 'días'
                                    }`}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin notificación</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProspectoWhatsapp(prospecto)}
                            className="text-green-600 hover:text-green-700"
                            title="Enviar WhatsApp"
                            disabled={
                              !(prospecto.telefono && prospecto.telefono.replace(/\D/g, ''))
                            }
                          >
                            <WhatsAppIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProspectoEdit(prospecto)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProspectoDelete(prospecto)}
                            className="text-red-600 hover:text-red-700"
                            disabled={prospectoDeletingId === prospecto.id}
                          >
                            {prospectoDeletingId === prospecto.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        <Dialog open={prospectoDialogOpen} onOpenChange={setProspectoDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProspecto
                  ? 'Editar prospecto CROV'
                  : 'Nuevo prospecto CROV'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleProspectoSubmit} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="prospecto_nombre">
                    Nombre del prospecto
                  </label>
                  <Input
                    id="prospecto_nombre"
                    value={prospectoForm.nombre}
                    onChange={(event) =>
                      updateProspectoFormField('nombre', event.target.value)
                    }
                    placeholder="Ej. María López"
                    disabled={prospectosSaving}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="prospecto_telefono">
                    Teléfono de contacto
                  </label>
                  <Input
                    id="prospecto_telefono"
                    value={prospectoForm.telefono}
                    onChange={(event) =>
                      updateProspectoFormField('telefono', event.target.value)
                    }
                    placeholder="Ej. 555 123 4567"
                    disabled={prospectosSaving}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="prospecto_correo">
                    Correo electrónico
                  </label>
                  <Input
                    id="prospecto_correo"
                    type="email"
                    value={prospectoForm.correo}
                    onChange={(event) =>
                      updateProspectoFormField('correo', event.target.value)
                    }
                    placeholder="Ej. maria@negocio.com"
                    disabled={prospectosSaving}
                  />
                </div>
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="prospecto_interes">
                    Interés del prospecto
                  </label>
                  <Select
                    value={prospectoForm.interes || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      updateProspectoFormField(
                        'interes',
                        value === EMPTY_SELECT_VALUE ? '' : (value as ProspectoInteres)
                      )
                    }
                    disabled={prospectosSaving}
                  >
                    <SelectTrigger id="prospecto_interes" className="w-full">
                      <SelectValue placeholder="Selecciona el sistema de interés" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value={EMPTY_SELECT_VALUE}>Sin especificar</SelectItem>
                      {prospectoInteresOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3">
                <span className="text-sm font-medium">Cliente CROV asociado</span>
                <div className="grid gap-2">
                  <Input
                    id="prospecto_cliente_busqueda"
                    value={prospectoClienteFilter}
                    onChange={(event) => setProspectoClienteFilter(event.target.value)}
                    placeholder="Filtrar clientes por nombre, negocio o dirección"
                    disabled={prospectosSaving}
                  />
                  <Select
                    value={prospectoForm.id_cliente_crov || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      updateProspectoFormField(
                        'id_cliente_crov',
                        value === EMPTY_SELECT_VALUE ? '' : value
                      )
                    }
                    disabled={prospectosSaving}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un cliente (opcional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value={EMPTY_SELECT_VALUE}>Sin cliente asociado</SelectItem>
                      {prospectoClienteOptions.length === 0 ? (
                        <SelectItem value="__NO_RESULTS__" disabled>
                          No hay coincidencias
                        </SelectItem>
                      ) : (
                        prospectoClienteOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vincula el prospecto con un cliente existente para relacionar la información.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="prospecto_negocio">
                    Nombre del negocio
                  </label>
                  <Input
                    id="prospecto_negocio"
                    value={prospectoForm.nombre_negocio}
                    onChange={(event) =>
                      updateProspectoFormField('nombre_negocio', event.target.value)
                    }
                    placeholder="Ej. Cafetería El Punto"
                    disabled={prospectosSaving}
                  />
                </div>
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="prospecto_direccion">
                    Dirección del negocio
                  </label>
                  <Input
                    id="prospecto_direccion"
                    value={prospectoForm.direccion_negocio}
                    onChange={(event) =>
                      updateProspectoFormField('direccion_negocio', event.target.value)
                    }
                    placeholder="Ej. Av. Reforma 123, CDMX"
                    disabled={prospectosSaving}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProspectoDialogOpen(false)}
                  disabled={prospectosSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 text-white hover:bg-orange-600"
                  disabled={prospectosSaving}
                >
                  {prospectosSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : editingProspecto ? (
                    'Guardar cambios'
                  ) : (
                    'Crear prospecto'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Enviar WhatsApp</DialogTitle>
            </DialogHeader>

            {totalWhatsappTargets > 0 ? (
              <form onSubmit={handleWhatsappSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="space-y-1">
                    {isSingleWhatsappTarget && firstWhatsappTarget ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Selecciona la plantilla que deseas enviar a{' '}
                          <span className="font-medium text-slate-700">
                            {firstWhatsappTarget.prospecto.nombre}
                          </span>
                          .
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Número:{' '}
                          {firstWhatsappTarget.rawPhone || 'Sin teléfono registrado'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Selecciona la plantilla que deseas enviar a los{' '}
                          <span className="font-medium text-slate-700">
                            {totalWhatsappTargets} prospectos
                          </span>{' '}
                          seleccionados.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {hasValidWhatsappTarget
                            ? `${validWhatsappTargets.length} prospecto${
                                validWhatsappTargets.length === 1 ? '' : 's'
                              } con teléfono válido.`
                            : 'Ninguno de los prospectos seleccionados tiene un teléfono válido.'}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Destinatarios
                      {hasValidWhatsappTarget
                        ? ` (${validWhatsappTargets.length} con teléfono)`
                        : ''}
                    </span>
                    <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200">
                      <ul className="divide-y divide-slate-100">
                        {whatsappTargetsMeta.map((target) => (
                          <li
                            key={target.prospecto.id}
                            className="flex items-center justify-between px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium text-slate-700">
                                {target.prospecto.nombre}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {target.rawPhone || 'Sin teléfono registrado'}
                              </p>
                            </div>
                            <span
                              className={`text-xs font-medium ${
                                target.isValid ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {target.isValid ? 'Listo' : 'Sin teléfono válido'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {invalidWhatsappTargets.length > 0 ? (
                      <p className="text-xs text-amber-600">
                        {invalidWhatsappTargets.length === 1
                          ? '1 prospecto se omitirá al enviar el mensaje por no tener teléfono válido.'
                          : `${invalidWhatsappTargets.length} prospectos se omitirán al enviar el mensaje por no tener teléfono válido.`}
                      </p>
                    ) : null}
                  </div>
                </div>

                {plantillasLoading ? (
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando plantillas...
                  </div>
                ) : null}

                {!plantillasLoading && plantillasError ? (
                  <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    <p>{plantillasError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPlantillas()}
                    >
                      Reintentar
                    </Button>
                  </div>
                ) : null}

                {!plantillasLoading && !plantillasError ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="plantilla-whatsapp">
                      Plantilla de WhatsApp
                    </label>
                    <Select
                      value={selectedPlantillaId}
                      onValueChange={setSelectedPlantillaId}
                      disabled={activePlantillas.length === 0}
                    >
                      <SelectTrigger id="plantilla-whatsapp" className="w-full">
                        <SelectValue placeholder="Selecciona una plantilla" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePlantillas.length === 0 ? (
                          <SelectItem value="__EMPTY__" disabled>
                            No hay plantillas registradas
                          </SelectItem>
                        ) : (
                          activePlantillas.map((plantilla) => (
                            <SelectItem key={plantilla.id} value={plantilla.id}>
                              {plantilla.titulo || 'Sin título'}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {activePlantillas.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Aún no hay plantillas disponibles. Registra una en la sección de plantillas.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {selectedPlantilla ? (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Vista previa</span>
                    <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      {selectedPlantilla.mensaje || 'Sin contenido'}
                    </div>
                  </div>
                ) : null}

                {whatsappError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {whatsappError}
                  </div>
                ) : null}

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWhatsappDialogOpen(false)}
                    disabled={sendingWhatsapp}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-600 text-white hover:bg-green-700"
                    disabled={
                      sendingWhatsapp ||
                      plantillasLoading ||
                      Boolean(plantillasError) ||
                      activePlantillas.length === 0 ||
                      !selectedPlantillaId ||
                      !hasValidWhatsappTarget
                    }
                    title={
                      !hasValidWhatsappTarget
                        ? 'Los prospectos seleccionados no tienen teléfono válido.'
                        : undefined
                    }
                  >
                    {sendingWhatsapp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...
                      </>
                    ) : (
                      <>
                        <WhatsAppIcon className="mr-2 h-4 w-4" /> Enviar WhatsApp
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecciona un prospecto para enviar un mensaje de WhatsApp.
              </p>
            )}
          </DialogContent>
        </Dialog>
        </TabsContent>
      )}

      {visibleTabs.includes('empleados') && (
        <TabsContent value="empleados" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-orange-600">Empleados CROV</h2>
            <p className="text-sm text-muted-foreground">
              Administra los colaboradores de CROV y mantén actualizado su perfil.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEmpleados()}
              disabled={empleadosLoading || !empleadosEndpoint || !token}
            >
              {empleadosLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
            <Button
              size="sm"
              onClick={handleEmpleadoCreate}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!empleadosEndpoint || !token}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Nuevo empleado
            </Button>
          </div>
        </div>

        {!apiUrl && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
          </div>
        )}
        {!token && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            No se encontró el token interno. Inicia sesión nuevamente.
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-full max-w-sm">
            <Input
              value={empleadosSearch}
              onChange={(event) => setEmpleadosSearch(event.target.value)}
              placeholder="Buscar por nombre, puesto o contacto"
              className="w-full"
            />
          </div>
        </div>

        <div className="overflow-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-100">
                <TableHead>Nombre</TableHead>
                <TableHead>Puesto</TableHead>
                 <TableHead>Residente</TableHead>
                 <TableHead>Proyecto residencia</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Fecha de nacimiento</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empleadosLoading && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    Cargando empleados CROV...
                  </TableCell>
                </TableRow>
              )}

              {!empleadosLoading && filteredEmpleados.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    {empleadosSearch.trim()
                      ? 'No se encontraron empleados que coincidan con la búsqueda.'
                      : 'No hay empleados CROV registrados.'}
                  </TableCell>
                </TableRow>
              )}

              {!empleadosLoading &&
                filteredEmpleados.map((empleado) => (
                  <TableRow key={empleado.id} className="border-t">
                    <TableCell className="font-medium flex">
                       <div className="flex items-center gap-2 min-w-0">
                        <AvatarEmpleado
                          empleado={{nombre_completo: empleado.nombreCompleto, color_perfil: empleado.color_perfil}}
                          className="h-8 w-8 border-2 border-white shadow-sm"
                          initialsSize="text-xs"
                        />
                        <span className="truncate text-sm text-wrap">
                          {empleado.nombreCompleto}
                        </span>
                       </div>
                    </TableCell>
                    <TableCell>
                      {empleado.puesto ? empleadoPuestoLabels[empleado.puesto] : 'Sin puesto'}
                    </TableCell>
                    <TableCell>{empleado.residente === 1 ? 'Sí' : 'No'}</TableCell>
                    <TableCell>{empleado.sistema_residencia?.nombre ?? 'Sin proyecto'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{empleado.celular || 'Sin celular'}</span>
                        <span className="text-xs text-muted-foreground">
                          {empleado.correo || 'Sin correo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDisplayDate(empleado.fechaNacimiento)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          empleado.activo === 1
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-slate-200 bg-slate-100 text-slate-600'
                        }
                      >
                        {empleado.activo === 1 ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmpleadoEdit(empleado)}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEmpleadoPermisos(empleado)}
                          disabled={!permisosInternalEndpoint || !token || permisosLoading}
                        >
                          <ShieldCheck/>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmpleadoDelete(empleado)}
                          className="text-red-600 hover:text-red-700"
                          disabled={empleadoDeletingId === empleado.id}
                        >
                          {empleadoDeletingId === empleado.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={empleadoDialogOpen} onOpenChange={setEmpleadoDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmpleado ? 'Editar empleado CROV' : 'Nuevo empleado CROV'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEmpleadoSubmit} className="space-y-4">
              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="empleado_nombre">
                  Nombre completo
                </label>
                <Input
                  id="empleado_nombre"
                  value={empleadoForm.nombreCompleto}
                  onChange={(event) =>
                    updateEmpleadoFormField('nombreCompleto', event.target.value)
                  }
                  placeholder="Ej. María López"
                  required
                />
              </div>

                 <div className="grid gap-3 md:grid-cols-[2fr_1fr] md:items-end">
                <div className="grid gap-3">
                  <label className="text-sm font-medium">Puesto</label>
                  <Select
                    value={empleadoForm.puesto}
                    onValueChange={(value) =>
                      updateEmpleadoFormField(
                        'puesto',
                        value as EmpleadoPuesto | typeof EMPLEADO_PUESTO_EMPTY_VALUE
                      )
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecciona el puesto" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value={EMPLEADO_PUESTO_EMPTY_VALUE}>Sin puesto</SelectItem>
                      {empleadoPuestoOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  { error && error.startsWith('Puesto') &&
                  <span className="text-sm text-red-500">
                    Completa este campo.
                  </span>
                  }
                </div>
                <label
                  htmlFor="empleado_residente"
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                   <input
                    id="empleado_residente"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={empleadoForm.residente}
                    onChange={(event) => {
                        updateEmpleadoFormField('residente', event.target.checked);
                        updateEmpleadoFormField('dias_vacaciones', 0);
                        updateEmpleadoFormField(
                                  'proyectoResidencia',
                                  null
                                );
                        updateEmpleadoFormField('montoAhorro', 0);
                      }
                    }
                    disabled={sistemas.length === 0}
                  />
                  Residente
                </label>
              </div>

              {empleadoForm.residente && (
                <div className="grid gap-3">
                  <label
                    className="text-sm font-medium"
                    htmlFor="proyecto_residencia"
                  >
                    Proyecto de residencia
                  </label>

                  <Popover
                    open={openProyectoResidenciaCombobox}
                    onOpenChange={setOpenProyectoResidenciaCombobox}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between bg-white font-normal"
                      >
                        {empleadoForm.proyectoResidencia !== null
                          ? sistemas.find(
                              (s) => s.id === empleadoForm.proyectoResidencia
                            )?.nombre ?? 'Seleccione un proyecto'
                          : 'Sin proyecto de residencia'}

                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent
                      className="w-full p-0 bg-white"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Buscar proyecto..." />
                        <CommandList>
                          <CommandEmpty>
                            No se encontró el proyecto.
                          </CommandEmpty>

                          <CommandGroup>
                            <CommandItem
                              value="sin-proyecto"
                              onSelect={() => {
                                updateEmpleadoFormField(
                                  'proyectoResidencia',
                                  null
                                );
                                setOpenProyectoResidenciaCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  empleadoForm.proyectoResidencia === null
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              Sin proyecto de residencia
                            </CommandItem>

                            {sistemas.map((sistema) => (
                              <CommandItem
                                key={sistema.id}
                                value={sistema.nombre}
                                onSelect={() => {
                                  updateEmpleadoFormField(
                                    'proyectoResidencia',
                                    sistema.id
                                  );
                                  setOpenProyectoResidenciaCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    empleadoForm.proyectoResidencia === sistema.id
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                {sistema.nombre}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  { error && error.startsWith('El proyecto de residencia') &&
                  <span className="text-sm text-red-500">
                    {error}
                  </span>
                  }
                </div>
              )}
   

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="empleado_celular">
                    Celular
                  </label>
                  <Input
                    id="empleado_celular"
                    type="tel"
                    value={empleadoForm.celular}
                    onChange={(event) => updateEmpleadoFormField('celular', event.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="empleado_correo">
                    Correo electrónico
                  </label>
                  <Input
                    id="empleado_correo"
                    type="email"
                    value={empleadoForm.correo}
                    onChange={(event) =>
                      updateEmpleadoFormField('correo', event.target.value)
                    }
                    placeholder={'Obligatorio'}
                    required
                  />
                </div>
              </div>
               <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="empleado_password">
                  Password
                </label>
                <Input
                  id="empleado_password"
                  type="password"
                  value={empleadoForm.password}
                  onChange={(event) =>
                    updateEmpleadoFormField('password', event.target.value)
                  }
                  placeholder={editingEmpleado ? 'Opcional' : 'Obligatorio'}
                  required={!editingEmpleado}
                />
              </div>   
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="empleado_fecha_nacimiento">
                    Fecha de nacimiento
                  </label>
                  <Input
                    id="empleado_fecha_nacimiento"
                    type="date"
                    value={empleadoForm.fechaNacimiento}
                    onChange={(event) => {
                        updateEmpleadoFormField('fechaNacimiento', event.target.value);
                      }
                    }
                  />
                </div>
                {!empleadoForm.residente && (
                  <div className="grid gap-3">
                    <label className="text-sm font-medium" htmlFor="dias_vacaciones">
                      Días de vacaciones
                    </label>
                    <Input
                      id="dias_vacaciones"
                      type="number"
                      min="0"
                      value={empleadoForm.dias_vacaciones}
                      onChange={(event) => {
                        const valor = parseInt(event.target.value);
                        updateEmpleadoFormField('dias_vacaciones', isNaN(valor) ? 0 : valor);
                      }}
                      placeholder="0"
                    />
                  </div>
                )}

                {!empleadoForm.residente && (
                  <div className="grid gap-3">
                    <label className="text-sm font-medium" htmlFor="monto_de_ahorro">
                      Monto de ahorro
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">$</span>
                      <Input
                        id="monto_de_ahorro"
                        type="number"
                        className="pl-7" 
                        value={empleadoForm.montoAhorro}
                        onChange={(event) => {
                          const regex = /^\d*(\.\d{0,3})?$/;
                          const valor = event.target.value;
                          if (regex.test(valor)) {
                            const valorNumerico = valor === '' ? 0 : parseFloat(valor);
                            updateEmpleadoFormField('montoAhorro', valorNumerico);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmpleadoDialogOpen(false)}
                  disabled={empleadosSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={empleadosSaving}
                >
                  {empleadosSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingEmpleado ? (
                    'Guardar cambios'
                  ) : (
                    'Crear empleado'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={empleadoPermisosOpen} onOpenChange={setEmpleadoPermisosOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Permisos de {empleadoPermisos?.nombreCompleto || 'empleado'}
              </DialogTitle>
              {empleadoPermisos?.puesto && (
                <p className="text-sm text-muted-foreground">
                  Puesto: {empleadoPuestoLabels[empleadoPermisos.puesto]}
                </p>
              )}
            </DialogHeader>

            {permisosError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {permisosError}
              </div>
            )}

            <div className="flex gap-4 py-4">
              <div className="flex-1 overflow-auto rounded border bg-white max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-orange-100 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Disponibles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permisosLoading && (
                      <tr>
                        <td className="p-2 text-sm text-muted-foreground">
                          Cargando permisos...
                        </td>
                      </tr>
                    )}
                    {!permisosLoading && permisosDisponibles.length === 0 && (
                      <tr>
                        <td className="p-2 text-sm text-muted-foreground">
                          No hay permisos disponibles.
                        </td>
                      </tr>
                    )}
                    {!permisosLoading &&
                      permisosDisponibles.map((permiso) => (
                        <tr key={permiso.id} className="border-t hover:bg-orange-50">
                          <td className="p-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPermisosDisponibles.some(
                                  (item) => item.id === permiso.id
                                )}
                                onChange={() => togglePermisoDisponible(permiso)}
                                style={{ accentColor: '#ea580c' }}
                              />
                              <span>{permiso.nombre}</span>
                            </label>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col justify-center gap-2 items-center">
                <span className="text-sm">
                  Seleccionados:{' '}
                  {selectedPermisosDisponibles.length + selectedPermisosAsignados.length}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={asignarPermisosEmpleado}
                  disabled={permisosSaving || permisosLoading}
                >
                  <FastForward className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={quitarPermisosEmpleado}
                  disabled={permisosSaving || permisosLoading}
                >
                  <Rewind className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limpiarPermisosSeleccion}
                  disabled={permisosSaving || permisosLoading}
                >
                  Borrar selección
                </Button>
              </div>

              <div className="flex-1 overflow-auto rounded border bg-white max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-orange-100 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Asignados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permisosLoading && (
                      <tr>
                        <td className="p-2 text-sm text-muted-foreground">
                          Cargando permisos...
                        </td>
                      </tr>
                    )}
                    {!permisosLoading && permisosAsignados.length === 0 && (
                      <tr>
                        <td className="p-2 text-sm text-muted-foreground">
                          Este empleado no tiene permisos asignados.
                        </td>
                      </tr>
                    )}
                    {!permisosLoading &&
                      permisosAsignados.map((permiso) => (
                        <tr key={permiso.id} className="border-t hover:bg-orange-50">
                          <td className="p-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPermisosAsignados.some(
                                  (item) => item.id === permiso.id
                                )}
                                onChange={() => togglePermisoAsignado(permiso)}
                                style={{ accentColor: '#ea580c' }}
                              />
                              <span>{permiso.nombre}</span>
                            </label>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEmpleadoPermisosOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </TabsContent>
      )}

      {visibleTabs.includes('tickets') && (
        <TabsContent value="tickets" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-orange-600">Tickets de soporte CROV</h2>
            <p className="text-sm text-muted-foreground">
              Gestiona los reportes de soporte y da seguimiento a su atención.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTickets()}
              disabled={ticketsLoading || !ticketsEndpoint || !token}
            >
              {ticketsLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
            <Button
              size="sm"
              onClick={handleTicketCreate}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!ticketsEndpoint || !token}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Nuevo ticket
            </Button>
          </div>
        </div>

        {!apiUrl && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
          </div>
        )}
        {!token && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            No se encontró el token interno. Inicia sesión nuevamente.
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full max-w-sm">
            <Input
              value={ticketsSearch}
              onChange={(event) => setTicketsSearch(event.target.value)}
              placeholder="Buscar por folio, cliente o contacto"
              className="w-full"
            />
          </div>
          <div className="w-full max-w-xs">
            <Select
              value={ticketEstadoFilter}
              onValueChange={(value) =>
                setTicketEstadoFilter(value as 'TODOS' | EstadoSolicitudTicket)
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                {estadoSolicitudOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full max-w-xs">
            <Select
              value={ticketPrioridadFilter}
              onValueChange={(value) =>
                setTicketPrioridadFilter(value as 'TODAS' | PrioridadTicket)
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Filtrar por prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las prioridades</SelectItem>
                {prioridadOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full max-w-xs">
            <Select
              value={ticketGarantiaFilter}
              onValueChange={(value) =>
                setTicketGarantiaFilter(value as 'TODAS' | GarantiaTicket)
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Filtrar por garantía" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las garantías</SelectItem>
                {garantiaOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-1">
            <label
              className="text-sm font-medium text-muted-foreground"
              htmlFor="ticket_fecha_inicio"
            >
              Fecha recepción inicio
            </label>
            <Input
              id="ticket_fecha_inicio"
              type="date"
              value={ticketFechaInicio}
              onChange={(event) => setTicketFechaInicio(event.target.value)}
              className="bg-white"
            />
          </div>
          <div className="flex w-full max-w-xs flex-col gap-1">
            <label
              className="text-sm font-medium text-muted-foreground"
              htmlFor="ticket_fecha_fin"
            >
              Fecha recepción fin
            </label>
            <Input
              id="ticket_fecha_fin"
              type="date"
              value={ticketFechaFin}
              onChange={(event) => setTicketFechaFin(event.target.value)}
              className="bg-white"
            />
          </div>
        </div>

        <div className="overflow-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-100">
                <TableHead>Folio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Negocio</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Garantía</TableHead>
                <TableHead>Tipo de problema</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Fecha registro</TableHead>
                <TableHead>Fecha solución</TableHead>
                <TableHead>Tiempo de respuesta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsLoading && (
                <TableRow>
                  <TableCell
                    colSpan={13}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    Cargando tickets de soporte CROV...
                  </TableCell>
                </TableRow>
              )}

              {!ticketsLoading && filteredTickets.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={13}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    {ticketsSearch.trim() ||
                    ticketEstadoFilter !== 'TODOS' ||
                    ticketPrioridadFilter !== 'TODAS' ||
                    ticketGarantiaFilter !== 'TODAS' ||
                    ticketFechaInicio !== defaultTicketDateRange.start ||
                    ticketFechaFin !== defaultTicketDateRange.end
                      ? 'No se encontraron tickets que coincidan con la búsqueda o filtros.'
                      : 'No hay tickets de soporte CROV registrados.'}
                  </TableCell>
                </TableRow>
              )}

              {!ticketsLoading &&
                filteredTickets.map((ticket) => {
                  const responsable = resolveEmpleadoNombre(ticket) ?? 'Sin asignar';
                  const tiempoRespuesta = resolveTicketTiempoRespuesta(ticket);
                  return (
                    <TableRow key={ticket.id} className="border-t">
                      <TableCell className="font-medium">{ticket.folio || 'Sin folio'}</TableCell>
                      <TableCell>{ticket.nombre_cliente || 'Sin cliente'}</TableCell>
                      <TableCell>{ticket.nombre_negocio || 'Sin negocio'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{ticket.telefono || 'Sin teléfono'}</span>
                          <span className="text-xs text-muted-foreground">
                            {ticket.correo || 'Sin correo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{garantiaLabels[ticket.garantia]}</TableCell>
                      <TableCell>{tipoProblemaLabels[ticket.tipo_problema]}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={prioridadBadgeStyles[ticket.prioridad]}
                        >
                          {prioridadLabels[ticket.prioridad]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={estadoSolicitudBadgeStyles[ticket.estado_solicitud]}
                        >
                          {estadoSolicitudLabels[ticket.estado_solicitud]}
                        </Badge>
                      </TableCell>
                      <TableCell>{responsable}</TableCell>
                      <TableCell>{formatDateTime(ticket.fecha_registro)}</TableCell>
                      <TableCell>
                        {ticket.fecha_solucion
                          ? formatDateTime(ticket.fecha_solucion)
                          : 'Sin solución'}
                      </TableCell>
                      <TableCell>{tiempoRespuesta ?? 'Sin registro'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTicketView(ticket)}
                            className="text-slate-600 hover:text-slate-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTicketEdit(ticket)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTicketDelete(ticket)}
                            className="text-red-600 hover:text-red-700"
                            disabled={ticketDeletingId === ticket.id}
                          >
                            {ticketDeletingId === ticket.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTicket
                  ? 'Editar ticket de soporte CROV'
                  : 'Nuevo ticket de soporte CROV'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="ticket_folio">
                    Folio
                  </label>
                  <Input
                    id="ticket_folio"
                    value={ticketForm.folio}
                    placeholder="Ej. CR-000001"
                    readOnly
                    className="cursor-default bg-muted"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="ticket_cliente_buscar">
                  Cliente
                </label>
                <Input
                  id="ticket_cliente_buscar"
                  value={ticketClienteSearch}
                  onChange={(event) => {
                    setTicketClienteSearchActive(true);
                    setTicketClienteSearch(event.target.value);
                  }}
                  onFocus={() => setTicketClienteSearchActive(true)}
                  onBlur={() => {
                    setTimeout(() => setTicketClienteSearchActive(false), 150);
                  }}
                  placeholder="Buscar por nombre del cliente, negocio o teléfono"
                  autoComplete="off"
                  disabled={ticketsSaving || loading || clientes.length === 0}
                />
                {clientes.length === 0 && !loading ? (
                  <p className="text-xs text-muted-foreground">
                    No hay clientes CROV registrados. Registra un cliente para poder crear tickets.
                  </p>
                ) : ticketClienteSearchActive ? (
                  <>
                    {!ticketClienteSearchHasEnoughInput ? (
                      <p className="text-xs text-muted-foreground">
                        Ingresa al menos 2 letras o 3 números para buscar un cliente.
                      </p>
                    ) : ticketClienteMatches.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No se encontraron clientes que coincidan con la búsqueda.
                      </p>
                    ) : (
                      <div className="max-h-56 overflow-y-auto rounded-md border border-orange-100 bg-white shadow-sm">
                        <ul className="divide-y divide-orange-100">
                          {ticketClienteMatches.map((cliente) => (
                            <li key={cliente.id}>
                              <button
                                type="button"
                                onClick={() => handleTicketClienteSelect(cliente)}
                                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-slate-700 transition hover:bg-orange-50 focus:bg-orange-100 focus:outline-none"
                              >
                                <span className="text-sm font-medium">
                                  {cliente.nombre_cliente}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {cliente.nombre_negocio}
                                </span>
                                {cliente.telefono && (
                                  <span className="text-xs text-slate-400">
                                    {cliente.telefono}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : ticketClienteSelectedSummary ? (
                  <p className="text-xs text-muted-foreground">
                    Cliente seleccionado: <span className="font-medium text-slate-700">{ticketClienteSelectedSummary}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Escribe para buscar y seleccionar un cliente.
                  </p>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="ticket_nombre_cliente">
                    Nombre del cliente
                  </label>
                  <Input
                    id="ticket_nombre_cliente"
                    value={ticketForm.nombre_cliente}
                    readOnly
                    required
                    placeholder="Selecciona un cliente"
                    className="cursor-default bg-muted"
                  />
                </div>
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="ticket_nombre_negocio">
                    Nombre del negocio
                  </label>
                  <Input
                    id="ticket_nombre_negocio"
                    value={ticketForm.nombre_negocio}
                    readOnly
                    required
                    placeholder="Selecciona un cliente"
                    className="cursor-default bg-muted"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="ticket_correo">
                    Correo electrónico
                  </label>
                  <Input
                    id="ticket_correo"
                    type="email"
                    value={ticketForm.correo}
                    onChange={(event) => updateTicketFormField('correo', event.target.value)}
                    placeholder="Opcional"
                    disabled={ticketsSaving}
                  />
                </div>
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="ticket_telefono">
                    Teléfono
                  </label>
                  <Input
                    id="ticket_telefono"
                    type="tel"
                    value={ticketForm.telefono}
                    onChange={(event) => updateTicketFormField('telefono', event.target.value)}
                    placeholder="Opcional"
                    disabled={ticketsSaving}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium">Garantía</label>
                  <Select
                    value={ticketForm.garantia}
                    onValueChange={(value) =>
                      updateTicketFormField('garantia', value as GarantiaTicket)
                    }
                    disabled={ticketsSaving}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecciona la garantía" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-md">
                      {garantiaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <label className="text-sm font-medium">Tipo de problema</label>
                  <Select
                    value={ticketForm.tipo_problema}
                    onValueChange={(value) =>
                      updateTicketFormField('tipo_problema', value as TipoProblemaTicket)
                    }
                    disabled={ticketsSaving}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecciona el tipo de problema" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-md">
                      {tipoProblemaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>

                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium">Prioridad</label>
                  <Select
                    value={ticketForm.prioridad}
                    onValueChange={(value) =>
                      updateTicketFormField('prioridad', value as PrioridadTicket)
                    }
                    disabled={ticketsSaving}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecciona la prioridad" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-md">

                    {prioridadOptions.map((option) => {
                      const Icon = option.icon;

                      return (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="my-1 cursor-pointer"
                        >
                        <div
                          className={`flex items-center gap-2 justify-between w-full px-3 py-1 rounded-full border text-sm font-medium bg-white ${option.className}`}
                          >
                          <span>{option.label}</span>
                          <Icon className="w-4 h-4" />
                        </div>
                        </SelectItem>
                        );
                    })}

                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <label className="text-sm font-medium">Estado de la solicitud</label>
                  <Select
                    value={ticketForm.estado_solicitud}
                    onValueChange={(value) =>
                      updateTicketFormField('estado_solicitud', value as EstadoSolicitudTicket)
                    }
                    disabled={ticketsSaving}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecciona el estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-md">
                      {estadoSolicitudOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                      ))}
                    </SelectContent>

                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="grid gap-3">
                  <label className="text-sm font-medium" htmlFor="ticket_empleado">
                    Responsable CROV
                  </label>
                  <Select
                    value={
                      ticketForm.id_empleado_crov || TICKET_RESPONSABLE_EMPTY_VALUE
                    }
                    onValueChange={(value) =>
                      updateTicketFormField(
                        'id_empleado_crov',
                        value === TICKET_RESPONSABLE_EMPTY_VALUE ? '' : value
                      )
                    }
                    disabled={ticketsSaving}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecciona al responsable" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60 overflow-y-auto border border-gray-200 shadow-md">
                      <SelectItem value={TICKET_RESPONSABLE_EMPTY_VALUE}>
                      Sin asignar
                      </SelectItem>
                      {empleados
                      .filter((empleado) => empleado.activo === 1)
                      .map((empleado) => (
                      <SelectItem key={empleado.id} value={String(empleado.id)}>
                        {empleado.nombreCompleto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="ticket_descripcion">
                  Descripción del problema
                </label>
                <textarea
                  id="ticket_descripcion"
                  value={ticketForm.descripcion}
                  onChange={(event) => updateTicketFormField('descripcion', event.target.value)}
                  placeholder="Describe el problema reportado"
                  disabled={ticketsSaving}
                  className="min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                />
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium" htmlFor="ticket_descripcion_solucion">
                  Descripción de la solución
                </label>
                <textarea
                  id="ticket_descripcion_solucion"
                  value={ticketForm.descripcion_solucion}
                  onChange={(event) =>
                    updateTicketFormField('descripcion_solucion', event.target.value)
                  }
                  placeholder="Detalle cómo se resolvió el ticket (opcional)"
                  disabled={ticketsSaving}
                  className="min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTicketDialogOpen(false)}
                  disabled={ticketsSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={ticketsSaving}
                >
                  {ticketsSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingTicket ? (
                    'Guardar cambios'
                  ) : (
                    'Crear ticket'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={ticketDetailOpen} onOpenChange={setTicketDetailOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {ticketDetail ? `Ticket ${ticketDetail.folio || ''}` : 'Detalle del ticket'}
              </DialogTitle>
            </DialogHeader>
            {ticketDetail && (
              <div className="space-y-4 text-sm">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Cliente</p>
                    <p className="font-medium">{ticketDetail.nombre_cliente || 'Sin cliente'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Negocio</p>
                    <p className="font-medium">{ticketDetail.nombre_negocio || 'Sin negocio'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Prioridad</p>
                    <Badge
                      variant="outline"
                      className={prioridadBadgeStyles[ticketDetail.prioridad]}
                    >
                      {prioridadLabels[ticketDetail.prioridad]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Estado</p>
                    <Badge
                      variant="outline"
                      className={estadoSolicitudBadgeStyles[ticketDetail.estado_solicitud]}
                    >
                      {estadoSolicitudLabels[ticketDetail.estado_solicitud]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Garantía</p>
                    <p className="font-medium">{garantiaLabels[ticketDetail.garantia]}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Tipo de problema</p>
                    <p className="font-medium">
                      {tipoProblemaLabels[ticketDetail.tipo_problema]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Responsable CROV</p>
                    <p className="font-medium">
                      {resolveEmpleadoNombre(ticketDetail) ?? 'Sin asignar'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Tiempo de respuesta</p>
                    <p className="font-medium">
                      {resolveTicketTiempoRespuesta(ticketDetail) ?? 'Sin registro'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Correo</p>
                    <p className="font-medium">{ticketDetail.correo || 'Sin correo'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{ticketDetail.telefono || 'Sin teléfono'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Fecha registro</p>
                    <p className="font-medium">
                      {formatDateTime(ticketDetail.fecha_registro)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Fecha solución</p>
                    <p className="font-medium">
                      {ticketDetail.fecha_solucion
                        ? formatDateTime(ticketDetail.fecha_solucion)
                        : 'Sin solución'}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <p className="text-xs uppercase text-muted-foreground">Descripción</p>
                  <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
                    {ticketDetail.descripcion || 'Sin descripción capturada.'}
                  </div>
                </div>
                <div className="grid gap-2">
                  <p className="text-xs uppercase text-muted-foreground">
                    Descripción de la solución
                  </p>
                  <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
                    {ticketDetail.descripcion_solucion || 'Sin descripción de solución.'}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </TabsContent>
      )}

      {visibleTabs.includes('historial_ahorros') && (
        <TabsContent value="historial_ahorros" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-orange-600">Historial de ahorros</h2>
              <p className="text-sm text-muted-foreground">
                Registra y da seguimiento a los ahorros de los colaboradores de CROV.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchHistorialAhorros()}
                disabled={historialAhorrosLoading || !historicoAhorrosEmpleadosEndpoint || !token}
              >
                {historialAhorrosLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Actualizar
              </Button>
              <DialogRetirarAhorro onSuccess={() => fetchHistorialAhorros()}/>
              <Button
                size="sm"
                onClick={()=> {
                  setCrearNuevoAhorroDialogOpen(true)
                  setHistorialAhorroEditingId(null);
                  setCrearNuevoAhorroDialogOpen(true);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                // disabled={!empleadosEndpoint || !token}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar ahorro
              </Button>


            </div>
          </div>
          
          {!apiUrl && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
              Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
            </div>
          )}
          {!token && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
              No se encontró el token interno. Inicia sesión nuevamente.
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* TARJETA QUE MUESTRA EL TOTAL DE AHORROS GRAL. O EN CASO DE HACER UNA BUSQUEDA POR EMPLEADO,
          MUESTRA EL DE DICHO EMPLEADO */}
          <div className="flex flex-wrap items-center gap-4 sm:max-w-full">
            <div className={`rounded-lg border px-4 py-3 bg-orange-50 border-orange-200 text-orange-600`}>
              
              {/* Label descriptivo */}
              <p className="text-sm text-muted-foreground truncate max-w-[250px] text-wrap">
                {loadingTotalAhorrosGeneralOPorEmpleado ? "Calculando..." : totalAhorrosGeneralOPorEmpleado.label}
              </p>

              {/* Valor o Skeleton de carga */}
              {loadingTotalAhorrosGeneralOPorEmpleado ? (
                <div className="mt-1 h-7 w-32 animate-pulse rounded bg-gray-300/50" />
              ) : (
                <p className="text-xl font-bold">
                  {new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2,
                  }).format(totalAhorrosGeneralOPorEmpleado.total)}
                </p>
              )}
            </div>
          </div>

          <div className="w-full max-w-sm">
            <Input
              value={historialAhorrosSearch}
              onChange={(event) => setHistorialAhorrosSearch(event.target.value)}
              placeholder="Buscar por empleado o fecha"
              className="w-full"
            />
          </div>

          <div className="overflow-auto rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100">
                  <TableHead className="whitespace-nowrap">Empleado</TableHead>
                  <TableHead className="whitespace-nowrap">Fecha</TableHead>
                  <TableHead className="whitespace-nowrap">Tipo</TableHead>
                  <TableHead className="whitespace-nowrap">Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead> 
                </TableRow>
              </TableHeader>
              <TableBody>
                {historialAhorrosLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10">
                      <div className="flex w-full items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                        <span className="ml-2 text-sm text-muted-foreground">Cargando historial...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!historialAhorrosLoading && filteredHistorialAhorros.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      {historialAhorros.length > 0
                        ? 'No se encontraron ahorros que coincidan con la búsqueda.'
                        : 'Sin historial'}
                    </TableCell>
                  </TableRow>
                )}

                {!historialAhorrosLoading &&
                  filteredHistorialAhorros.map((ahorro: AhorroEmpleado) => {
                    return (
                      <TableRow key={ahorro.id} className="border-t">
                        <TableCell className="font-medium">{ahorro.empleado.nombre_completo}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDisplayDate(ahorro.fecha)}
                        </TableCell>
                        <TableCell>
                          {ahorro.retiro ? "Retiro" : "Ahorro"}
                        </TableCell>
                        <TableCell>
                          {`${ahorro.retiro ? "- ": "+ "} ${new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: "MXN",
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2,
                          }).format(ahorro.monto)}`}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {ahorro.retiro ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-600 hover:text-orange-700"
                          disabled
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCrearNuevoAhorroDialogOpen(true);
                                    setHistorialAhorroEditingId(ahorro.id);
                                  }}
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {handleDeleteAhorroEmpleado(ahorro)}}
                                  className="text-red-600 hover:text-red-700"
                                  disabled={deletingAhorroEmpleado}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                })}

              </TableBody>
            </Table>
          </div>
          
          { crearNuevoAhorroDialogOpen &&
            <DialogAddOrEditSavings
              open={crearNuevoAhorroDialogOpen}
              setOpen={(open) => {
                setCrearNuevoAhorroDialogOpen(open);
                if (!open) {
                  setHistorialAhorroEditingId(null);
                }
              }}
              historialAhorroEditingId={historialAhorroEditingId}
              onSuccess={()=>{
                fetchHistorialAhorros();
              }}
              onError={(message:string) => {
                toast.error(message);
              }}
            />
          }

        </TabsContent>
      )}

      {visibleTabs.includes('mi_ahorro') && (
        <TabsContent value="mi_ahorro" className="space-y-6">
           <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-orange-600">Mi ahorro</h2>
              <p className="text-sm text-muted-foreground">
                Consulta el estado actual y el histórico de tus ahorros
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchHistorialMiAhorro()}
                disabled={loadingHistorialMisAhorros || !token}
              >
                {loadingHistorialMisAhorros ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Actualizar
              </Button>
            </div>
           </div>
           {!apiUrl && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
              Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
            </div>
          )}
          {!token && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
              No se encontró el token interno. Inicia sesión nuevamente.
            </div>
          )}
          {errorHistorialMisAhorros && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorHistorialMisAhorros}
            </div>
          )}

           {/* TARJETA QUE MUESTRA EL TOTAL DE AHORROS DEL EMPLEADO LOGGEADO*/}
          <div className="flex flex-wrap items-center gap-4 sm:max-w-full">
            <div className={`rounded-lg border px-4 py-3 bg-orange-50 border-orange-200 text-orange-600`}>
              
              {/* Label descriptivo */}
              <p className="text-sm text-muted-foreground truncate max-w-[250px] text-wrap">
                Total acumulado
              </p>

              {/* Valor o Skeleton de carga */}
              {loadingHistorialMisAhorros ? (
                <div className="mt-1 h-7 w-32 animate-pulse rounded bg-gray-300/50" />
              ) : (
                <p className="text-xl font-bold">
                  {new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(historialMisAhorros?.totalAhorro ?? 0)}
                </p>
              )}
            </div>
          </div>

          <div className="overflow-auto rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100">
                  <TableHead className="whitespace-nowrap">Fecha</TableHead>
                  <TableHead className="whitespace-nowrap">Tipo</TableHead>
                  <TableHead className="whitespace-nowrap">monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingHistorialMisAhorros && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10">
                      <div className="flex w-full items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                        <span className="ml-2 text-sm text-muted-foreground">Cargando historial...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!loadingHistorialMisAhorros && (historialMisAhorros?.ahorros?.length || 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      Sin historial
                    </TableCell>
                  </TableRow>
                )}

                {!loadingHistorialMisAhorros && 
                  historialMisAhorros?.ahorros?.map((ahorro: MiAhorroItem) => {
                    return (
                      <TableRow key={ahorro.id} className="border-t">
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDisplayDate(ahorro.fecha)}
                        </TableCell>
                        <TableCell>{ahorro.retiro ? "Retiro" : "Ahorro"}</TableCell>
                        <TableCell>
                          {`${ahorro.retiro ? "- ": "+ "} ${new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: "MXN",
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2,
                          }).format(ahorro.monto)}`}
                        </TableCell>
                      </TableRow>
                    );
                })}

              </TableBody>
            </Table>
          </div>

        </TabsContent>
      )}
    </Tabs>
  );
}

export default function CrovPage() {
  return <CrovModule mode="catalogs" />;
}
