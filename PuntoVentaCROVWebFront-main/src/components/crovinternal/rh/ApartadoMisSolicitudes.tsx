import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInternalAuthHeaders } from "@/lib/internalAuth";
import { Loader2, RefreshCw, Pencil, Trash2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import ModalCrearEditarSolicitudIncidencia, {SolicitudToEdit} from "./ModalCrearEditarSolicitudIncidencia";
import axios, { AxiosError } from "axios";

type SolicitudIncidencia = {
  id: number;
  fecha_solicitud: string;
  tipo: string;
  descripcion: string;
  fechas_solicitadas: string;
  estado: string;
  motivo_rechazo: string | null;

  // Campos RAW para edición
  raw_fecha_inicio: string;
  raw_fecha_fin: string;
  raw_id_tipos_incidencia: number;
};

export default function ApartadoMisSolicitudes() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("internalToken") : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);
  const idEmpleadoActual = localStorage.getItem("internalUserId");

  const [solicitudes, setSolicitudes] = useState<SolicitudIncidencia[]>([]);
  const [fetchMisSolicitudesLoading, setFetchMisSolicitudesLoading] = useState(false);
  const [errorFetchMisSolicitudes, setErrorFetchMisSolicitudes] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [solicitudToEdit, setSolicitudToEdit] = useState<SolicitudToEdit | null>(null);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDIENTE: "bg-yellow-100 text-yellow-700 border-yellow-200",
      APROBADO: "bg-green-100 text-green-700 border-green-200",
      RECHAZADO: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || "bg-gray-100"}`}>
        {status}
      </span>
    );
  };

  const fetchMisSolicitudes = useCallback(async () => {
    if (!apiUrl || !idEmpleadoActual || !token) return;

    setFetchMisSolicitudesLoading(true);
    setErrorFetchMisSolicitudes("");

    try {
      const res = await axios.get(
        `${apiUrl}/crovinternal/solicitudes-incidencia/empleado/${idEmpleadoActual}`,
        { headers: authHeaders }
      );
      setSolicitudes(res.data);
    } catch (error) {
      console.error("Error al obtener las solicitudes", error);
      setErrorFetchMisSolicitudes("Error al obtener las solicitudes");
    } finally {
      setFetchMisSolicitudesLoading(false);
    }
  }, [apiUrl, idEmpleadoActual, token, authHeaders]);

  const handleDelete = async (id: number) => {
    const confirmacion = window.confirm("¿Estás seguro de que deseas eliminar esta solicitud?");
    if (!confirmacion) return;

    setDeletingId(id);

    try {
      await axios.delete(
        `${apiUrl}/crovinternal/solicitudes-incidencia/${id}`,
        { headers: authHeaders }
      );
      toast.success("Solicitud eliminada correctamente");
      setSolicitudes((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Error al eliminar", error);
      const axiosError = error as AxiosError<{ message: string }>;
      const mensaje = axiosError.response?.data?.message || "Error al eliminar.";
      toast.error(mensaje);
      fetchMisSolicitudes();
    } finally {
      setDeletingId(null);
    }
  };

  
  const handleCreateNew = () => {
    setSolicitudToEdit(null); 
    setIsModalOpen(true);
  };

  const handleEdit = (solicitud: SolicitudIncidencia) => {
    const dataForModal: SolicitudToEdit = {
      id: solicitud.id,
      descripcion: solicitud.descripcion,
      raw_fecha_inicio: solicitud.raw_fecha_inicio,
      raw_fecha_fin: solicitud.raw_fecha_fin,
      raw_id_tipos_incidencia: solicitud.raw_id_tipos_incidencia,
    };
    
    setSolicitudToEdit(dataForModal); 
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchMisSolicitudes();
  }, [token]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-orange-600">
            Mis solicitudes de incidencia
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona y consulta el historial de tus vacaciones e incidencias.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMisSolicitudes()}
            disabled={!token || fetchMisSolicitudesLoading}
          >
            {fetchMisSolicitudesLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>

          <Button 
            size="sm" 
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleCreateNew}
            disabled={!token}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva solicitud
          </Button>

          <ModalCrearEditarSolicitudIncidencia
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            fetchSolicitudes={fetchMisSolicitudes}
            dataToEdit={solicitudToEdit} 
          />
        </div>

        {!apiUrl && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 w-full">
            Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
          </div>
        )}
        {errorFetchMisSolicitudes && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 w-full">
            {errorFetchMisSolicitudes}
          </div>
        )}
      </div>

      <div className="overflow-auto rounded-lg border bg-white mt-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-100">
              <TableHead className="whitespace-nowrap">Fecha solicitud</TableHead>
              <TableHead className="whitespace-nowrap">Tipo incidencia</TableHead>
              <TableHead className="whitespace-nowrap">Descripción</TableHead>
              <TableHead className="whitespace-nowrap">Fechas afectadas</TableHead>
              <TableHead className="whitespace-nowrap">Estado</TableHead>
              <TableHead className="whitespace-nowrap w-[200px]">Motivo rechazo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {fetchMisSolicitudesLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10">
                  <div className="flex w-full items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    <span className="ml-2 text-sm text-muted-foreground">Cargando solicitudes...</span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!fetchMisSolicitudesLoading && solicitudes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                  No se encontraron solicitudes registradas.
                </TableCell>
              </TableRow>
            )}

            {!fetchMisSolicitudesLoading &&
              solicitudes.map((solicitud) => (
                <TableRow key={solicitud.id} className="border-t">
                  <TableCell>{solicitud.fecha_solicitud}</TableCell>
                  <TableCell>{solicitud.tipo}</TableCell>
                  <TableCell>{solicitud.descripcion}</TableCell>
                  <TableCell>{solicitud.fechas_solicitadas}</TableCell>
                  <TableCell>{getStatusBadge(solicitud.estado)}</TableCell>
                  <TableCell className="max-w-[200px]">
                    {solicitud.estado === "RECHAZADO" && solicitud.motivo_rechazo ? (
                      <p className="text-xs">{solicitud.motivo_rechazo}</p>
                    ) : (
                      <span className="text-gray-300 text-xs"> -</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">

                    <div className="flex justify-end gap-2">
                      {solicitud.estado === "PENDIENTE" ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(solicitud)}
                            disabled={deletingId === solicitud.id}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(solicitud.id)}
                            disabled={deletingId === solicitud.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            {deletingId === solicitud.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" disabled className="opacity-30">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled className="opacity-30">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}