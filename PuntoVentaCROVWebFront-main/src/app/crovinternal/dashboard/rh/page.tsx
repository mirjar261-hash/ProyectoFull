"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import ApartadoMisSolicitudes from "@/components/crovinternal/rh/ApartadoMisSolicitudes";

export default function RHPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("internalToken")
      : null;

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

      <Tabs defaultValue="mis-solicitudes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mis-solicitudes">Mis solicitudes</TabsTrigger>
          {/* <TabsTrigger value="gestion-solicitudes">Gestión solicitudes</TabsTrigger> */}
        </TabsList>

        <TabsContent value="mis-solicitudes" className="space-y-6">
          <ApartadoMisSolicitudes/>
        </TabsContent>


        {/* <TabsContent value="gestion-solicitudes">
            Gestionar solicitudes
        </TabsContent> */}
      </Tabs>
    </main>
  );
}
