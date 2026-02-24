import { getInternalAuthHeaders } from "@/lib/internalAuth";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ClipboardCheck, ClipboardX } from "lucide-react";
import { ModalRechazarSolicitudIncidencia } from "./ModalRechazarSolicitudIncidencia";
import { ModalAprobarSolicitudIncidencia } from "./ModalAprobarSolicitudIncidencia";

interface Solicitudes {
  id: number;
  fecha_solicitud: string;
  empleado: string;
  tipo_incidencia: string;
  descripcion: string;
  fechas_solicitadas: string;
}

export default function ApartadoGestionarSolicitudes() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("internalToken")
      : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  const [solicitudes, setSolicitudes] = useState<Solicitudes[]>([]);
  const [fetchSolicitudesLoading, setFetchSolicitudesLoading] = useState(false);
  const [errorFetchSolicitudes, setErrorFetchSolicitudes] = useState<string | null>(null);

  const [idParaRechazar, setIdParaRechazar] = useState<number | null>(null);
  const [idParaAprobar, setIdParaAprobar] = useState<number | null>(null);


  const fetchSolicitudes = useCallback(async () => {
    setErrorFetchSolicitudes(null);
    setFetchSolicitudesLoading(true);

    try {
      const res = await axios.get(
        `${apiUrl}/crovinternal/solicitudes-incidencia`,
        {
          headers: authHeaders,
        },
      );
      setSolicitudes(res.data);
    } catch (error) {
      setSolicitudes([]);
      console.error("Error al obtener las solicitudes", error);
      setErrorFetchSolicitudes("Error al cargar datos");
    } finally {
      setFetchSolicitudesLoading(false);
    }
  }, [apiUrl, authHeaders]);

  useEffect(() => {
    if (!apiUrl) return;

    fetchSolicitudes();
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-orange-600">
            Gestión de solicitudes
          </h3>
          <p className="text-sm text-muted-foreground">
            Visualiza y gestiona las solicitudes de incidencias de los
            colaboradores.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSolicitudes()}
            disabled={!token || fetchSolicitudesLoading}
          >
            {fetchSolicitudesLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>

        {!apiUrl && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 w-full">
            Falta configurar <code>NEXT_PUBLIC_API_URL</code>.
          </div>
        )}
        {!token && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            Sesión expirada,Inicia sesión nuevamente.
          </div>
        )}
        {errorFetchSolicitudes && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorFetchSolicitudes}
          </div>
        )}
      </div>

      <div className="overflow-auto rounded-lg border bg-white mt-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-100">
              <TableHead className="whitespace-nowrap">
                Fecha solicitud
              </TableHead>
              <TableHead className="whitespace-nowrap">Empleado</TableHead>
              <TableHead className="whitespace-nowrap">
                Tipo incidencia
              </TableHead>
              <TableHead className="whitespace-nowrap w-[250px]">Descripción</TableHead>
              <TableHead className="whitespace-nowrap">
                Fechas afectadas
              </TableHead>
              <TableHead className="whitespace-nowrap">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {fetchSolicitudesLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10">
                  <div className="flex w-full items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Cargando solicitudes...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!fetchSolicitudesLoading && solicitudes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No se encontraron solicitudes registradas.
                </TableCell>
              </TableRow>
            )}

            {!fetchSolicitudesLoading &&
              solicitudes.map((solicitud) => (
                <TableRow key={solicitud.id} className="border-t">
                  <TableCell>{solicitud.fecha_solicitud}</TableCell>
                  <TableCell>{solicitud.empleado}</TableCell>
                  <TableCell>{solicitud.tipo_incidencia}</TableCell>
                  <TableCell className="max-w-[250px]">{solicitud.descripcion !== "" ? solicitud.descripcion: "Sin descripción"}</TableCell>
                  <TableCell>{solicitud.fechas_solicitadas}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIdParaAprobar(solicitud.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                          Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIdParaRechazar(solicitud.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <ClipboardX className="h-4 w-4" />
                          Rechazar
                        </Button>
                      </>

                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        <ModalRechazarSolicitudIncidencia 
            open={!!idParaRechazar} // Se abre si hay un ID seleccionado
            onOpenChange={(isOpen) => {
            if (!isOpen) setIdParaRechazar(null);
            }}
            requestId={idParaRechazar}
            apiUrl={apiUrl}
            authHeaders={authHeaders}
            onSuccess={fetchSolicitudes} 
        />

        <ModalAprobarSolicitudIncidencia 
          open={!!idParaAprobar} // Se abre si hay un ID seleccionado
          onOpenChange={(isOpen) => !isOpen && setIdParaAprobar(null)}
          requestId={idParaAprobar}
          apiUrl={apiUrl}
          authHeaders={authHeaders}
          onSuccess={fetchSolicitudes}
        />

      </div>
    </>
  );
}
