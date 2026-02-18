'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { normalizeUnicodeText } from "@/lib/text";
import { getInternalAuthHeaders } from "@/lib/internalAuth";
import {
  MessageCircle,
  Smile,
  Loader2,
  Pencil,
  Save,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
  Mail,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Plantilla {
  id: string;
  titulo: string;
  mensaje: string;
  activo: number;
  created_at?: string;
  updated_at?: string;
  creadoEn?: string;
  actualizadoEn?: string;
  actualizado_en?: string;
}

interface PlantillaForm {
  titulo: string;
  mensaje: string;
  activo: boolean;
}
interface UsuarioCRM {
  id: string;
  nombre: string;
  correo: string;
  perfil?: string;
  sucursal?: string;
  empresa?: string;
}


const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😘",
  "😎",
  "🤩",
  "🥳",
  "🤔",
  "🤗",
  "😇",
  "🙌",
  "👍",
  "🙏",
  "👏",
  "💪",
  "💼",
  "💡",
  "💬",
  "📢",
  "📅",
  "📦",
  "💸",
  "🛍️",
  "✅",
  "⚡",
  "✨",
  "🔥",
  "🌟",
  "🎉",
  "🎁",
];

const initialForm: PlantillaForm = {
  titulo: "",
  mensaje: "",
  activo: true,
};

const pickTimestamp = (plantilla: Plantilla) =>
  plantilla.actualizadoEn ||
  plantilla.actualizado_en ||
  plantilla.updated_at ||
  plantilla.created_at ||
  plantilla.creadoEn ||
  "";

const normalizePlantilla = (item: any): Plantilla => {
  const rawId = item?.id ?? item?.plantilla_id ?? item?.uuid ?? item?.clave;
  const mensajeRaw =
    typeof item?.mensaje === "string"
      ? item.mensaje
      : typeof item?.contenido === "string"
        ? item.contenido
        : "";

  return {
    id: rawId != null ? String(rawId) : "",
    titulo:
      typeof item?.titulo === "string"
        ? item.titulo
        : typeof item?.nombre === "string"
          ? item.nombre
          : "",
    mensaje: normalizeUnicodeText(mensajeRaw),
    activo: Number(item?.activo ?? (item?.estado === "activo" ? 1 : 0)),
    created_at: item?.created_at ?? item?.creado_en ?? item?.creadoEn,
    updated_at: item?.updated_at,
    creadoEn: item?.creadoEn,
    actualizadoEn: item?.actualizadoEn,
    actualizado_en: item?.actualizado_en,
  };
};
const normalizeUsuarioCRM = (item: any): UsuarioCRM | null => {
  const rawId =
    item?.id ?? item?.usuario_id ?? item?.uuid ?? item?.clave ?? item?.user_id ?? item?.correo;
  const correo =
    typeof item?.correo === "string"
      ? item.correo
      : typeof item?.email === "string"
        ? item.email
        : typeof item?.mail === "string"
          ? item.mail
          : "";
  if (!rawId || !correo) return null;

  const nombreParts = [
    item?.nombre,
    item?.apellidos,
    item?.apellido,
    item?.apellido_paterno,
    item?.apellido_materno,
  ].filter((part) => typeof part === "string" && part.trim().length > 0);

  let nombre = nombreParts.join(" ").trim();
  if (!nombre) {
    const alternative = [
      item?.name,
      item?.full_name,
      item?.usuario,
      item?.username,
      item?.nombre_completo,
    ].find((value) => typeof value === "string" && value.trim().length > 0);
    nombre = alternative ? alternative.trim() : "";
  }

  const perfil =
    typeof item?.perfil === "string"
      ? item.perfil
      : typeof item?.rol === "string"
        ? item.rol
        : undefined;

  const pickNestedString = (...values: any[]): string | undefined => {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
      if (value && typeof value === "object") {
        const candidates = [
          value?.nombre,
          value?.nombre_comercial,
          value?.nombreComercial,
          value?.razon_social,
          value?.razonSocial,
        ];
        for (const candidate of candidates) {
          if (typeof candidate === "string" && candidate.trim().length > 0) {
            return candidate.trim();
          }
        }

        if (value?.empresa) {
          const nested = pickNestedString(value.empresa);
          if (nested) {
            return nested;
          }
        }
      }
    }
    return undefined;
  };

  const sucursal = pickNestedString(
    item?.sucursal,
    item?.sucursal_nombre,
    item?.sucursalName,
    item?.sucursalNombre,
    item?.nombre_sucursal,
    item?.nombreSucursal,
    item?.sucursal?.nombre,
    item?.sucursal?.nombre_comercial,
    item?.sucursal?.razon_social,
    item?.sucursal?.razonSocial,
  );

  const empresa = pickNestedString(
    item?.empresa,
    item?.empresa_nombre,
    item?.empresaName,
    item?.empresaNombre,
    item?.nombre_empresa,
    item?.nombreEmpresa,
    item?.razon_social,
    item?.razonSocial,
    item?.empresa?.nombre,
    item?.empresa?.nombre_comercial,
    item?.empresa?.razon_social,
    item?.empresa?.razonSocial,
    item?.empresa?.empresa,
    item?.empresa?.nombreEmpresa,
    item?.sucursal?.empresa,
    item?.sucursal?.empresa?.nombre,
    item?.sucursal?.empresa?.nombre_comercial,
    item?.sucursal?.empresa?.razon_social,
    item?.company,
    item?.company?.name,
    item?.company?.nombre,
    item?.company?.razon_social,
  );

  return {
    id: String(rawId),
    nombre,
    correo: correo.trim(),
    perfil,
     sucursal,
    empresa,
  };
};



const formatTimestamp = (plantilla: Plantilla) => {
  const raw = pickTimestamp(plantilla);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function CRMPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("internalToken") : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

   const [activeTab, setActiveTab] = useState<"creacion" | "correos">("creacion");
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlantillaForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioCRM[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [usuariosError, setUsuariosError] = useState<string | null>(null);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<string>("");
  const [selectedUsuarioIds, setSelectedUsuarioIds] = useState<string[]>([]);
  const [sendingCorreos, setSendingCorreos] = useState(false);

  const canRequest = Boolean(apiUrl && token);

  const fetchPlantillas = useCallback(async () => {
    if (!canRequest) return;
    setLoading(true);
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
        .filter((item): item is Plantilla => Boolean(item.id));
      setPlantillas(normalized);
    } catch (err) {
      console.error("Error al cargar plantillas", err);
      toast.error("No se pudieron cargar las plantillas");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token, canRequest]);

  useEffect(() => {
    fetchPlantillas();
  }, [fetchPlantillas]);

  const activePlantillas = useMemo(
    () => plantillas.filter((plantilla) => plantilla.activo === 1),
    [plantillas],
  );

  const filteredPlantillas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activePlantillas;
    return activePlantillas.filter((p) => {
      const titulo = p.titulo?.toLowerCase?.() ?? "";
      const mensaje = p.mensaje?.toLowerCase?.() ?? "";
      return titulo.includes(term) || mensaje.includes(term);
    });
  }, [activePlantillas, search]);

  const fetchUsuarios = useCallback(async () => {
    if (!canRequest || !apiUrl) return;
    setUsuariosLoading(true);
    setUsuariosError(null);
    const endpoints = [
      `${apiUrl}/crm/usuarios/con-sucursal`,
      `${apiUrl}/crm/usuarios/sucursal`,
      `${apiUrl}/crm/usuarios-sucursal`,
      `${apiUrl}/crm/usuarios`,
    ];

    try {
       let payload: any[] | null = null;
      let lastError: unknown = null;

      for (const endpoint of endpoints) {
        try {
          const res = await axios.get(endpoint, {
            headers: authHeaders,
          });
          payload = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.items)
              ? res.data.items
              : Array.isArray(res.data?.data)
                ? res.data.data
                : Array.isArray(res.data?.usuarios)
                  ? res.data.usuarios
                  : [];
          break;
        } catch (endpointError) {
          lastError = endpointError;
        }
      }

      if (!payload) {
        throw lastError ?? new Error("Sin respuesta de usuarios");
      }
      const normalized = payload
        .map(normalizeUsuarioCRM)
        .filter((item): item is UsuarioCRM => Boolean(item?.id));
      setUsuarios(normalized);
    } catch (err) {
      console.error("Error al cargar usuarios CRM", err);
      setUsuariosError("No se pudieron cargar los usuarios registrados");
    } finally {
      setUsuariosLoading(false);
    }
  }, [apiUrl, token, canRequest]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setEmojiOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const titulo = form.titulo.trim();
    const mensaje = form.mensaje.trim();

    if (!titulo) {
      toast.error("Asigna un título a la plantilla");
      return;
    }
    if (!mensaje) {
      toast.error("Escribe el mensaje que se enviará por WhatsApp");
      return;
    }
    if (!apiUrl) {
      toast.error("No se encontró la configuración del servidor");
      return;
    }
    if (!token) {
      toast.error("Tu sesión ha expirado, vuelve a iniciar sesión");
      return;
    }

    setSaving(true);
    try {
      const payload = { titulo, mensaje, activo: form.activo ? 1 : 0 };
      if (editingId) {
        await axios.put(`${apiUrl}/crm/plantillas/${editingId}`, payload, {
          headers: authHeaders,
        });
        toast.success("Plantilla actualizada");
      } else {
        await axios.post(`${apiUrl}/crm/plantillas`, payload, {
          headers: authHeaders,
        });
        toast.success("Plantilla guardada");
      }
      resetForm();
      await fetchPlantillas();
    } catch (err) {
      console.error("Error al guardar plantilla", err);
      toast.error("No se pudo guardar la plantilla");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plantilla: Plantilla) => {
    setForm({
      titulo: plantilla.titulo ?? "",
      mensaje: plantilla.mensaje ?? "",
      activo: plantilla.activo === 1,
    });
    setEditingId(plantilla.id);
    setEmojiOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActivo = async (plantilla: Plantilla) => {
    if (!apiUrl) {
      toast.error("No se encontró la configuración del servidor");
      return;
    }
    if (!token) {
      toast.error("Tu sesión ha expirado, vuelve a iniciar sesión");
      return;
    }
    setUpdatingId(plantilla.id);
    try {
      const nuevoEstado = plantilla.activo === 1 ? 0 : 1;
      await axios.put(
        `${apiUrl}/crm/plantillas/${plantilla.id}`,
        { activo: nuevoEstado },
        { headers: authHeaders },
      );
      setPlantillas((prev) =>
        prev.map((p) =>
          p.id === plantilla.id
            ? {
                ...p,
                activo: nuevoEstado,
              }
            : p,
        ),
      );
      toast.success(
        nuevoEstado === 1
          ? "Plantilla activada"
          : "Plantilla desactivada",
      );
    } catch (err) {
      console.error("Error al actualizar estado", err);
      toast.error("No se pudo actualizar el estado de la plantilla");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setForm((prev) => ({ ...prev, mensaje: prev.mensaje + emoji }));
  };

  useEffect(() => {
    if (activePlantillas.length === 0) {
      if (selectedPlantillaId) {
        setSelectedPlantillaId("");
      }
      return;
    }
    const exists = activePlantillas.some((p) => p.id === selectedPlantillaId);
    if (!exists) {
      setSelectedPlantillaId(activePlantillas[0].id);
    }
  }, [activePlantillas, selectedPlantillaId]);

  useEffect(() => {
    setSelectedUsuarioIds((prev) => {
      const filtered = prev.filter((id) => usuarios.some((usuario) => usuario.id === id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [usuarios]);

  useEffect(() => {
    if (activeTab === "correos" && usuarios.length === 0 && !usuariosLoading) {
      fetchUsuarios();
    }
  }, [activeTab, fetchUsuarios, usuarios.length, usuariosLoading]);

  const usuariosConCorreo = useMemo(
    () => usuarios.filter((usuario) => Boolean(usuario.correo)),
    [usuarios],
  );

  const allSelectableIds = useMemo(
    () => usuariosConCorreo.map((usuario) => usuario.id),
    [usuariosConCorreo],
  );

  const selectedPlantilla = useMemo(
    () => activePlantillas.find((plantilla) => plantilla.id === selectedPlantillaId) ?? null,
    [activePlantillas, selectedPlantillaId],
  );

  const todosSeleccionados =
    allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedUsuarioIds.includes(id));

  const selectedEmails = useMemo(
    () => usuariosConCorreo.filter((usuario) => selectedUsuarioIds.includes(usuario.id)),
    [usuariosConCorreo, selectedUsuarioIds],
  );

  const handleUsuarioToggle = useCallback((usuarioId: string, checked: boolean) => {
    setSelectedUsuarioIds((prev) => {
      if (checked) {
        if (prev.includes(usuarioId)) return prev;
        return [...prev, usuarioId];
      }
      return prev.filter((id) => id !== usuarioId);
    });
  }, []);

  const handleEnviarPlantilla = useCallback(async () => {
    if (!selectedPlantilla) {
      toast.error("Selecciona una plantilla para enviar");
      return;
    }
    if (selectedEmails.length === 0) {
      toast.error("Selecciona al menos un correo destinatario");
      return;
    }
    if (!apiUrl) {
      toast.error("No se encontró la configuración del servidor");
      return;
    }
    if (!token) {
      toast.error("Tu sesión ha expirado, vuelve a iniciar sesión");
      return;
    }

    setSendingCorreos(true);
    try {
      const payload = {
        plantilla_id: selectedPlantilla.id,
        correos: selectedEmails.map((usuario) => usuario.correo),
        usuarios: selectedEmails.map((usuario) => ({
          id: usuario.id,
          correo: usuario.correo,
        })),
      };

      await axios.post(`${apiUrl}/crm/notificaciones/correos/masivo`, payload, {
        headers: authHeaders,
      });

      toast.success("Plantilla enviada a los correos seleccionados");
    } catch (err) {
      console.error("Error al enviar correos masivos", err);
      toast.error("No se pudo completar el envío de correos");
    } finally {
      setSendingCorreos(false);
    }
  }, [apiUrl, selectedEmails, selectedPlantilla, token]);

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 gap-2 rounded-xl bg-emerald-50 p-1 text-sm sm:w-auto">
          <TabsTrigger value="creacion" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700">
            creación de platillas
          </TabsTrigger>
          <TabsTrigger value="correos" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700">
            correos masivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="creacion" className="space-y-6">
          <Card className="border-emerald-200 shadow-sm">
            <CardHeader className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white">
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-700">
                <MessageCircle size={20} className="text-emerald-500" />
                Diseñador de plantillas WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="titulo"
                      className="text-sm font-medium text-slate-700"
                    >
                      Título de la plantilla
                    </label>
                    <Input
                      id="titulo"
                      value={form.titulo}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          titulo: event.target.value,
                        }))
                      }
                      placeholder="Ej. Recordatorio de pago"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Estado de la plantilla
                    </span>
                   <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <Checkbox
                        id="activo"
                        checked={form.activo}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({
                            ...prev,
                            activo: Boolean(checked),
                          }))
                        }
                      />
                      <label htmlFor="activo" className="text-sm text-emerald-800">
                        {form.activo
                          ? "Plantilla activa"
                          : "Plantilla inactiva"}
                        <span className="block text-xs text-emerald-600">
                          Las plantillas activas se mostrarán en el CRM para enviar
                          por WhatsApp.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              <div className="space-y-2">
                  <label
                    htmlFor="mensaje"
                    className="text-sm font-medium text-slate-700"
                  >
                  Mensaje
                  </label>
                  <div className="relative rounded-xl border border-emerald-200 bg-white shadow-sm">
                    <textarea
                      id="mensaje"
                      value={form.mensaje}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          mensaje: event.target.value,
                        }))
                      }
                      rows={6}
                      placeholder="Escribe el mensaje que quieres enviar. Puedes agregar emojis desde el botón inferior."
                      className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-sm leading-relaxed text-slate-700 focus:outline-none focus:ring-0"
                    />
                    <div className="flex items-center justify-between border-t border-emerald-100 bg-emerald-50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setEmojiOpen((prev) => !prev)}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Smile size={18} /> Añadir emojis
                      </button>
                      <span className="text-xs text-slate-500">
                        {form.mensaje.length} caracteres
                      </span>
                    </div>
                    {emojiOpen && (
                      <div className="absolute bottom-[54px] left-3 right-3 z-10 rounded-xl border border-emerald-200 bg-white p-3 shadow-lg">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                          Emojis frecuentes
                        </p>
                        <div className="grid grid-cols-8 gap-2 text-xl sm:grid-cols-10">
                          {EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleEmojiClick(emoji)}
                              className="rounded-lg border border-transparent bg-emerald-50 p-1 transition hover:border-emerald-200 hover:bg-emerald-100"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                 <div className="space-y-3">
                  <span className="text-sm font-medium text-slate-700">
                    Vista previa estilo WhatsApp
                  </span>
                  <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-5">
                    <div className="flex flex-col items-end gap-2">
                      <div className="max-w-sm rounded-2xl rounded-br-sm bg-[#DCF8C6] px-4 py-3 text-sm leading-relaxed text-slate-800 shadow">
                        {form.mensaje ? (
                          <span className="whitespace-pre-wrap">{form.mensaje}</span>
                        ) : (
                          <span className="text-slate-500">
                            Así se mostrará el mensaje a tu cliente.
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                        {form.activo ? "Plantilla activa" : "Plantilla inactiva"}
                      </span>
                    </div>
                  </div>
                 </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {editingId ? "Actualizar plantilla" : "Guardar plantilla"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      disabled={saving}
                    >
                      <X size={16} /> Cancelar edición
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-white py-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-slate-700">
                <MessageCircle size={20} className="text-emerald-500" />
                Plantillas registradas
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por título o mensaje"
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
             </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" /> Cargando plantillas...
                </div>
              ) : filteredPlantillas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-10 text-center text-sm text-emerald-700">
                  Aún no has creado plantillas. Registra tu primer mensaje para
                  WhatsApp.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPlantillas.map((plantilla) => (
                    <div
                      key={plantilla.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-800">
                              {plantilla.titulo || "Sin título"}
                            </h3>
                            <Badge
                              variant="outline"
                              className={
                                plantilla.activo === 1
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                                  : "bg-gray-100 text-gray-700 border-gray-200"
                              }
                            >
                              {plantilla.activo === 1 ? "Activa" : "Inactiva"}
                            </Badge>
                          </div>
                          {formatTimestamp(plantilla) && (
                            <p className="text-xs text-slate-500">
                              Actualizada {formatTimestamp(plantilla)}
                            </p>
                          )}
                          <div className="max-w-xl rounded-2xl rounded-br-sm bg-[#DCF8C6] px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-inner">
                            <span className="whitespace-pre-wrap">
                              {plantilla.mensaje || "Sin mensaje"}
                            </span>
                          </div>
                        </div>
                        <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:flex-col sm:items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(plantilla)}
                          >
                            <Pencil size={16} /> Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActivo(plantilla)}
                            disabled={updatingId === plantilla.id}
                            className="min-w-[140px]"
                          >
                            {updatingId === plantilla.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : plantilla.activo === 1 ? (
                              <>
                                <ToggleLeft size={16} /> Desactivar
                              </>
                            ) : (
                              <>
                                <ToggleRight size={16} /> Activar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correos" className="space-y-6">
          <Card className="border-emerald-200 shadow-sm">
            <CardHeader className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white">
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-700">
                <Mail size={20} className="text-emerald-500" />
                Correos masivos con plantillas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="plantilla-seleccion" className="text-sm font-medium text-slate-700">
                    Selecciona una plantilla
                  </label>
                  <select
                    id="plantilla-seleccion"
                    value={selectedPlantillaId}
                    onChange={(event) => setSelectedPlantillaId(event.target.value)}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    disabled={activePlantillas.length === 0}
                  >
                    {activePlantillas.length === 0 ? (
                      <option>No hay plantillas registradas</option>
                    ) : (
                      activePlantillas.map((plantilla) => (
                        <option key={plantilla.id} value={plantilla.id}>
                          {plantilla.titulo || "Sin título"}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-slate-500">
                    Puedes utilizar cualquiera de tus plantillas registradas. Las activas se recomiendan para tus campañas.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Vista previa</span>
                  <div className="min-h-[120px] rounded-2xl border border-emerald-100 bg-[#F8FFFB] p-4 text-sm text-slate-700">
                    {selectedPlantilla ? (
                      <>
                        <p className="font-semibold text-emerald-700">
                          {selectedPlantilla.titulo || "Sin título"}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-slate-600">
                          {selectedPlantilla.mensaje || "Sin mensaje"}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500">
                        Selecciona una plantilla para ver su contenido.
                      </p>
                    )}
                  </div>                 
                </div>
              </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-700">
                <span className="font-semibold text-emerald-700">
                  {selectedEmails.length} correo(s) seleccionados
                </span>
                <span className="text-slate-500">
                  Total disponibles: {usuariosConCorreo.length}
                </span>
              </div>
              <Button
                    type="button"
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                    onClick={handleEnviarPlantilla}
                    disabled={
                      sendingCorreos ||
                      !selectedPlantilla ||
                      selectedEmails.length === 0 ||
                      !canRequest
                    }
                  >
                    {sendingCorreos ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Enviar plantilla a seleccionados
                  </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-white py-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-slate-700">
                <Users size={20} className="text-emerald-500" />
                Bandeja de correos registrados
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  <Checkbox
                    id="seleccionar-todos"
                    checked={todosSeleccionados && allSelectableIds.length > 0}
                    onCheckedChange={(checked) =>
                      setSelectedUsuarioIds(checked ? allSelectableIds : [])
                    }
                    disabled={usuariosConCorreo.length === 0}
                  />
                  <label htmlFor="seleccionar-todos" className="cursor-pointer text-sm text-slate-600">
                    Seleccionar todos
                  </label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchUsuarios}
                  disabled={usuariosLoading || !canRequest}
                >
                  {usuariosLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Actualizar"
                  )}
                </Button>
                </div>
            </CardHeader>
            <CardContent>
              {usuariosError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {usuariosError}
                </div>
              )}
             {usuariosLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" /> Consultando usuarios...
                </div>
              ) : usuariosConCorreo.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                  No hay correos disponibles en el catálogo de usuarios.
                </div>
              ) : (
                <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
                  {usuariosConCorreo.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <Checkbox
                        checked={selectedUsuarioIds.includes(usuario.id)}
                        onCheckedChange={(checked) => handleUsuarioToggle(usuario.id, checked)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-700">
                            {usuario.nombre || "Usuario sin nombre"}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              usuario.sucursal
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 text-slate-500"
                            }
                          >
                            {usuario.sucursal ?? "Sin sucursal registrada"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">{usuario.correo}</p>
                        {usuario.empresa && (
                          <p className="text-[11px] text-slate-400">
                             <span className="font-medium text-slate-500">Empresa:</span>{" "}
                            {usuario.empresa}
                          </p>
                        )}
                        {usuario.perfil && (
                          <p className="text-[11px] text-slate-400">
                            <span className="font-medium text-slate-500">{usuario.perfil}</span>
                          </p>
                        )}
                      </div>
                    </div>
                   ))}
                </div>
             )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
