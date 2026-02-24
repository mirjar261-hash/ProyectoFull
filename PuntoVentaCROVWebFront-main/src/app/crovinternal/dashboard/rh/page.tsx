"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import ApartadoMisSolicitudes from "@/components/crovinternal/rh/ApartadoMisSolicitudes";
import ApartadoGestionarSolicitudes from "@/components/crovinternal/rh/ApartadoGestionarSolicitudes";
import { getInternalAuthHeaders } from "@/lib/internalAuth";
import axios from "axios";

interface PermisoInternal {
  id: number;
  nombre: string;
}

const CROV_TAB_PERMISSIONS: Record<string, string> = {
  "mis-solicitudes": "RH/Mis solicitudes incidencia",
  "gestion-solicitudes": "RH/Gestionar solicitudes incidencia",
};

export default function RHPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("internalToken")
      : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  const [internalUserId, setInternalUserId] = useState<number | null>(null);
  const [userPermisos, setUserPermisos] = useState<PermisoInternal[]>([]);
  const [userPermisosLoading, setUserPermisosLoading] = useState(true);

  const permisosInternalEndpoint = apiUrl ? `${apiUrl}/crovinternal/permisos-internal` : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedId = Number(localStorage.getItem("internalUserId") ?? 0);
    if (Number.isFinite(storedId) && storedId > 0) {
      setInternalUserId(storedId);
    } else {
      setInternalUserId(null);
      setUserPermisosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!permisosInternalEndpoint || !token || !internalUserId) {
      return;
    }

    const fetchUserPermisos = async () => {
      setUserPermisosLoading(true);
      try {
        const res = await axios.get(
          `${permisosInternalEndpoint}/${internalUserId}`,
          { headers: authHeaders }
        );
        setUserPermisos(res.data);
      } catch (err) {
        console.error("Error al cargar permisos internos del usuario", err);
        setUserPermisos([]);
      } finally {
        setUserPermisosLoading(false);
      }
    };

    fetchUserPermisos();
  }, [authHeaders, internalUserId, permisosInternalEndpoint, token]);

  const hasInternalPermission = useMemo(() => {
    const permisosSet = new Set(
      userPermisos.map((permiso) => permiso.nombre.trim().toLowerCase())
    );
    return (permisoRequerido: string) =>
      permisosSet.has(permisoRequerido.trim().toLowerCase());
  }, [userPermisos]);

  const visibleTabs = useMemo(() => {
    const baseTabs = ["mis-solicitudes", "gestion-solicitudes"];

    if (userPermisosLoading || !internalUserId || !token) {
      return []; 
    }

    return baseTabs.filter((tab) => {
      const permisoRequerido = CROV_TAB_PERMISSIONS[tab];
      return permisoRequerido ? hasInternalPermission(permisoRequerido) : true;
    });
  }, [hasInternalPermission, internalUserId, token, userPermisosLoading]);

  const defaultTab = visibleTabs.includes("mis-solicitudes") 
    ? "mis-solicitudes" 
    : visibleTabs[0] || "";

  return (
    <main className="mx-auto flex w-full max-w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-orange-600">
          Recursos humanos
        </h2>
        <Button
          variant="outline"
          onClick={() => router.push("/crovinternal/dashboard")}
        >
          Volver
        </Button>
      </div>

      {!visibleTabs.length && !userPermisosLoading && (
        <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
          No tienes permisos para acceder a los módulos de CROV.
        </div>
      )}

      {visibleTabs.length > 0 && (
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            {visibleTabs.includes("mis-solicitudes") && (
              <TabsTrigger value="mis-solicitudes">Mis solicitudes</TabsTrigger>
            )}

            {visibleTabs.includes("gestion-solicitudes") && (
              <TabsTrigger value="gestion-solicitudes">
                Gestión solicitudes
              </TabsTrigger>
            )}
          </TabsList>

          {visibleTabs.includes("mis-solicitudes") && (
            <TabsContent value="mis-solicitudes" className="space-y-6">
              <ApartadoMisSolicitudes />
            </TabsContent>
          )}

          {visibleTabs.includes("gestion-solicitudes") && (
            <TabsContent value="gestion-solicitudes" className="space-y-6">
              <ApartadoGestionarSolicitudes />
            </TabsContent>
          )}
        </Tabs>
      )}
    </main>
  );
}