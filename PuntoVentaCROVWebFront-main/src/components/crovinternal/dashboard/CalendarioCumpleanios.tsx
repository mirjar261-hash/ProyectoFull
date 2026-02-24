"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import esLocale from "@fullcalendar/core/locales/es";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CumpleaniosRes {
  nombreEmpleado: string;
  mes: number;
  dia: number;
}

interface Props {
  authHeaders: Record<string, string> | undefined;
}

interface PopoverState {
  isOpen: boolean;
  x: number;
  y: number;
  nombre: string;
  fecha: string;
}

export default function CalendarioCumpleanios({ authHeaders }: Props) {
  const [cumpleanios, setCumpleanios] = useState<CumpleaniosRes[]>([]);

  const [popover, setPopover] = useState<PopoverState>({
    isOpen: false,
    x: 0,
    y: 0,
    nombre: "",
    fecha: "",
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchCumpleanios = async () => {
      if (!apiUrl || !authHeaders) return;
      try {
        const res = await axios.get(
          `${apiUrl}/crovinternal/cumpleanios-empleados/todos`,
          {
            headers: authHeaders,
          },
        );
        setCumpleanios(res.data);
      } catch (error) {
        console.error("Error al cargar los cumpleaños", error);
      }
    };

    fetchCumpleanios();
  }, [apiUrl, authHeaders]);

  useEffect(() => {
    const handleScroll = () => {
      if (popover.isOpen) {
        setPopover((prev) => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [popover.isOpen]);

  const calendarEvents = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsToGenerate = [
      currentYear - 1,
      currentYear,
      currentYear + 1,
      currentYear + 2,
    ];
    const events: any[] = [];

    cumpleanios.forEach((emp) => {
      yearsToGenerate.forEach((year) => {
        const monthStr = String(emp.mes).padStart(2, "0");
        const dayStr = String(emp.dia).padStart(2, "0");

        const fechaFormateada = new Date(
          year,
          emp.mes - 1,
          emp.dia,
        ).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
        });

        events.push({
          title: `🎂 ${emp.nombreEmpleado}`,
          date: `${year}-${monthStr}-${dayStr}`,
          allDay: true,
          backgroundColor: "#f3e8ff",
          borderColor: "#d8b4fe",
          textColor: "#7e22ce",
          extendedProps: {
            nombreLimpio: emp.nombreEmpleado,
            fechaTexto: fechaFormateada,
          },
        });
      });
    });

    return events;
  }, [cumpleanios]);

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm relative">
      <h2 className="mb-4 text-xl font-bold text-orange-600">
        Calendario de cumpleaños
      </h2>

      {/* 
            CSS para que el color de la celda del día actual se distinga bien,
            capitalizar el nombre del mes actual, dar estilado a los botones 
            con el naranja CROV, dar estilado a las cabeceras de los dias de la semana
      */}
      <style>{`
        .fc .fc-day-today {
          background-color: #fed7aa !important; 
        }

        .fc .fc-toolbar-title {
          font-size: 1.5rem !important;
          font-weight: 600 !important;  
        }

        .fc .fc-toolbar-title::first-letter {
          text-transform: uppercase;
        }

        .fc .fc-button-primary {
          background-color: #f97316 !important; 
          border-color: #f97316 !important;
          color: white !important;
          text-transform: capitalize; 
        }
        
        .fc .fc-button-primary:hover {
          background-color: #ea580c !important; 
          border-color: #ea580c !important;
        }

        .fc .fc-button-primary:not(:disabled):active,
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #c2410c !important; 
          border-color: #c2410c !important;
        }
        
        .fc .fc-button-primary:disabled {
          background-color: #fdba74 !important;
          border-color: #fdba74 !important;
          opacity: 0.8 !important;
        }

        .fc .fc-button-primary:focus {
          box-shadow: 0 0 0 0.2rem rgba(249, 115, 22, 0.25) !important; 
        }

        .fc .fc-col-header-cell {
          background-color: #f97316 !important; 
          border-color: #ea580c !important; 
        }

        .fc .fc-col-header-cell-cushion {
          color: white !important; 
          padding: 8px 4px !important; 
          font-weight: 600 !important;
        }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        events={calendarEvents}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        buttonText={{
          today: "Hoy",
          month: "Mes",
        }}
        height="auto"
        firstDay={1}
        eventDisplay="block"
        eventContent={(eventInfo) => {
          return (
            <div
              className="truncate px-1.5 py-0.5 text-xs font-medium cursor-pointer transition-colors hover:bg-purple-200 rounded-sm"
              title={eventInfo.event.title}
            >
              {eventInfo.event.title}
            </div>
          );
        }}
        eventClick={(info) => {
          setPopover({
            isOpen: true,
            x: info.jsEvent.clientX,
            y: info.jsEvent.clientY,
            nombre: info.event.extendedProps.nombreLimpio,
            fecha: info.event.extendedProps.fechaTexto,
          });
        }}
      />

      <Popover
        open={popover.isOpen}
        onOpenChange={(open) =>
          setPopover((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <PopoverTrigger asChild>
          <div
            style={{
              position: "fixed",
              left: popover.x,
              top: popover.y,
              width: 1,
              height: 1,
              pointerEvents: "none",
            }}
          />
        </PopoverTrigger>

        <PopoverContent
          className="w-64 p-4 shadow-xl border-purple-200 bg-white"
          align="center"
          side="top"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl pt-1">🎂</span>
            <div className="flex flex-col">
              <h4 className="text-sm font-bold text-slate-800 leading-tight">
                {popover.nombre}
              </h4>
              <p className="text-xs text-purple-700 font-medium mt-1">
                {popover.fecha}
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
