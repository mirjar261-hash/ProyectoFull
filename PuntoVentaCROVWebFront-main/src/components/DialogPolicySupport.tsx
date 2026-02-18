"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type DialogPolicySupportProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function DialogPolicySupport({
  open,
  onOpenChange,
}: DialogPolicySupportProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-orange-600">Políticas de Soporte</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Última actualización: {new Date().toLocaleDateString("es-MX")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <section className="space-y-6 text-justify text-sm leading-6 text-slate-800">
            <p>
              En CROV agradecemos tu confianza y nos comprometemos a atender tus
              solicitudes de soporte en el menor tiempo posible, de acuerdo con
              la prioridad de cada caso:
            </p>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Prioridad Alta (Urgente)
              </h2>
              <p>
                Problemas que impiden operar el negocio (ej. sistema no abre, no
                se puede cobrar).
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-2 mt-2">
                <li>
                  <span className="font-semibold">Tiempo de respuesta:</span>{" "}
                  menos de 1 hora hábil.
                </li>
                <li>
                  <span className="font-semibold">Resolución:</span> el mismo
                  día.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Prioridad Media
              </h2>
              <p>
                Problemas que afectan parcialmente el funcionamiento, pero
                permiten seguir operando.
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-2 mt-2">
                <li>
                  <span className="font-semibold">Tiempo de respuesta:</span>{" "}
                  menos de 2 horas hábiles.
                </li>
                <li>
                  <span className="font-semibold">Resolución:</span> máximo 1
                  día hábil.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Prioridad Baja
              </h2>
              <p>Dudas de uso, solicitudes de capacitación o mejoras.</p>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-2 mt-2">
                <li>
                  <span className="font-semibold">Tiempo de respuesta:</span>{" "}
                  menos de 4 horas hábiles.
                </li>
                <li>
                  <span className="font-semibold">Resolución:</span> entre 1 a 2
                  días hábiles.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Solicitudes de cambios o modificaciones al sistema
              </h2>
              <p>
                Entendemos que en ocasiones puedes necesitar ajustes, mejoras o
                modificaciones personalizadas en tu sistema de punto de venta.
                Para estos casos, aplicamos el siguiente proceso:
              </p>

              <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-4 mt-3">
                <li>
                  <p className="font-semibold">Evaluación del cambio</p>
                  <p className="mt-1">
                    Tu solicitud será revisada por nuestro equipo técnico y
                    administrativo para determinar si es viable implementarla.
                  </p>
                </li>

                <li>
                  <p className="font-semibold">Autorización</p>
                  <p className="mt-1">
                    Según la naturaleza del cambio, CROV definirá si puede
                    desarrollarse o no.
                  </p>

                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      <span className="font-semibold">Si se aprueba:</span>{" "}
                      se te informará y se te proporcionará un{" "}
                      <span className="font-semibold">
                        tiempo estimado de entrega
                      </span>
                      , el cual dependerá de la carga de trabajo actual del área
                      de desarrollo.
                    </li>
                    <li>
                      <span className="font-semibold">
                        Si no es posible realizarlo:
                      </span>{" "}
                      te notificaremos y te explicaremos el motivo.
                    </li>
                  </ul>
                </li>

                <li>
                  <p className="font-semibold">Tiempos de desarrollo</p>
                  <p className="mt-1">
                    Este tipo de solicitudes no se consideran soporte técnico
                    inmediato. Una vez autorizadas, se programan conforme a la
                    disponibilidad del equipo y se te comunicará el tiempo
                    estimado de ejecución.
                  </p>
                </li>
              </ol>
            </div>

            <p>
              Agradecemos tu comprensión y confianza. Nuestro objetivo es seguir
              mejorando tu sistema de forma ordenada y responsable. Si tienes
              preguntas sobre las políticas o requieres asistencia, puedes
              contactarnos en{" "}
              <a
                href="mailto:soporte@puntoventacrov.com"
                className="text-orange-600 underline"
              >
                soporte@puntoventacrov.com
              </a>
              .
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
