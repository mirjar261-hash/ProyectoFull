'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { normalizeUnicodeText } from '@/lib/text';
import { getInternalAuthHeaders } from '@/lib/internalAuth';
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Users,
  CreditCard,
  CalendarClock,
  MessageCircle,
  Mail,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

interface Empresa {
  id: number;
  nombre: string;
  token: string;
  fecha_vencimiento: string;
  tel: string;
  direccion?: string;
  adminCorreo?: string;
  correo?: string;
}

interface Usuario {
  id: number;
  perfil: string;
  correo: string;
  sucursal: string;
}

interface Pago {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number | string;
}

interface Plantilla {
  id: string;
  titulo: string;
  mensaje: string;
  activo?: number | string | boolean;
}

type TipoEnvio = 'whatsapp' | 'correo';


export default function ClientesPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  //const token = typeof window !== 'undefined' ? localStorage.getItem('internalToken') : null;
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activeTab, setActiveTab] = useState<'activos' | 'sinRenovar'>('activos');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [openDetalles, setOpenDetalles] = useState(false);
  const [openUsuarios, setOpenUsuarios] = useState(false);
  const [openPagos, setOpenPagos] = useState(false);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [openEditarFecha, setOpenEditarFecha] = useState(false);
  const [fechaEdicion, setFechaEdicion] = useState('');
  const [guardandoFecha, setGuardandoFecha] = useState(false);
  const [errorFecha, setErrorFecha] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [plantillasLoaded, setPlantillasLoaded] = useState(false);
  const [plantillasLoading, setPlantillasLoading] = useState(false);
  const [plantillasError, setPlantillasError] = useState<string | null>(null);
  const [openEnvio, setOpenEnvio] = useState(false);
  const [tipoEnvio, setTipoEnvio] = useState<TipoEnvio | null>(null);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [correosAdministradores, setCorreosAdministradores] = useState<
    Record<number, string>
  >({});
   const internalToken =
    typeof window !== 'undefined' ? localStorage.getItem('internalToken') : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(internalToken), [internalToken]);

  useEffect(() => {
    if (!apiUrl || !internalToken) return;

    const fetchEmpresas = async () => {
      try {
        const res = await axios.get(`${apiUrl}/empresas/activas`, {
          headers: authHeaders,
        });
       const empresasBase = res.data || [];
        const empresasConContacto = await Promise.all(
          empresasBase.map(async (emp: Empresa) => {
            try {
              const suc = await axios.get(`${apiUrl}/sucursales/${emp.id}`, {
                headers: authHeaders,
              });
              //obtener usuario administrador
              const usuariosRes = await axios.get(`${apiUrl}/empresa/${emp.id}/usuarios`, {
                headers: authHeaders,
              });
              const usuarios = usuariosRes.data || [];
              const admin = usuarios.find((u: any) => u.perfil?.toLowerCase() === "administrador");

              return {
                ...emp,
                tel: suc.data.tel,
                direccion: suc.data.direccion,
                adminCorreo: admin?.correo || "",
                correo: suc.data.correo,
              };
            } catch (e) {
              console.error('Error al obtener sucursal', e);
              return { ...emp };
            }
          })
        );
        setEmpresas(empresasConContacto);
      } catch (err) {
        console.error('Error al cargar empresas', err);
      }
    };

    fetchEmpresas();
  }, [apiUrl, internalToken,authHeaders]);
   useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

    const normalizePlantilla = (item: any): Plantilla | null => {
    if (!item) return null;
    const rawId =
      item?.id ?? item?.plantilla_id ?? item?.uuid ?? item?.clave ?? item?.value;
    if (rawId == null) return null;
    const titulo =
      typeof item?.titulo === 'string'
        ? item.titulo
        : typeof item?.nombre === 'string'
          ? item.nombre
          : '';
    const mensajeRaw =
      typeof item?.mensaje === 'string'
        ? item.mensaje
        : typeof item?.contenido === 'string'
          ? item.contenido
          : '';
    const mensaje = normalizeUnicodeText(mensajeRaw);
    return {
      id: String(rawId),
      titulo,
      mensaje,
      activo: item?.activo,
    };
  };

  const fetchPlantillas = useCallback(async () => {
    if (!apiUrl || !internalToken) return;
    setPlantillasLoading(true);
    setPlantillasError(null);
    try {
      const res = await axios.get(`${apiUrl}/crm/plantillas`, {
        headers: authHeaders,
      });
      const payload = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
      const normalized = payload
        .map(normalizePlantilla)
        .filter((item): item is Plantilla => Boolean(item?.id))
        .filter((item) => {
          const value = item.activo;
          if (value == null) return true;
          if (typeof value === 'number') return value === 1;
          if (typeof value === 'string') return value === '1' || value === 'true';
          if (typeof value === 'boolean') return value;
          return true;
        });
      setPlantillas(normalized);
      setPlantillasLoaded(true);
    } catch (err) {
      console.error('Error al cargar plantillas', err);
      setPlantillasError('No se pudieron cargar las plantillas.');
    } finally {
      setPlantillasLoading(false);
    }
  }, [apiUrl, internalToken]);

  const plantillaSeleccionada = useMemo(
    () => plantillas.find((p) => p.id === selectedPlantillaId) ?? null,
    [plantillas, selectedPlantillaId]
  );

  useEffect(() => {
    if (!openEnvio) {
      setSelectedPlantillaId('');
      setErrorEnvio(null);
      setTipoEnvio(null);
    }
  }, [openEnvio]);
  const formatFechaLegible = (fecha?: string | null) => {
    if (!fecha) return '-';
    const parsed = new Date(fecha);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('es-MX');
    }
    if (typeof fecha === 'string' && fecha.includes('T')) {
      return fecha.split('T')[0];
    }
    return fecha;
  };

  const obtenerValorInput = (fecha?: string | null) => {
    if (!fecha) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }
    const parsed = new Date(fecha);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    if (typeof fecha === 'string' && fecha.includes('T')) {
      const base = fecha.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(base)) {
        return base;
      }
    }
    return '';
  };


  const verDetalles = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setOpenDetalles(true);
  };

  const iniciarEnvio = async (empresa: Empresa, canal: TipoEnvio) => {
    setSelectedEmpresa(empresa);
    setTipoEnvio(canal);
    setOpenEnvio(true);
    setErrorEnvio(null);
    if (!plantillasLoaded) {
      await fetchPlantillas();
    }
    if (canal === 'correo') {
      obtenerCorreoAdministrador(empresa).catch((error) => {
        console.warn('No se pudo precargar el correo del administrador', error);
      });
    }
  };

  const esPerfilAdministrador = useCallback((perfil?: string | null) => {
    if (!perfil) return false;
    const normalized = String(perfil).trim().toLowerCase();
    if (!normalized) return false;
    return (
      normalized.includes('admin') ||
      normalized.includes('dueño') ||
      normalized.includes('owner') ||
      normalized.includes('administrator')
    );
  }, []);

  const extraerCorreoAdministrador = useCallback(
    (lista: Usuario[] | null | undefined) => {
      if (!Array.isArray(lista)) return '';
      for (const usuario of lista) {
        const correo = usuario?.correo?.trim();
        if (!correo) continue;
        if (esPerfilAdministrador(usuario?.perfil)) {
          return correo;
        }
      }
      return '';
    },
    [esPerfilAdministrador]
  );

  const registrarCorreoAdministrador = useCallback((empresaId: number, correo: string) => {
    if (!correo) return;
    setCorreosAdministradores((prev) => {
      if (prev[empresaId] === correo) return prev;
      return { ...prev, [empresaId]: correo };
    });
  }, []);

  const obtenerCorreoAdministrador = useCallback(
    async (empresa: Empresa) => {
      const empresaId = empresa?.id;
      if (!empresaId) return '';
      const cached = correosAdministradores[empresaId];
      if (cached) return cached;
      if (!apiUrl || !internalToken) return '';

      try {
        const res = await axios.get(`${apiUrl}/empresa/${empresaId}/usuarios`, {
          headers: authHeaders,
        });
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
            ? res.data.items
            : Array.isArray(res.data?.data)
              ? res.data.data
              : Array.isArray(res.data?.usuarios)
                ? res.data.usuarios
                : [];
        const correo = extraerCorreoAdministrador(data);
        if (correo) {
          registrarCorreoAdministrador(empresaId, correo);
          return correo;
        }
      } catch (error) {
        console.error('Error al consultar usuarios para correo administrador', error);
      }

      return '';
    },
    [
      apiUrl,
      internalToken,
      correosAdministradores,
      extraerCorreoAdministrador,
      registrarCorreoAdministrador,
    ]
  );

  // 🔹 Usuarios
  const verUsuarios = async (empresa: Empresa) => {
    if (!apiUrl || !internalToken) return;
    setSelectedEmpresa(empresa);
    try {
      const res = await axios.get(`${apiUrl}/empresa/${empresa.id}/usuarios`, {
        headers: authHeaders,
      });
      const lista = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data?.usuarios)
              ? res.data.usuarios
              : [];
      setUsuarios(lista);
      const correoAdmin = extraerCorreoAdministrador(lista);
      if (correoAdmin) {
        registrarCorreoAdministrador(empresa.id, correoAdmin);
      }
    } catch (err) {
      console.error('Error al cargar usuarios', err);
      setUsuarios([]);
    }
    setOpenUsuarios(true);
  };

  // 🔹 Cargar pagos
  const verPagos = async (empresa: Empresa) => {
    if (!apiUrl || !internalToken) return;
    setSelectedEmpresa(empresa);
    try {
      const res = await axios.get(`${apiUrl}/payments?empresaId=${empresa.id}`, {
        headers: authHeaders,
      });
      setPagos(res.data || []);
    } catch (err) {
      console.error('Error al cargar pagos', err);
      setPagos([]);
    }
    setOpenPagos(true);
  };
  const abrirEditarFecha = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setFechaEdicion(obtenerValorInput(empresa.fecha_vencimiento));
    setErrorFecha(null);
    setOpenEditarFecha(true);
  };

  const manejarCambioDialogoFecha = (open: boolean) => {
    setOpenEditarFecha(open);
    if (!open) {
      setFechaEdicion('');
      setErrorFecha(null);
    }
  };

  const guardarFecha = async () => {
    if (!apiUrl || !internalToken || !selectedEmpresa) return;
    if (!fechaEdicion) {
      setErrorFecha('Selecciona una fecha válida.');
      return;
    }

    const actual = selectedEmpresa.fecha_vencimiento;
    const timePart =
      typeof actual === 'string' && actual.includes('T')
        ? actual.slice(actual.indexOf('T'))
        : '';
    const nuevaFecha = `${fechaEdicion}${timePart}`;

    setGuardandoFecha(true);
    setErrorFecha(null);
    try {
      await axios.put(
        `${apiUrl}/empresa/${selectedEmpresa.id}`,
        { fecha_vencimiento: nuevaFecha },
        { headers: authHeaders }
      );

      setEmpresas((prev) =>
        prev.map((emp) =>
          emp.id === selectedEmpresa.id
            ? { ...emp, fecha_vencimiento: nuevaFecha }
            : emp
        )
      );
      setSelectedEmpresa((prev) =>
        prev ? { ...prev, fecha_vencimiento: nuevaFecha } : prev
      );
      setStatusMessage({
        type: 'success',
        text: 'Fecha de vencimiento actualizada correctamente.',
      });
      setOpenEditarFecha(false);
      setFechaEdicion('');
      setErrorFecha(null);
    } catch (err) {
      console.error('Error al actualizar la fecha de vencimiento', err);
      setErrorFecha('No se pudo actualizar la fecha. Intenta nuevamente.');
      setStatusMessage({
        type: 'error',
        text: 'No se pudo actualizar la fecha de vencimiento.',
      });
    } finally {
      setGuardandoFecha(false);
    }
  };

  const colorFecha = (fecha: string) => {
    const hoy = new Date();
    const venc = new Date(fecha);
    const diff = (venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'bg-red-100';
    if (diff <= 5) return 'bg-yellow-100';
    return '';
  };

  const empresasActivas = empresas.filter(
    (e) => new Date(e.fecha_vencimiento) >= new Date()
  );
  const empresasSinRenovar = empresas.filter(
    (e) => new Date(e.fecha_vencimiento) < new Date()
  );
 const normalizarTelefono = (telefono?: string | null) => {
    if (!telefono) return '';
    const digits = telefono.replace(/\D/g, '');
    if (digits.length === 10) {
      return `52${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `52${digits.slice(1)}`;
    }
    if (digits.length === 12 && digits.startsWith('52')) {
      return digits;
    }
    if (digits.length > 0) {
      return digits;
    }
    return '';
  };

  const prepararWhatsapp = (telefono: string, mensaje: string) => {
    if (typeof window === 'undefined') {
      throw new Error('La apertura de WhatsApp solo está disponible en el navegador.');
    }
    const phone = normalizarTelefono(telefono);
    if (!phone) {
      throw new Error('No se pudo determinar el número de WhatsApp del cliente.');
    }
    const sanitizedMensaje = normalizeUnicodeText(mensaje);
    const encoded = encodeURIComponent(sanitizedMensaje);
    const desktopUrl = `whatsapp://send?phone=${phone}&text=${encoded}`;
    const fallbackUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    const newWindow = window.open(desktopUrl, '_blank');
    if (!newWindow) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const timer = setTimeout(() => {
      try {
        if (!newWindow || newWindow.closed) return;
        newWindow.location.href = fallbackUrl;
      } catch (err) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      }
    }, 600);
    newWindow.addEventListener('close', () => clearTimeout(timer));
  };

  const enviarNotificacion = async () => {
    if (!apiUrl || !internalToken || !selectedEmpresa || !tipoEnvio) return;
    if (!selectedPlantillaId) {
      setErrorEnvio('Selecciona una plantilla para continuar.');
      return;
    }
    const plantilla = plantillaSeleccionada;
    if (!plantilla) {
      setErrorEnvio('La plantilla seleccionada no está disponible.');
      return;
    }
    const mensaje = normalizeUnicodeText(plantilla.mensaje ?? '');
    if (!mensaje) {
      setErrorEnvio('La plantilla seleccionada no tiene mensaje configurado.');
      return;
    }

    if (tipoEnvio === 'correo') {
      setEnviando(true);
      setErrorEnvio(null);
      try {
        const correoDestino = selectedEmpresa.adminCorreo || selectedEmpresa.correo || '';
        if (!correoDestino) {
          setErrorEnvio(
            'No se encontró un correo de administrador para enviar la plantilla.'
          );
          setEnviando(false);
          return;
        }
        registrarCorreoAdministrador(selectedEmpresa.id, correoDestino);
        
        await axios.post(
          `${apiUrl}/crm/notificaciones`,
          {
            empresaId: selectedEmpresa.id,
            plantillaId: plantilla.id,
            canal: 'correo',
            correoDestino,
          },
          {
            headers: authHeaders,
          }
        );
        setStatusMessage({
          type: 'success',
          text: 'Correo enviado correctamente.',
        });
        setOpenEnvio(false);
      } catch (err) {
        console.error('Error al enviar correo', err);
        setErrorEnvio('No se pudo enviar el correo. Intenta nuevamente.');
      } finally {
        setEnviando(false);
      }
      return;
    }

    if (!selectedEmpresa.tel) {
      setErrorEnvio('La empresa no tiene un número telefónico registrado.');
      return;
    }

    try {
      prepararWhatsapp(selectedEmpresa.tel, mensaje);
      setStatusMessage({
        type: 'success',
        text: 'Se abrió WhatsApp con el mensaje seleccionado.',
      });
      setOpenEnvio(false);
      try {
        await axios.post(
          `${apiUrl}/crm/notificaciones`,
          {
            empresaId: selectedEmpresa.id,
            plantillaId: plantilla.id,
            canal: 'whatsapp',
          },
          {
            headers: authHeaders,
          }
        );
      } catch (logError) {
        console.warn('No se pudo registrar el envío de WhatsApp', logError);
      }
    } catch (err: any) {
      console.error('Error al preparar WhatsApp', err);
      setErrorEnvio(
        err?.message || 'No se pudo abrir WhatsApp. Verifica la instalación.'
      );
    }
  };
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600">Clientes</h1>
      {statusMessage && (
        <div
          className={`rounded-md border px-4 py-2 text-sm ${
            statusMessage.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Pestañas */}
      <div className="flex gap-4 border-b mb-4">
        <button
          className={`px-4 py-2 font-semibold ${activeTab === 'activos' ? 'border-b-2 border-orange-600' : ''}`}
          onClick={() => setActiveTab('activos')}
        >
          Activos
        </button>
        <button
          className={`px-4 py-2 font-semibold ${activeTab === 'sinRenovar' ? 'border-b-2 border-orange-600' : ''}`}
          onClick={() => setActiveTab('sinRenovar')}
        >
          Sin renovar
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-auto rounded border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-100">
              <TableHead>Nombre</TableHead>
              <TableHead>Paquete</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Teléfono sucursal</TableHead>
              <TableHead>Correo administrador</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
           {(activeTab === 'activos' ? empresasActivas : empresasSinRenovar).map((e) => (
              <TableRow key={e.id} className={`border-t ${colorFecha(e.fecha_vencimiento)}`}>
                <TableCell>{e.nombre}</TableCell>
                <TableCell>{e.token}</TableCell>
                <TableCell>{e.fecha_vencimiento}</TableCell>
                <TableCell>{e.tel}</TableCell>
                <TableCell>{e.adminCorreo || "-"}</TableCell>
                <TableCell>{e.direccion}</TableCell>
                <TableCell className="space-x-2">
                  <button
                    className="text-sm text-orange-600 underline"
                    onClick={() => verDetalles(e)}
                  >
                    <FileText size={20} />
                  </button>
                  <button
                    className="text-sm text-orange-600 underline"
                    onClick={() => verUsuarios(e)}
                  >
                    <Users size={20} />
                  </button>
                  <button
                className="text-sm text-orange-600 underline"
                onClick={() => verPagos(e)}
              >
                <CreditCard size={20} />
              </button>
              <button
                    className="text-sm text-orange-600 underline"
                    onClick={() => abrirEditarFecha(e)}
                    title="Editar fecha de vencimiento"
                  >
                    <CalendarClock size={20} />
                  </button>
                    <button
                    className="text-sm text-orange-600 underline"
                    onClick={() => iniciarEnvio(e, 'whatsapp')}
                    title="Enviar mensaje por WhatsApp"
                  >
                    <MessageCircle size={20} />
                  </button>
                  <button
                    className="text-sm text-orange-600 underline"
                    onClick={() => iniciarEnvio(e, 'correo')}
                    title="Enviar correo electrónico"
                  >
                    <Mail size={20} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
             {(activeTab === 'activos' ? empresasActivas : empresasSinRenovar).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center p-4">
                  Sin empresas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       {/* Dialogo Detalles */}
      <Dialog open={openDetalles} onOpenChange={setOpenDetalles}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles de {selectedEmpresa?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 p-4">
            <p>
              <strong>Plan:</strong> {selectedEmpresa?.token}
            </p>
            <p>
              <strong>Vence:</strong> {selectedEmpresa?.fecha_vencimiento}
            </p>
            <p>
              <strong>Teléfono:</strong> {selectedEmpresa?.tel}
            </p>
            <p>
              <strong>Dirección:</strong> {selectedEmpresa?.direccion}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogo Usuarios */}
      <Dialog open={openUsuarios} onOpenChange={setOpenUsuarios}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Usuarios de {selectedEmpresa?.nombre}
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perfil</TableHead>
                <TableHead>Correo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.perfil}</TableCell>
                  <TableCell>{u.correo}</TableCell>
                </TableRow>
              ))}
              {usuarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center p-4">
                    Sin usuarios
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Dialogo Pagos */}
      <Dialog open={openPagos} onOpenChange={setOpenPagos}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Pagos de {selectedEmpresa?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded border bg-white mt-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100">
                  <TableHead>ID</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.id}</TableCell>
                    <TableCell>{(p.amount / 100).toFixed(2)}</TableCell>
                    <TableCell>{p.currency?.toUpperCase()}</TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell>
                      {typeof p.created === 'number'
                        ? new Date(p.created * 1000).toLocaleString()
                        : new Date(p.created).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {pagos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center p-4">
                      Sin pagos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openEditarFecha} onOpenChange={manejarCambioDialogoFecha}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Actualizar fecha de vencimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona la nueva fecha para {selectedEmpresa?.nombre}.
            </p>
            <div className="space-y-2">
              <label htmlFor="fecha-vencimiento" className="text-sm font-medium">
                Fecha de vencimiento
              </label>
              <Input
                id="fecha-vencimiento"
                type="date"
                value={fechaEdicion}
                onChange={(e) => setFechaEdicion(e.target.value)}
              />
            </div>
            {errorFecha && <p className="text-sm text-red-500">{errorFecha}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm"
                onClick={() => manejarCambioDialogoFecha(false)}
                disabled={guardandoFecha}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
                onClick={guardarFecha}
                disabled={guardandoFecha}
              >
                {guardandoFecha ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>   
      <Dialog open={openEnvio} onOpenChange={setOpenEnvio}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {tipoEnvio === 'correo'
                ? 'Enviar correo electrónico'
                : tipoEnvio === 'whatsapp'
                  ? 'Enviar mensaje por WhatsApp'
                  : 'Enviar comunicación'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona la plantilla que deseas utilizar para {selectedEmpresa?.nombre}.
            </p>
            {plantillasLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando plantillas...
              </div>
            )}
            {!plantillasLoading && plantillasError && (
              <p className="text-sm text-red-500">{plantillasError}</p>
            )}
            {!plantillasLoading && !plantillasError && (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="plantilla-select">
                  Plantilla
                </label>
                <Select
                  value={selectedPlantillaId}
                  onValueChange={(value) => {
                    setSelectedPlantillaId(value);
                    setErrorEnvio(null);
                  }}
                  disabled={plantillas.length === 0}
                >
                  <SelectTrigger id="plantilla-select" className="w-full">
                    <SelectValue placeholder="Selecciona una plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantillas.map((plantilla) => (
                      <SelectItem key={plantilla.id} value={plantilla.id}>
                        {plantilla.titulo || 'Sin título'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {plantillas.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay plantillas activas registradas en el CRM.
                  </p>
                )}
              </div>
            )}
            {plantillaSeleccionada && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Vista previa</span>
                <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                  {plantillaSeleccionada.mensaje || 'Sin contenido'}
                </div>
              </div>
            )}
            {errorEnvio && <p className="text-sm text-red-500">{errorEnvio}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm"
                onClick={() => setOpenEnvio(false)}
                disabled={enviando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
                onClick={enviarNotificacion}
                disabled={
                  enviando ||
                  plantillasLoading ||
                  Boolean(plantillasError) ||
                  plantillas.length === 0
                }
              >
                {enviando ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
