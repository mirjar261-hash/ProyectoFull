import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Square, CheckSquare, Folder, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { getInternalAuthHeaders } from "@/lib/internalAuth";
import AvatarEmpleado from "../AvatarEmpleado";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EmpleadoResumen {
  id?: number;
  nombre_completo: string;
  color_perfil: string | null;
}

interface TareaResumen {
  id: number;
  titulo: string;
  estatus: string;
  empleado: EmpleadoResumen | null;
}

interface SistemaConTareas {
  id: number;
  nombre: string;
  tareas: TareaResumen[];
}

interface EmpleadoCrov {
  id: number;
  nombre_completo: string;
  activo?: number;
  color_perfil: string | null;
}

interface AITareaSugerida {
  titulo: string;
  descripcion: string;
  complejidad: 1 | 2 | 3 | 5 | 8 | 13;
}

interface SprintCrov {
  id: number;
  nombre: string;
  en_uso: number;
}

const StatusBadge = ({ estatus }: { estatus: string }) => {
  const styles: Record<string, string> = {
    POR_HACER: "bg-gray-100 text-gray-600 border-gray-200",
    EN_CURSO: "bg-blue-100 text-blue-700 border-blue-200",
    IMPLEMENTACION_LISTA: "bg-purple-100 text-purple-700 border-purple-200",
    PRUEBAS: "bg-amber-100 text-amber-700 border-amber-200",
    LISTO: "bg-green-100 text-green-700 border-green-200",
  };

  const currentStyle = styles[estatus] || "bg-gray-50 text-gray-500 border-gray-100";
  const formatText = (text: string) => text.replace(/_/g, " ");

  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded border truncate max-w-[120px] sm:max-w-none inline-block align-middle ${currentStyle}`}
      title={formatText(estatus)}
    >
      {formatText(estatus)}
    </span>
  );
};

const TareaRow = ({ tarea }: { tarea: TareaResumen }) => {
  const isFinished = tarea.estatus === "LISTO";

  return (
    <div className="py-3 px-3 sm:px-4 hover:bg-gray-50 border-b border-gray-100 last:border-0 group transition-colors flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
      <div className="flex items-start gap-3 w-full sm:w-auto flex-grow min-w-0">
        {isFinished ? (
          <CheckSquare className="hidden sm:block w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <Square className="hidden sm:block w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        )}

        <span className={`text-xs font-mono text-gray-500 flex-shrink-0 mt-0.5 ${isFinished ? "line-through opacity-60" : ""}`}>
          {tarea.id}
        </span>

        <span
          className={`text-sm font-medium whitespace-normal break-words leading-tight ${
            isFinished ? "line-through text-gray-400 decoration-gray-400" : "text-gray-700"
          }`}
          title={tarea.titulo}
        >
          {tarea.titulo}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 pl-7 sm:pl-0 w-full sm:w-auto flex-shrink-0">
        <StatusBadge estatus={tarea.estatus} />

        <div className="flex-shrink-0">
          {tarea.empleado ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-pointer">
                  <AvatarEmpleado
                    empleado={tarea.empleado}
                    className="h-6 w-6 border border-white shadow-sm"
                    initialsSize="text-[10px]"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="rounded-xl bg-zinc-700 px-3 py-2 text-xs text-white shadow-lg">
                Asignado a: {tarea.empleado?.nombre_completo ?? "Sin asignar"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="h-6 w-6 rounded-full bg-gray-200 border border-white flex items-center justify-center" title="Sin asignar">
              <span className="text-[8px] text-gray-400">?</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SistemaAccordion = ({
  sistema,
  onGenerateTasksClick,
}: {
  sistema: SistemaConTareas;
  onGenerateTasksClick: (sistema: SistemaConTareas) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const totalTareas = sistema.tareas.length;
  const tareasTerminadas = sistema.tareas.filter((t) => t.estatus === "LISTO").length;
  const porcentaje = totalTareas === 0 ? 0 : Math.round((tareasTerminadas / totalTareas) * 100);

  return (
    <div className="mb-3 border border-gray-300 rounded-lg overflow-hidden bg-white">
      <div
        className="flex items-start gap-2 py-3 px-2 cursor-pointer hover:bg-gray-50 rounded-lg group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="mt-1 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>

        <div className="mt-0.5 p-1 bg-purple-100 rounded text-orange-500 flex-shrink-0">
          <Folder size={14} className="fill-current" />
        </div>

        <div className="flex-grow flex flex-col gap-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{sistema.nombre}</h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-orange-200 text-orange-700 hover:bg-orange-50"
                onClick={(event) => {
                  event.stopPropagation();
                  onGenerateTasksClick(sistema);
                }}
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Generar tareas
              </Button>
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                {tareasTerminadas}/{totalTareas} ({porcentaje}%)
              </span>
            </div>
          </div>

          <div className="h-1.5 w-full bg-gray-300 rounded-full overflow-hidden mt-1">
            <div className="h-full transition-all duration-500 ease-out rounded-full bg-orange-500" style={{ width: `${porcentaje}%` }} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="ml-2 sm:ml-8 border-l-2 border-gray-100 pl-0 sm:pl-2 mb-4 animate-in slide-in-from-top-2 duration-200">
          {sistema.tareas.length > 0 ? (
            sistema.tareas.map((tarea) => <TareaRow key={tarea.id} tarea={tarea} />)
          ) : (
            <div className="py-2 text-xs text-gray-400 italic px-4">No hay tareas registradas en este sistema.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ApartadoSistemas() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const openAiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  const token = typeof window !== "undefined" ? localStorage.getItem("internalToken") : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  const [sistemas, setSistemas] = useState<SistemaConTareas[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoCrov[]>([]);
  const [sprintEnUso, setSprintEnUso] = useState<SprintCrov | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sistemaSeleccionado, setSistemaSeleccionado] = useState<SistemaConTareas | null>(null);
  const [requerimientos, setRequerimientos] = useState("");
  const [empleadoId, setEmpleadoId] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  });
  const [generando, setGenerando] = useState(false);
  const [previewTareas, setPreviewTareas] = useState<AITareaSugerida[]>([]);
  const [asignarSprintActual, setAsignarSprintActual] = useState(false);

  const empleadosActivos = useMemo(() => empleados.filter((empleado) => empleado.activo !== 0), [empleados]);

  const fetchData = useCallback(async () => {
    if (!apiUrl || !token) return;

    setLoading(true);
    try {
      const [sistemasRes, empleadosRes, sprintsRes] = await Promise.all([
        axios.get(`${apiUrl}/crovinternal/sistemas-crov/con-tareas-y-empleados`, { headers: authHeaders }),
        axios.get(`${apiUrl}/crovinternal/empleados-crov`, { headers: authHeaders }),
        axios.get(`${apiUrl}/crovinternal/sprints-crov`, { headers: authHeaders }),
      ]);

      setSistemas(Array.isArray(sistemasRes.data) ? sistemasRes.data : []);

      const empleadosData = Array.isArray(empleadosRes.data)
        ? empleadosRes.data
        : Array.isArray(empleadosRes.data?.items)
          ? empleadosRes.data.items
          : [];
      setEmpleados(empleadosData);

      const rawSprints = Array.isArray(sprintsRes.data) ? sprintsRes.data : [];
      const sprintActivo = rawSprints.find((sprint: SprintCrov) => Number(sprint.en_uso) === 1) || null;
      setSprintEnUso(sprintActivo);
    } catch (error) {
      setSistemas([]);
      setEmpleados([]);
      setSprintEnUso(null);
      console.error("Error al cargar sistemas o empleados:", error);
      toast.error("Error al cargar informacion de sistemas");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, authHeaders, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const normalizarComplejidad = (value: number): 1 | 2 | 3 | 5 | 8 | 13 => {
    const allowed = [1, 2, 3, 5, 8, 13] as const;
    let closest: 1 | 2 | 3 | 5 | 8 | 13 = 1;
    let minDiff = Number.POSITIVE_INFINITY;

    allowed.forEach((candidate) => {
      const diff = Math.abs(candidate - value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = candidate;
      }
    });

    return closest;
  };

  const buildAiPrompt = (input: string) => `
Analiza estos requerimientos funcionales y dividelos en tareas concretas de desarrollo Jira.
Reglas:
- Detecta automaticamente cuantas tareas son necesarias.
- Devuelve tareas claras, atomicas y accionables.
- Cada tarea debe incluir: titulo, descripcion y complejidad.
- complejidad SOLO puede ser uno de: 1,2,3,5,8,13 (Fibonacci).
- Responde UNICAMENTE JSON valido con esta forma:
{"tareas":[{"titulo":"...","descripcion":"...","complejidad":3}]}
Requerimientos:
${input}
`;

  const generarTareasConIA = async (texto: string): Promise<AITareaSugerida[]> => {
    if (!openAiKey) {
      throw new Error("No se encontro NEXT_PUBLIC_OPENAI_API_KEY");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Eres un analista tecnico senior que descompone requerimientos en tareas Jira claras y medibles.",
          },
          {
            role: "user",
            content: buildAiPrompt(texto),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error IA: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("La IA no devolvio contenido");
    }

    const parsed = JSON.parse(content);
    const rawTareas = Array.isArray(parsed?.tareas) ? parsed.tareas : [];

    const tareasNormalizadas = rawTareas
      .map((item: Record<string, unknown>) => ({
        titulo: String(item?.titulo || "").trim(),
        descripcion: String(item?.descripcion || "").trim(),
        complejidad: normalizarComplejidad(Number(item?.complejidad || 1)),
      }))
      .filter((item: AITareaSugerida) => item.titulo.length > 0 && item.descripcion.length > 0);

    if (tareasNormalizadas.length === 0) {
      throw new Error("La IA no genero tareas validas");
    }

    return tareasNormalizadas;
  };

  const crearTareasGeneradas = async (tareasGeneradas: AITareaSugerida[]) => {
    if (!apiUrl || !authHeaders || !sistemaSeleccionado) return;

    const responsable = Number(empleadoId);
    const endpoint = `${apiUrl}/crovinternal/tareas-crov`;
    const sprintDestino = asignarSprintActual && sprintEnUso ? sprintEnUso.id : null;

    await Promise.all(
      tareasGeneradas.map((tarea) =>
        axios.post(
          endpoint,
          {
            titulo: tarea.titulo,
            descripcion: tarea.descripcion,
            id_sistemas_crov: sistemaSeleccionado.id,
            id_empleados_crov: responsable,
            prioridad: "media",
            estatus: "POR_HACER",
            reabierto: 0,
            activo: 1,
            fecha_vencimiento: fechaVencimiento || null,
            tipo: "Tarea",
            complejidad: tarea.complejidad,
            id_sprint: sprintDestino,
          },
          { headers: authHeaders },
        ),
      ),
    );
  };

  const handleOpenModalGeneracion = (sistema: SistemaConTareas) => {
    setSistemaSeleccionado(sistema);
    setPreviewTareas([]);
    setRequerimientos("");
    setAsignarSprintActual(false);
    if (!empleadoId && empleadosActivos.length > 0) {
      setEmpleadoId(String(empleadosActivos[0].id));
    }
    setModalOpen(true);
  };

  const handleGenerarYCrearTareas = async () => {
    if (!sistemaSeleccionado) return;
    if (!requerimientos.trim()) {
      toast.error("Escribe los requerimientos del cliente");
      return;
    }
    if (!empleadoId) {
      toast.error("Selecciona un responsable para las tareas");
      return;
    }
    if (asignarSprintActual && !sprintEnUso) {
      toast.error("No hay un sprint actual en uso. Desactiva la opcion o activa un sprint.");
      return;
    }

    setGenerando(true);
    try {
      const tareasGeneradas = await generarTareasConIA(requerimientos.trim());
      setPreviewTareas(tareasGeneradas);
      await crearTareasGeneradas(tareasGeneradas);
      toast.success(`Se crearon ${tareasGeneradas.length} tareas en POR_HACER`);
      setModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Error al generar tareas IA:", error);
      toast.error("No se pudieron generar tareas automaticamente");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="h-full flex flex-col justify-start mt-4 sm:mt-10">
      <div className="space-y-3 overflow-y-auto pr-0 sm:pr-2 pb-10 px-2 sm:px-0">
        {sistemas.map((sistema) => (
          <SistemaAccordion
            key={sistema.id}
            sistema={sistema}
            onGenerateTasksClick={handleOpenModalGeneracion}
          />
        ))}

        {sistemas.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-10">No se encontraron sistemas activos.</div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {sistemaSeleccionado
                ? `Generar tareas inteligentes - ${sistemaSeleccionado.nombre}`
                : "Generar tareas inteligentes"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Responsable</label>
                <Select value={empleadoId} onValueChange={setEmpleadoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un responsable" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {empleadosActivos.map((empleado) => (
                      <SelectItem key={empleado.id} value={String(empleado.id)}>
                        {empleado.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha limite</label>
                <Input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(event) => setFechaVencimiento(event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={asignarSprintActual}
                  onCheckedChange={(checked) => setAsignarSprintActual(Boolean(checked))}
                />
                Crear tareas en sprint actual
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                {asignarSprintActual
                  ? sprintEnUso
                    ? `Las tareas se asignaran a: ${sprintEnUso.nombre || `Sprint_${sprintEnUso.id}`}.`
                    : "No hay sprint en uso; no se podran crear hasta desactivar esta opcion o activar un sprint."
                  : "Si dejas esta opcion desactivada, las tareas se crearan en backlog (sin sprint)."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Requerimientos del cliente</label>
              <Textarea
                className="min-h-[220px]"
                placeholder="Describe aqui el requerimiento completo del cliente. La IA lo dividira en tareas con complejidad 1,2,3,5,8,13."
                value={requerimientos}
                onChange={(event) => setRequerimientos(event.target.value)}
              />
            </div>

            {previewTareas.length > 0 && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Vista previa generada</p>
                <div className="space-y-2">
                  {previewTareas.map((tarea, index) => (
                    <div key={`${tarea.titulo}-${index}`} className="rounded border bg-muted/20 p-2">
                      <p className="text-sm font-medium">
                        {index + 1}. {tarea.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">{tarea.descripcion}</p>
                      <p className="text-xs font-semibold text-orange-700 mt-1">Complejidad: {tarea.complejidad}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={generando}>
                Cancelar
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={handleGenerarYCrearTareas}
                disabled={generando}
              >
                {generando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generar y crear tareas
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
