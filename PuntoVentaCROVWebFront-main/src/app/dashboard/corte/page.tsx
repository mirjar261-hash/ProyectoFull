'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { BookOpen, PlayCircle } from 'lucide-react'; 

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

// === DEFINICIÓN DE LOS PASOS DE LA GUÍA (AJUSTADA PARA NO ESTORBAR) ===
const GUIDE_STEPS: GuideStep[] = [
  {
    targetKey: "select-usuario",
    title: "1. Selección de Usuario",
    content: "Para iniciar el corte, es obligatorio seleccionar primero al usuario. Esto cargará todos sus movimientos registrados en el turno actual.",
    placement: "right",          // Flecha a la derecha del selector
    modalPosition: "bottom-left" // Modal abajo a la izquierda (lejos del selector que está arriba)
  },
  {
    targetKey: "totales-section",
    title: "2. Resumen de Movimientos",
    content: "Revisa este panel. Aquí verás desglosados los ingresos (Ventas, Fondo de caja) y los egresos (Gastos, Retiros) calculados por el sistema.",
    placement: "top",            // Flecha apuntando desde arriba al bloque
    modalPosition: "bottom-right"// Modal abajo a la derecha (para dejar ver el grid completo)
  },
  {
    targetKey: "input-reportado",
    title: "3. Reportar Efectivo",
    content: "Cuenta el dinero físico que tienes en caja y escribe la cantidad aquí. El sistema te mostrará si hay un sobrante (verde) o faltante (rojo).",
    placement: "left",           // Flecha a la izquierda del input
    modalPosition: "top-left"    // Modal arriba a la izquierda (el input suele estar a la derecha)
  },
  {
    targetKey: "btn-guardar",
    title: "4. Finalizar Corte",
    content: "Una vez que cuadres tu efectivo, presiona 'Guardar corte'. Esto cerrará el turno, generará tu comprobante PDF y reiniciará los valores.",
    placement: "left",           // Flecha a la izquierda del botón
    modalPosition: "top-left"    // Modal arriba a la izquierda (el botón está abajo a la derecha)
  }
];

interface Usuario {
  id: number;
  nombre: string;
  apellidos?: string;
}

interface Total {
  tipo: string;
  monto: number;
}

interface Detalle {
  tipo: string;
  monto: number;
  comentarios?: string | null;
  fecha: string;
}

const INGRESOS = ['Venta', 'Fondo de caja', 'Inversión', 'Devolución de compra'];
const EGRESOS = ['Gasto', 'Retiro', 'Compra', 'Devolución de venta', 'Devolución de venta por producto'];

const formatFechaLocal = (fecha: string) => {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatCurrency = (value: number) =>
  value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function CorteDiaPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [totales, setTotales] = useState<Total[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [fechaUltimoCorte, setFechaUltimoCorte] = useState('');
  const [totalReportado, setTotalReportado] = useState('');

  // === ESTADO PARA LA GUÍA INTERACTIVA ===
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const startGuide = () => {
    setGuideActive(true);
    setCurrentStepIndex(0);
  };

  const closeGuide = () => {
    setGuideActive(false);
  };

  const handleNextStep = () => {
    if (currentStepIndex < GUIDE_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      closeGuide();
      toast.success("¡Has completado el recorrido!");
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  // === AUTO-APERTURA DE GUÍA (OBLIGATORIA LA PRIMERA VEZ) ===
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenCorteGuide');
    
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        startGuide();
        localStorage.setItem('hasSeenCorteGuide', 'true');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);


  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;

  const cargarUsuarios = async () => {
    try {
      const res = await axios.get(`${apiUrl}/users/activos?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuarios(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar usuarios');
    }
  };

  const cargarDatos = async (id: number) => {
    try {
      const res = await axios.get(
        `${apiUrl}/corte-dia/datos?sucursalId=${sucursalIdSession}&usuarioId=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTotales(res.data.totales || []);
      setDetalles(res.data.detalles || []);
      setFechaUltimoCorte(res.data.fechaUltimoCorte || '');
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos del corte');
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  useEffect(() => {
    if (usuarioId) {
      cargarDatos(Number(usuarioId));
    } else {
      setTotales([]);
      setDetalles([]);
      setFechaUltimoCorte('');
    }
  }, [usuarioId]);

  const totalAReportar = totales.reduce((sum, t) => {
    if (INGRESOS.includes(t.tipo)) return sum + Number(t.monto);
    if (EGRESOS.includes(t.tipo)) return sum - Number(t.monto);
    return sum;
  }, 0);
  const totalReportadoNum = Number(totalReportado) || 0;
  const diferencia = totalAReportar - totalReportadoNum;

  const generarPDF = () => {
    const doc = new jsPDF();
    let y = 10;
    doc.text('Corte del día', 10, y);
    y += 10;
    const usuario = usuarios.find((u) => u.id === Number(usuarioId));
    if (usuario) {
      doc.text(`Usuario: ${usuario.nombre} ${usuario.apellidos || ''}`, 10, y);
      y += 10;
    }
    doc.text(`Fecha: ${formatFechaLocal(new Date().toISOString())}`, 10, y);
    y += 10;
    doc.text(`Total a reportar: ${formatCurrency(totalAReportar)}`, 10, y);
    y += 10;
    doc.text(`Total reportado: ${formatCurrency(totalReportadoNum)}`, 10, y);
    y += 10;
    doc.text(`Diferencia: ${formatCurrency(diferencia)}`, 10, y);
    y += 10;
    autoTable(doc, {
      head: [['Tipo', 'Monto', 'Comentario', 'Fecha']],
      body: detalles.map((d) => [
        d.tipo,
        formatCurrency(Number(d.monto)),
        d.comentarios || '',
        formatFechaLocal(d.fecha),
      ]),
      startY: y + 5,
    });
    doc.save('corte_dia.pdf');
  };

  const guardarCorte = async () => {
    if (!usuarioId) {
      toast.error('Selecciona un usuario');
      return;
    }
    try {
      const payload = {
        sucursalId: sucursalIdSession,
        id_usuario_entrega: Number(usuarioId),
        id_usuario_recibe: Number(sucursalIdSession),
        fecha: new Date().toISOString(),
        monto_esperado: totalAReportar,
        monto_reportado: totalReportadoNum,
        activo: 1,
        comentarios: '',
        detalles,
      };
      await axios.post(`${apiUrl}/corte-dia`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Corte guardado');
      generarPDF();
      setUsuarioId('');
      setTotales([]);
      setDetalles([]);
      setFechaUltimoCorte('');
      setTotalReportado('');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar corte');
    }
  };

  return (
    <div className="space-y-6 relative">
      <h1 className="text-2xl font-bold text-orange-600">Corte del día</h1>

      {/* --- GUÍA INTERACTIVA --- */}
      {guideActive && (
        <>
          <GuideArrowOverlay 
            activeKey={GUIDE_STEPS[currentStepIndex].targetKey} 
            placement={GUIDE_STEPS[currentStepIndex].placement}
          />
          <GuideModal 
            isOpen={guideActive}
            step={GUIDE_STEPS[currentStepIndex]}
            currentStepIndex={currentStepIndex}
            totalSteps={GUIDE_STEPS.length}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onClose={closeGuide}
          />
        </>
      )}

      {/* Botones de Ayuda */}
      <div className="flex gap-2 mt-2 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={startGuide}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Guía Interactiva
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.open('https://www.youtube.com/watch?v=Y7Nm7IcNr4U&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=16', '_blank')}
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          Tutorial Rápido
        </Button>
      </div>

      <div className="flex items-end gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Usuario: </label>
          <select
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            className="border px-3 py-2 rounded"
            data-guide="select-usuario" // [GUÍA PASO 1]
          >
            <option value="">Selecciona un usuario</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} {u.apellidos || ''}
              </option>
            ))}
          </select>
        </div>
        {fechaUltimoCorte && (
          <div>
            <label className="text-sm font-medium text-gray-700">Último corte</label>
            <Input readOnly value={formatFechaLocal(fechaUltimoCorte)} />
          </div>
        )}
      </div>

      {totales.length > 0 && (
        <div className="space-y-4">
          {/* Sección de Totales (Ingresos y Egresos) */}
          <div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            data-guide="totales-section" // [GUÍA PASO 2]
          >
            {totales.map((t) => {
              const isIngreso = INGRESOS.includes(t.tipo);
              const isEgreso = EGRESOS.includes(t.tipo);
              const color = isIngreso ? 'text-green-600' : isEgreso ? 'text-red-600' : '';
              return (
                <div key={t.tipo}>
                  <label className={`text-sm font-medium ${color}`}>{t.tipo}</label>
                  <Input readOnly className={color} value={Number(t.monto).toFixed(2)} />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Total a reportar</label>
              <Input
                readOnly
                className={totalAReportar >= 0 ? 'text-green-600' : 'text-red-600'}
                value={totalAReportar.toFixed(2)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Total reportado</label>
              <Input
                type="number"
                value={totalReportado}
                onChange={(e) => setTotalReportado(e.target.value)}
                data-guide="input-reportado" // [GUÍA PASO 3]
              />
            </div>
            <div className="col-span-2 md:col-span-1 flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Diferencia</label>
                <Input
                  readOnly
                  className={diferencia >= 0 ? 'text-green-600' : 'text-red-600'}
                  value={diferencia.toFixed(2)}
                />
              </div>
              <Button 
                onClick={guardarCorte}
                data-guide="btn-guardar" // [GUÍA PASO 4]
              >
                Guardar corte
              </Button>
            </div>
          </div>
        </div>
      )}

      {detalles.length > 0 && (
        <div className="overflow-auto rounded border bg-white shadow">
          <Table>
            <TableHeader className="bg-orange-100">
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Comentario</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detalles.map((d, i) => {
                const isIngreso = INGRESOS.includes(d.tipo);
                const isEgreso = EGRESOS.includes(d.tipo);
                const color = isIngreso ? 'text-green-600' : isEgreso ? 'text-red-600' : '';
                return (
                  <TableRow key={i} className="hover:bg-orange-50">
                    <TableCell className={color}>{d.tipo}</TableCell>
                    <TableCell className={`text-right ${color}`}>
                      ${Number(d.monto).toFixed(2)}
                    </TableCell>
                    <TableCell>{d.comentarios || ''}</TableCell>
                    <TableCell>{formatFechaLocal(d.fecha)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
