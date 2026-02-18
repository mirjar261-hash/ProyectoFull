import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Square,
  CheckSquare,
  Folder,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { getInternalAuthHeaders } from "@/lib/internalAuth";
import AvatarEmpleado from "../AvatarEmpleado";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EmpleadoResumen {
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
      className={`
        text-[10px] font-bold px-2 py-0.5 rounded border 
        truncate max-w-[120px] sm:max-w-none inline-block align-middle
        ${currentStyle}
      `}
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

        <span className={`text-sm font-medium whitespace-normal break-words leading-tight ${isFinished ? "line-through text-gray-400 decoration-gray-400" : "text-gray-700"}`} title={tarea.titulo}>
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

const SistemaAccordion = ({ sistema }: { sistema: SistemaConTareas }) => {
  const [isOpen, setIsOpen] = useState(false);

  const totalTareas = sistema.tareas.length;
  const tareasTerminadas = sistema.tareas.filter(
    (t) => t.estatus === "LISTO"
  ).length;

  const porcentaje =
    totalTareas === 0
      ? 0
      : Math.round((tareasTerminadas / totalTareas) * 100);

  return (
    <div className="mb-3 border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* HEADER DEL SISTEMA */}
      <div
        className="flex items-start gap-2 py-3 px-2 cursor-pointer hover:bg-gray-50 rounded-lg group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Botón Collapse */}
        <div className="mt-1 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>

        {/* Icono Carpeta */}
        <div className="mt-0.5 p-1 bg-purple-100 rounded text-orange-500 flex-shrink-0">
          <Folder size={14} className="fill-current" />
        </div>

        {/* Contenido Header */}
        <div className="flex-grow flex flex-col gap-1 min-w-0">
          {/* Fila de Título y Porcentaje */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              {sistema.nombre}
            </h3>
            {/* Texto de avance */}
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
              {tareasTerminadas}/{totalTareas} ({porcentaje}%)
            </span>
          </div>

          {/* BARRA DE PROGRESO */}
          <div className="h-1.5 w-full bg-gray-300 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-500 ease-out rounded-full bg-orange-500`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      </div>

      {/* LISTA DE TAREAS (CUERPO) */}
      {isOpen && (
        <div className="ml-2 sm:ml-8 border-l-2 border-gray-100 pl-0 sm:pl-2 mb-4 animate-in slide-in-from-top-2 duration-200">
          {sistema.tareas.length > 0 ? (
            sistema.tareas.map((tarea) => (
              <TareaRow key={tarea.id} tarea={tarea} />
            ))
          ) : (
            <div className="py-2 text-xs text-gray-400 italic px-4">
              No hay tareas registradas en este sistema.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ApartadoSistemas() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("internalToken")
      : null;
  const [sistemas, setSistemas] = useState<SistemaConTareas[]>([]);
  const [loading, setLoading] = useState(false);
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${apiUrl}/crovinternal/sistemas-crov/con-tareas-y-empleados`,
          { headers: authHeaders }
        );
        setSistemas(res.data);
      } catch (error) {
        setSistemas([]);
        console.error("Error al cargar sistemas:", error);
        toast.error("Error al cargar sistemas");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiUrl, authHeaders]);

  return (
    <div className="h-full flex flex-col justify-start mt-4 sm:mt-10">
      <div className="space-y-3 overflow-y-auto pr-0 sm:pr-2 pb-10 px-2 sm:px-0">
        {sistemas.map((sistema) => (
          <SistemaAccordion key={sistema.id} sistema={sistema} />
        ))}
        {sistemas.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-10">
            No se encontraron sistemas activos.
          </div>
        )}
      </div>
    </div>
  );
}