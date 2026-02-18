'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Loader2, BookOpen, PlayCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableCell, TableBody, TableHead } from '@/components/ui/table';
import { toast } from 'sonner';
import { getUserPermissions } from '@/lib/permissions';
import axios from 'axios'; 
import {
  COLUMNAS_EXCEL,
  COLUMNAS_EXCEL_OBLIGATORIAS,
  ProductosExcelImportDialog,
  type ProductoExcel,
} from '@/components/ProductosExcelImportDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// === DEFINICIÓN DE LOS PASOS DE LA GUÍA NORMAL (HAY PRODUCTOS) ===
const GUIDE_STEPS: GuideStep[] = [
  {
    targetKey: "page-title",
    title: "1. Gestión de Inventario",
    content: "Bienvenido a tu inventario. Desde aquí podrás visualizar, buscar y administrar todos los productos registrados.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "excel-buttons",
    title: "2. Acciones Masivas",
    content: "Usa estas herramientas para descargar la plantilla base o importar productos masivamente desde Excel.",
    placement: "right",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "stats-cards",
    title: "3. Resumen Financiero",
    content: "Monitorea en tiempo real el valor de tu inversión (costo total) y la proyección de ganancias.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "search-section",
    title: "4. Buscador y Filtros",
    content: "Encuentra productos rápidamente por nombre o código. También puedes filtrar la lista por departamento.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "edit-btn-first", 
    title: "5. Editar Producto (Obligatorio)",
    content: "Haz clic en este botón (lápiz) para abrir la ventana de edición. LA GUÍA CONTINUARÁ DENTRO DE LA VENTANA.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: true 
  },
  // --- PASOS DENTRO DEL MODAL ---
  {
    targetKey: "modal-left-col",
    title: "6. Datos de Identificación",
    content: "En esta columna puedes modificar el Código de Barras, Nombre del producto y establecer el Stock Mínimo para recibir alertas.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "modal-right-col",
    title: "7. Costos y Precios",
    content: "Define tu costo de compra y actualiza tus 4 listas de precios. El sistema recalculará la utilidad automáticamente.",
    placement: "left",
    modalPosition: "left"
  },
  {
    targetKey: "input-cantidad-nueva",
    title: "8. Cantidad a Modificar",
    content: "Escribe aquí la cantidad de productos involucrados en el movimiento (ej. 10 unidades que llegaron, 5 mermas, o el total físico contado).",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "select-modo-inventario", 
    title: "9. Modo de Inventario (CRÍTICO)",
    content: "Define qué hará el sistema con la cantidad ingresada:\n• Entrada (+): SUMA al stock actual (compras).\n• Salida (-): RESTA del stock (mermas, uso interno).\n• Ajuste (=): SOBRESCRIBE el stock (inventario físico, corrección).",
    placement: "top",
    modalPosition: "top-right"
  },
  {
    targetKey: "modal-comments",
    title: "10. Comentarios",
    content: "Justifica el movimiento. Es obligatorio escribir una razón (ej. 'Factura #123', 'Producto caducado') para mantener el historial claro.",
    placement: "top",
    modalPosition: "top-right"
  },
  {
    targetKey: "modal-save-btn",
    title: "11. Guardar Cambios",
    content: "Finaliza haciendo clic en Guardar. El inventario se actualizará y el movimiento quedará registrado.",
    placement: "left",
    modalPosition: "top-left"
  }
];

// === NUEVO: DEFINICIÓN DE GUÍA PARA INVENTARIO VACÍO ===
const GUIDE_FLOW_EMPTY: GuideStep[] = [
  {
    targetKey: "page-title", 
    title: "1. Inventario Vacío",
    content: "Actualmente no tienes productos registrados para gestionar. Primero necesitas poblar tu base de datos.",
    placement: "bottom", 
    modalPosition: "bottom-left"
  },
  {
    targetKey: "nav-item-catalogo", // Apunta al menú de la barra lateral (asegúrate de agregar este data-guide en tu Sidebar)
    title: "2. ¡Comienza en el Catálogo!",
    content: "Ve al menú 'Catálogo' para dar de alta tus productos uno por uno con todo el detalle: fotos, claves SAT y costos. ¡Es la base fundamental para controlar tu negocio y empezar a vender!",
    placement: "right",
    modalPosition: "left",
    disableNext: true // Bloquea el avance, invitando a ir al menú
  }
];

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const numbersAreEqual = (a: unknown, b: unknown) => toFiniteNumber(a) === toFiniteNumber(b);

const calcularUtilidadPorcentaje = (precio?: number, costo?: number) => {
  const p = toFiniteNumber(precio);
  const c = toFiniteNumber(costo);

  if (p === undefined || c === undefined || c === 0) {
    return 0;
  }

  return ((p - c) / c) * 100;
};

const calcularTotalEsperadoInventario = (
  actual?: number,
  nuevo?: number,
  modo?: 'entrada' | 'salida' | 'ajuste'
) => {
  const a = toFiniteNumber(actual) ?? 0;
  const n = toFiniteNumber(nuevo);

  if (n === undefined || !modo) {
    return a;
  }

  if (modo === 'entrada') {
    return a + n;
  }

  if (modo === 'salida') {
    return a - n;
  }

  return n;
};

const esNumeroFinito = (valor: number | undefined): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor);

const obtenerErroresProductosExcel = (productos: ProductoExcel[]): string[] => {
  const errores: string[] = [];
  const codigos = new Set<string>();
  const codigosBarras = new Set<string>();

  productos.forEach((producto, index) => {
    const fila = index + 2;
    const codigo = producto.codigoProducto.trim();
    const codigoBarras = producto.codigoBarras.trim();
    const nombre = producto.nombreProducto.trim();

    if (!nombre) {
      errores.push(`Fila ${fila}: el nombre del producto es obligatorio.`);
    }

    if (!codigo) {
      errores.push(`Fila ${fila}: el código del producto es obligatorio.`);
    } else {
      const codigoNormalizado = codigo.toLowerCase();
      if (codigos.has(codigoNormalizado)) {
        errores.push(`Fila ${fila}: el código "${codigo}" está duplicado.`);
      }
      codigos.add(codigoNormalizado);
    }

    if (codigoBarras) {
      const codigoBarrasNormalizado = codigoBarras.toLowerCase();
      if (codigosBarras.has(codigoBarrasNormalizado)) {
        errores.push(
          `Fila ${fila}: el código de barras "${codigoBarras}" está duplicado.`
        );
      }
      codigosBarras.add(codigoBarrasNormalizado);
    }

    if (!Number.isFinite(producto.costo)) {
      errores.push(`Fila ${fila}: el costo es obligatorio.`);
    } else if ((producto.costo ?? 0) < 0) {
      errores.push(`Fila ${fila}: el costo debe ser un número mayor o igual a 0.`);
    }

    if (!Number.isFinite(producto.inventario)) {
      errores.push(`Fila ${fila}: el inventario inicial es obligatorio.`);
    } else if ((producto.inventario ?? 0) < 0) {
      errores.push(`Fila ${fila}: el inventario debe ser un número mayor o igual a 0.`);
    }

    if (!Number.isFinite(producto.precioPublico)) {
      errores.push(`Fila ${fila}: el precio público es obligatorio.`);
    } else if ((producto.precioPublico ?? 0) <= 0) {
      errores.push(`Fila ${fila}: el precio público debe ser un número mayor a 0.`);
    }

    if (!Number.isFinite(producto.precioConDescuento)) {
      errores.push(`Fila ${fila}: el precio con descuento es obligatorio.`);
    } else if ((producto.precioConDescuento ?? 0) < 0) {
      errores.push(
        `Fila ${fila}: el precio con descuento debe ser un número mayor o igual a 0.`
      );
    }

    if (!Number.isFinite(producto.precioSemiMayoreo)) {
      errores.push(`Fila ${fila}: el precio de semi mayoreo es obligatorio.`);
    } else if ((producto.precioSemiMayoreo ?? 0) < 0) {
      errores.push(
        `Fila ${fila}: el precio de semi mayoreo debe ser un número mayor o igual a 0.`
      );
    }

    if (!Number.isFinite(producto.precioMayoreo)) {
      errores.push(`Fila ${fila}: el precio de mayoreo es obligatorio.`);
    } else if ((producto.precioMayoreo ?? 0) < 0) {
      errores.push(
        `Fila ${fila}: el precio de mayoreo debe ser un número mayor o igual a 0.`
      );
    }

    if (Number.isFinite(producto.inventarioMinimo) && (producto.inventarioMinimo ?? 0) < 0) {
      errores.push(
        `Fila ${fila}: el inventario mínimo debe ser un número mayor o igual a 0.`
      );
    }

    if (Number.isFinite(producto.iva) && (producto.iva ?? 0) < 0) {
      errores.push(`Fila ${fila}: el IVA debe ser un número mayor o igual a 0.`);
    }

  });

  return errores;
};

interface Producto {
  id: string;
  codigo: string;
  cod_barras: string;
  nombre: string;
  costo: number;
  precio1: number;
  precio2: number;
  precio3: number;
  precio4: number;
  cantidad_existencia: number;
  stock_min: number;
  servicio?: number;
  insumo?: number;
  activo: number;
  clase: {
    nombre: string;
  };
}

interface Departamento {
  id: number;
  nombre: string;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(50);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');

  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoInventario, setModoInventario] = useState<'entrada' | 'salida' | 'ajuste'>('ajuste');
  const [formEditar, setFormEditar] = useState<any>({});
  const [erroresFormulario, setErroresFormulario] = useState<{ comentario?: string }>({});
  const [responsableNombre, setResponsableNombre] = useState('');
  const [cargandoResponsable, setCargandoResponsable] = useState(true);

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [departamentoId, setDepartamentoId] = useState<string>('');

  const [inversionTotal, setInversionTotal] = useState(0);
  const [proyeccionVenta, setProyeccionVenta] = useState(0);

  const [productosExcel, setProductosExcel] = useState<ProductoExcel[]>([]);
  const [productosExcelDialogOpen, setProductosExcelDialogOpen] = useState(false);
  const [guardandoProductosExcel, setGuardandoProductosExcel] = useState(false);
  const [estadoGuardadoProductos, setEstadoGuardadoProductos] = useState<{
    total: number;
    procesados: number;
  }>({ total: 0, procesados: 0 });

  // === ESTADO PARA LA GUÍA INTERACTIVA ===
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession =
    typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('sucursalId') || '0', 10)
      : 0;

  // --- FUNCIÓN UNIFICADA PARA INICIAR GUÍA ---
  const startGuide = (mode: 'NORMAL' | 'EMPTY') => {
    let steps = GUIDE_STEPS;
    if (mode === 'EMPTY') steps = GUIDE_FLOW_EMPTY;

    setCurrentSteps(steps);
    setGuideActive(true);
    setCurrentStepIndex(0);
    
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  };

  const closeGuide = () => {
    setGuideActive(false);
  };

  const handleNextStep = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      closeGuide();
      if (currentSteps !== GUIDE_FLOW_EMPTY) {
        toast.success("¡Recorrido completado!");
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // --- LÓGICA DE DETECCIÓN (INTELIGENTE) ---
  const checkInventoryAndStart = async () => {
    // 1. Verificación rápida local
    if (!cargando && productos.length > 0) {
        startGuide('NORMAL');
        localStorage.setItem('hasSeenProductosGuide', 'true');
        return;
    }

    try {
      const params = new URLSearchParams({
        pagina: "1",
        limite: "1", 
        sucursalId: sucursalIdSession.toString(),
      });

      const res = await axios.get(
        `${apiUrl}/producto/productosPaginacion?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data || {};
      const lista = Array.isArray(data) ? data : (data?.productos || []);
      const hayProductos = lista.length > 0;

      if (hayProductos) {
        // CASO A: HAY PRODUCTOS
        startGuide('NORMAL');
        localStorage.setItem('hasSeenProductosGuide', 'true');
      } else {
        // CASO B: LISTA VACÍA
        throw new Error("Inventario vacío"); 
      }
      
    } catch (error) {
      // CASO C: VACÍO O ERROR -> Muestra solo guía alternativa
      console.warn("Inventario vacío o error:", error);
      
      startGuide('EMPTY');
      toast.warning("No hay productos en el inventario.");
      // No guardamos para que siga saliendo
    }
  };

  // EFECTO: Avance automático al abrir el modal en el paso 5
  useEffect(() => {
    if (guideActive && currentSteps === GUIDE_STEPS && currentStepIndex === 4 && modalAbierto) {
      setTimeout(() => {
        handleNextStep();
      }, 300);
    }
  }, [modalAbierto, guideActive, currentStepIndex, currentSteps]);

  // Auto-inicio de la guía
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenProductosGuide');
    if (!hasSeenGuide && !cargando) {
      const timer = setTimeout(() => {
         if (productos.length > 0) {
             startGuide('NORMAL');
             localStorage.setItem('hasSeenProductosGuide', 'true');
         } else {
             checkInventoryAndStart();
         }
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [cargando]);

  // Handler para el botón manual
  const handleManualGuideClick = () => {
      if (productos.length > 0) {
          startGuide('NORMAL');
      } else {
          checkInventoryAndStart();
      }
  };

  const handleProductosExcelImport = (productos: ProductoExcel[]) => {
    setProductosExcel(productos);
    setProductosExcelDialogOpen(true);
  };

  const descargarPlantillaExcel = () => {
    const workbook = XLSX.utils.book_new();
    const encabezados = Array.from(COLUMNAS_EXCEL);
    const filaTitulo = Array(encabezados.length).fill('');
    filaTitulo[0] = 'Lista de productos';
    const filaLeyenda = Array(encabezados.length).fill('');
    filaLeyenda[0] = `Campos obligatorios: ${COLUMNAS_EXCEL_OBLIGATORIAS.join(', ')}`;
    const sheetData = [filaTitulo, filaLeyenda, encabezados];
    const sheet = XLSX.utils.aoa_to_sheet(sheetData);

    sheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: encabezados.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: encabezados.length - 1 } },
    ];

    const cabeceraPrincipal = sheet['A1'];
    if (cabeceraPrincipal && typeof cabeceraPrincipal === 'object') {
      (cabeceraPrincipal as XLSX.CellObject).s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center' },
      } as XLSX.CellObject['s'];
    }

    const leyenda = sheet['A2'];
    if (leyenda && typeof leyenda === 'object') {
      (leyenda as XLSX.CellObject).s = {
        font: { italic: true },
        alignment: { horizontal: 'center' },
      } as XLSX.CellObject['s'];
    }

    const columnasObligatorias = new Set(COLUMNAS_EXCEL_OBLIGATORIAS);
    columnasObligatorias.forEach((columna) => {
      const indice = encabezados.indexOf(columna);
      if (indice === -1) return;
      const address = XLSX.utils.encode_cell({ r: 2, c: indice });
      const celda = sheet[address];
      if (celda && typeof celda === 'object') {
        (celda as XLSX.CellObject).s = {
          font: { bold: true, color: { rgb: 'FFFFFFFF' } },
          fill: { fgColor: { rgb: 'FFFF0000' } },
          alignment: { horizontal: 'center' },
        } as XLSX.CellObject['s'];
      }
    });

    XLSX.utils.book_append_sheet(workbook, sheet, 'Plantilla');
    XLSX.writeFile(workbook, 'plantilla_productos.xlsx');
  };

  const cancelarImportacionProductosExcel = () => {
    setProductosExcel([]);
    setProductosExcelDialogOpen(false);
    toast.info('Se canceló la importación de productos.');
  };

  const mapIvaExcelToApi = (valor: number | undefined): string | null => {
    if (valor === undefined) return null;
    if (!Number.isFinite(valor)) return null;
    if (valor === 16) return '16';
    if (valor === 8) return '8';
    if (valor === 0) return '0';
    if (valor > 1) {
      const decimal = valor / 100;
      return decimal.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') || null;
    }
    return valor > 0 ? valor.toString() : null;
  };

  const numeroOAtributoNulo = (valor: number | undefined): number | null =>
    typeof valor === 'number' && Number.isFinite(valor) ? valor : null;

  const cadenaOVacia = (valor: string | undefined): string => valor?.trim() || '';

  const confirmarProductosExcel = async () => {
    const errores = obtenerErroresProductosExcel(productosExcel);

    if (errores.length > 0) {
      const [principal, ...resto] = errores;
      const resumen =
        resto.length > 0
          ? `${principal} Además, se detectaron ${resto.length} error(es) adicional(es).`
          : principal;

      toast.error('Corrige los productos importados antes de guardarlos.', {
        description: resumen,
      });
      console.info('Errores de validación en productos importados:', errores);
      return;
    }

    if (!apiUrl) {
      console.info('No se encontró la configuración de la API.');
      return;
    }

    const tokenLocal = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!tokenLocal) {
      toast.error('No se encontró el token de autenticación. Vuelve a iniciar sesión.');
      return;
    }

    const sucursalIdLocal =
      typeof window !== 'undefined' ? localStorage.getItem('sucursalId') : null;
    const sucursalId = sucursalIdLocal ? Number(sucursalIdLocal) : sucursalIdSession;

    if (!Number.isFinite(sucursalId) || sucursalId <= 0) {
      toast.error('Selecciona una sucursal válida antes de guardar los productos.');
      return;
    }

    const totalProductos = productosExcel.length;
    setGuardandoProductosExcel(true);
    setEstadoGuardadoProductos({ total: totalProductos, procesados: 0 });

    const productosFallidos: ProductoExcel[] = [];
    const erroresGuardado: string[] = [];
    let guardados = 0;
    let procesados = 0;

    const calcularUtilidad = (precio: number | null, costo: number | null) => {
      if (
        costo === null ||
        !Number.isFinite(costo) ||
        costo <= 0 ||
        precio === null ||
        !Number.isFinite(precio)
      ) {
        return 0;
      }
      return ((precio - costo) / costo) * 100;
    };

    try {
      for (const producto of productosExcel) {
        try {
          const nombreDepartamento = cadenaOVacia(producto.departamento);
          const departamento = nombreDepartamento
            ? departamentos.find(
                (d) => d.nombre.trim().toLowerCase() === nombreDepartamento.toLowerCase()
              )
            : undefined;

          if (nombreDepartamento && !departamento) {
            throw new Error(
              `Departamento "${nombreDepartamento}" no encontrado.`
            );
          }

          const costo = numeroOAtributoNulo(producto.costo);
          const precioPublico = numeroOAtributoNulo(producto.precioPublico);
          const precioConDescuento = numeroOAtributoNulo(producto.precioConDescuento);
          const precioSemiMayoreo = numeroOAtributoNulo(producto.precioSemiMayoreo);
          const precioMayoreo = numeroOAtributoNulo(producto.precioMayoreo);
          const inventario = numeroOAtributoNulo(producto.inventario);
          const inventarioMinimo = numeroOAtributoNulo(producto.inventarioMinimo);

          const codigoProducto = cadenaOVacia(producto.codigoProducto);

          const payload = {
            cod_barras: cadenaOVacia(producto.codigoBarras) || codigoProducto,
            codigo: codigoProducto,
            cod_del_fabricante: null,
            nombre: cadenaOVacia(producto.nombreProducto),
            costo,
            stock_min: inventarioMinimo,
            idclase: departamento?.id ?? null,
            idmarca: null,
            idmodelo: null,
            unidad_medida: null,
            clave_unidad_medida: cadenaOVacia(producto.claveUnidadSat),
            clave_prodserv: cadenaOVacia(producto.codigoSat),
            activo: 1,
            servicio: 0,
            utilidad1: calcularUtilidad(precioPublico, costo),
            utilidad2: calcularUtilidad(precioConDescuento, costo),
            utilidad3: calcularUtilidad(precioSemiMayoreo, costo),
            utilidad4: calcularUtilidad(precioMayoreo, costo),
            precio1: precioPublico,
            precio2: precioConDescuento,
            precio3: precioSemiMayoreo,
            precio4: precioMayoreo,
            bascula: 0,
            cantidad_existencia: inventario,
            cantidad_inicial: inventario,
            impuesto: mapIvaExcelToApi(producto.iva),
            insumo: 0,
            tipo_medicamento: null,
            tipo_ieps: null,
            cantidad_ieps: null,
            sucursalId,
          };

          const response = await fetch(`${apiUrl}/producto/productos/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokenLocal}`,
            },
            body: JSON.stringify(payload),
          });

          let data: any = null;
          try {
            data = await response.json();
          } catch (error) {
            data = null;
          }

          if (!response.ok) {
            const mensaje =
              data?.mensaje || data?.error || `Error al guardar el producto (${response.status}).`;
            throw new Error(mensaje);
          }

          guardados += 1;
        } catch (error) {
          const mensaje =
            error instanceof Error ? error.message : 'Ocurrió un error desconocido al guardar.';
          erroresGuardado.push(`${producto.nombreProducto}: ${mensaje}`);
          productosFallidos.push(producto);
        } finally {
          procesados += 1;
          setEstadoGuardadoProductos({ total: totalProductos, procesados });
        }
      }

      if (guardados > 0) {
        toast.success(
          guardados === 1
            ? '1 producto guardado correctamente.'
            : `${guardados} productos guardados correctamente.`
        );
        try {
          await cargarProductos();
        } catch (error) {
          console.error('Error al recargar los productos después de importar desde Excel:', error);
          toast.error('Los productos se guardaron pero no se pudo recargar la lista.');
        }
      }

      if (erroresGuardado.length > 0) {
        const [principal, ...resto] = erroresGuardado;
        const descripcion =
          resto.length > 0
            ? `${principal}\nAdemás, ${resto.length} producto(s) adicional(es) no se pudieron guardar.`
            : principal;

        toast.error('Algunos productos no se pudieron guardar.', {
          description: descripcion,
        });
        setProductosExcel(productosFallidos);
        setProductosExcelDialogOpen(true);
      } else {
        setProductosExcel([]);
        setProductosExcelDialogOpen(false);
      }
    } catch (error) {
      console.error('Error inesperado al guardar productos desde Excel:', error);
      toast.error('Ocurrió un error inesperado al guardar los productos importados.');
    } finally {
      setGuardandoProductosExcel(false);
      setEstadoGuardadoProductos({ total: 0, procesados: 0 });
    }
  };

  // Permiso para mostrar el botón de registrar usuarios
  const [permisos, setPermisos] = useState<Record<string, boolean>>({})
  const userIdSession =
    typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('userId') || '0', 10)
      : 0;
   const cargarPermisosUser = async () => {
  const permisosAValidar = [
    'Inventario/Cambio de precios',
    'Inventario/Plantilla Excel',
    'Inventario/Importar datos Excel',
  ]

    const data = await getUserPermissions(userIdSession, token || undefined)

    const tienePermiso = (permiso: string) => {
      if (Array.isArray(data)) {
        return data.some(
          (p: any) =>
            p.nombre === permiso ||
            p.permiso === permiso ||
            p.id === permiso
)
      }
      const value = data?.[permiso]
      return value === 1 || value === true
    }

    const mapa = Object.fromEntries(
      permisosAValidar.map((p) => [p, tienePermiso(p)])
    )
    setPermisos(mapa)
  }

  useEffect(() => {
    const fetchDepartamentos = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(
          `${apiUrl}/departamento?sucursalId=${sucursalIdSession}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setDepartamentos(data);
      } catch (err) {
        console.error('Error al cargar departamentos:', err);
      }
    };  fetchDepartamentos();
    cargarPermisosUser();
  }, []);

  useEffect(() => {
    const cargarResponsable = async () => {
      try {
        const emailLocal = localStorage.getItem('email') || '';

        if (!apiUrl) {
          if (emailLocal) setResponsableNombre(emailLocal);
          return;
        }

        const tokenLocal = localStorage.getItem('token');
        if (!tokenLocal) {
          if (emailLocal) setResponsableNombre(emailLocal);
          return;
        }

        const res = await fetch(`${apiUrl}/auth/perfil`, {
          headers: {
            Authorization: `Bearer ${tokenLocal}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          const nombreCompleto = [data?.nombre, data?.apellidos]
            .filter(Boolean)
            .join(' ')
            .trim();

          if (nombreCompleto) {
            setResponsableNombre(nombreCompleto);
          }
        } else if (emailLocal) {
          setResponsableNombre(emailLocal);
        }
      } catch (error) {
        console.error('Error al cargar perfil de usuario:', error);
        const emailLocal = localStorage.getItem('email');
        if (emailLocal) setResponsableNombre(emailLocal);
      } finally {
        setCargandoResponsable(false);
      }
    };

    cargarResponsable();
  }, [apiUrl]);
//Inversiones
const calcularTotales = () => {
  const productosConInventario = productos.filter(
    producto => Number(producto.servicio ?? 0) !== 1
  );

  const inversion = productosConInventario.reduce((acc, p) =>
    acc + ((Number(p.costo) || 0) * (Number(p.cantidad_existencia) || 0)), 0
  );

   const proyeccion = productosConInventario.reduce((acc, p) =>
    acc + ((Number(p.precio1) || 0) * (Number(p.cantidad_existencia) || 0)), 0
  );

  setInversionTotal(inversion);
  setProyeccionVenta(proyeccion);
};


    const cargarProductos = async () => {
    setCargando(true);

    const params = new URLSearchParams({
      pagina: "1", // <-- porque queremos recargar desde la primera
      limite: limite.toString(),
      sucursalId: sucursalIdSession.toString(),
      termino: terminoBusqueda
    });

    if (departamentoId && departamentoId.trim() !== '') {
      params.append('departamentoId', departamentoId);
    }

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${apiUrl}/producto/productosPaginacion?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      setProductos(data?.productos || []);
      setTotal(data?.total || 0);
      setPagina(1); // aseguramos que el paginador quede en 1 también
    } catch (err) {
      console.error('Error al recargar productos:', err);
      setProductos([]);
      setTotal(0);
    } finally {
      setCargando(false);
      await calcularTotales();
    }
  };


  useEffect(() => {
  setCargando(true);

  const params = new URLSearchParams({
    pagina: pagina.toString(),
    limite: limite.toString(),
    sucursalId: sucursalIdSession.toString(),
    termino: terminoBusqueda
  });

  if (departamentoId && departamentoId.trim() !== '') {
    params.append('departamentoId', departamentoId);
  }

  const token = localStorage.getItem('token');

  fetch(`${apiUrl}/producto/productosPaginacion?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      setProductos(data?.productos || []);
      setTotal(data?.total || 0);
      setCargando(false);
    })
    .catch(err => {
      console.error('Error al obtener productos:', err);
      setProductos([]);
      setTotal(0);
      setCargando(false);
    });
}, [pagina, limite, terminoBusqueda, departamentoId]);

  useEffect(() => {
    if(productos.length > 0){
    calcularTotales();
    }
  }, [productos]);


  const totalPaginas = Math.ceil(total / limite);
  //calculo total esperado antes del envio

  const totalEsperado = calcularTotalEsperadoInventario(
    formEditar.cantidad_existencia,
    formEditar.inventarioNuevo,
    modoInventario
  );


  return (
    <div className="p-4 relative">
      <h1 className="text-2xl font-bold mb-4" data-guide="page-title">Productos</h1>

      {/* --- GUÍA INTERACTIVA (Flechas + Modal) --- */}
      {guideActive && currentSteps.length > 0 && (
        <>
          <GuideArrowOverlay 
            activeKey={currentSteps[currentStepIndex].targetKey} 
            placement={currentSteps[currentStepIndex].placement}
          />
          <GuideModal 
            isOpen={guideActive}
            step={currentSteps[currentStepIndex]}
            currentStepIndex={currentStepIndex}
            totalSteps={currentSteps.length}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onClose={closeGuide}
          />
        </>
      )}

      {/* Botones de Ayuda */}
      <div className="flex gap-2 mt-2 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleManualGuideClick}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Guía Interactiva
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.open('https://www.youtube.com/watch?v=MBlS7wwaiNo&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=3', '_blank')}
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          Tutorial Rápido
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-guide="excel-buttons">
        <div className="flex flex-col gap-2 sm:flex-row">
          {permisos['Inventario/Plantilla Excel'] && (
            <Button variant="outline" onClick={descargarPlantillaExcel}>
              <Download className="mr-2 h-4 w-4" /> Descargar plantilla de Excel
            </Button>
          )}
          {permisos['Inventario/Importar datos Excel'] && (
            <ProductosExcelImportDialog onProductsImported={handleProductosExcelImport} />
          )}
        </div>
      </div>

      <Dialog
        open={productosExcelDialogOpen && productosExcel.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setProductosExcelDialogOpen(false);
          } else if (productosExcel.length > 0) {
            setProductosExcelDialogOpen(true);
          }
        }}
      >
        {productosExcel.length > 0 && (
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Productos importados temporalmente</DialogTitle>
              <DialogDescription>
                Revisa la información antes de continuar con el registro de los nuevos productos.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Código de barras</TableHead>
                    <TableHead>Inventario</TableHead>
                    <TableHead>Inventario mínimo</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Precio público</TableHead>
                    <TableHead>Precio con descuento</TableHead>
                    <TableHead>Precio semi mayoreo</TableHead>
                    <TableHead>Precio mayoreo</TableHead>
                    <TableHead>Clave unidad SAT</TableHead>
                    <TableHead>Código SAT</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>IVA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosExcel.map((producto, index) => (
                    <TableRow
                      key={`${producto.codigoProducto}-${producto.codigoBarras}-${producto.nombreProducto}-${index}`}
                    >
                      <TableCell>{producto.nombreProducto}</TableCell>
                      <TableCell>{producto.codigoProducto}</TableCell>
                      <TableCell>{producto.codigoBarras}</TableCell>
                      <TableCell>
                        {esNumeroFinito(producto.inventario)
                          ? producto.inventario
                          : ''}
                      </TableCell>
                      <TableCell>
                        {esNumeroFinito(producto.inventarioMinimo)
                          ? producto.inventarioMinimo
                          : ''}
                      </TableCell>
                      <TableCell>
                        {esNumeroFinito(producto.costo)
                          ? `$${producto.costo.toFixed(2)}`
                          : ''}
                      </TableCell>
                      <TableCell>
                        {esNumeroFinito(producto.precioPublico)
                          ? `$${producto.precioPublico.toFixed(2)}`
                          : ''}
                      </TableCell>
                      <TableCell>
                        {esNumeroFinito(producto.precioConDescuento)
                          ? `$${producto.precioConDescuento.toFixed(2)}`
                          : ''}
                      </TableCell>
                      <TableCell>
                        {esNumeroFinito(producto.precioSemiMayoreo)
                          ? `$${producto.precioSemiMayoreo.toFixed(2)}`
                          : ''}
                      </TableCell>
                      <TableCell>
                        {esNumeroFinito(producto.precioMayoreo)
                          ? `$${producto.precioMayoreo.toFixed(2)}`
                          : ''}
                      </TableCell>
                      <TableCell>{producto.claveUnidadSat}</TableCell>
                      <TableCell>{producto.codigoSat}</TableCell>
                      <TableCell>{producto.departamento}</TableCell>
                      <TableCell>{producto.marca}</TableCell>
                      <TableCell>{producto.modelo}</TableCell>
                      <TableCell>
                        {esNumeroFinito(producto.iva) ? producto.iva : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Nota: al reiniciar la página se perderán los datos guardados temporalmente.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={cancelarImportacionProductosExcel}
                disabled={guardandoProductosExcel}
              >
                Cancelar
              </Button>
              <Button onClick={confirmarProductosExcel} disabled={guardandoProductosExcel}>
                {guardandoProductosExcel ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  'Guardar productos'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={guardandoProductosExcel} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm [&>button]:hidden">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <DialogTitle className="text-lg font-semibold">
              Guardando productos importados
            </DialogTitle>
            <DialogDescription>
              {estadoGuardadoProductos.total > 0
                ? `Procesando ${estadoGuardadoProductos.procesados} de ${estadoGuardadoProductos.total} producto(s).`
                : 'Esto puede tardar unos segundos.'}
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-4 flex flex-wrap gap-4" data-guide="stats-cards">
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded">
          <span className="font-semibold">Inversión total: </span>${inversionTotal.toLocaleString()}
        </div>
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded">
          <span className="font-semibold">Proyección de venta: </span>${proyeccionVenta.toLocaleString()}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTerminoBusqueda(busqueda); // 👈 solo actualiza al presionar ENTER
          setPagina(1); // opcional: reinicia a página 1 al buscar
        }}
        className="mb-4"
        data-guide="search-section"
      >

      <div className="mb-4 flex gap-2">
        <Input
          type="text"
          placeholder="Buscar por nombre o código de barras..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
         <select
          className="border px-2 py-2 rounded"
          value={departamentoId}
          onChange={(e) => {
            setDepartamentoId(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todos los departamentos</option>
          {departamentos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
      </div>

      </form>

      {cargando ? (
        <p>Cargando...</p>
      ) : (
        <div data-guide="products-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Código de barras</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Precio público</TableHead>
                <TableHead>Precio con descuento</TableHead>
                <TableHead>Precio semi mayoreo</TableHead>
                <TableHead>Precio mayoreo</TableHead>
                <TableHead>Inventario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              
              {productos.map((producto, index) => (
                <TableRow key={producto.id}>
                  <TableCell>{producto.codigo}</TableCell>
                  <TableCell>{producto.cod_barras}</TableCell>
                  <TableCell>{producto.nombre}</TableCell>
                  <TableCell>{producto.clase?.nombre || 'Sin clase'}</TableCell>
                  <TableCell>${producto.costo}</TableCell>
                  <TableCell>${producto.precio1}</TableCell>
                  <TableCell>${producto.precio2}</TableCell>
                  <TableCell>${producto.precio3}</TableCell>
                  <TableCell>${producto.precio4}</TableCell>
                  <TableCell
                    className={
                      producto.servicio === 1 || (producto.insumo ?? 0) > 0
                        ? 'text-center'
                        : producto.cantidad_existencia <= 0
                        ? 'bg-red-300 text-red-900 font-semibold text-center'
                        : producto.cantidad_existencia <= producto.stock_min
                        ? 'bg-yellow-200 text-yellow-900 font-semibold text-center'
                        : 'text-center'
                    }
                  >
                    {producto.servicio === 1 || (producto.insumo ?? 0) > 0
                      ? 'N/A'
                      : producto.cantidad_existencia}
                  </TableCell>
                  <TableCell>
                    {permisos['Inventario/Cambio de precios']&&(
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setProductoEditar(producto);
                        setFormEditar({ ...producto }); // Copia inicial del producto
                        setModoInventario('ajuste');
                        setModalAbierto(true);
                      }}
                      data-guide={index === 0 ? "edit-btn-first" : undefined} // SOLO APUNTAMOS AL PRIMER BOTÓN
                    >
                      ✏️
                    </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
          Anterior
        </Button>
        <span>
          Página {pagina} de {totalPaginas}
        </span>
        <Button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>
          Siguiente
        </Button>
        <select
          className="ml-4 border px-2 py-1 rounded"
          value={limite}
          onChange={e => setLimite(Number(e.target.value))}
        >
          {[10, 20, 50, 100].map(op => (
            <option key={op} value={op}>
              {op} por página
            </option>
          ))}
        </select>
      </div>

      {modalAbierto && productoEditar && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-4xl">
            <h2 className="text-2xl font-bold mb-6 text-center">Editar Producto</h2>

            {/* Secciones principales */}
            <div className="grid grid-cols-2 gap-6">
              {/* Columna izquierda */}
              <div className="space-y-4" data-guide="modal-left-col">
                <div>
                  <label className="block text-sm font-medium">Código de barras</label>
                  <Input
                    value={formEditar.cod_barras}
                    onChange={(e) => setFormEditar({ ...formEditar, cod_barras: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Nombre</label>
                  <Input
                    value={formEditar.nombre}
                    onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Stock mínimo</label>
                  <Input
                    type="number"
                    value={formEditar.stock_min ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parsed = val === '' ? undefined : parseInt(val, 10);
                      setFormEditar({
                        ...formEditar,
                        stock_min:
                          parsed === undefined || Number.isNaN(parsed)
                            ? undefined
                            : parsed,
                      });
                    }}
                  />
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-4" data-guide="modal-right-col">
                <div>
                  <label className="block text-sm font-medium">Costo</label>
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={formEditar.costo ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const costo = val === '' ? undefined : Number(val);
                      setFormEditar((prev: any) => {
                        const next: any = {
                          ...prev,
                          costo: Number.isFinite(costo as number) ? (costo as number) : undefined,
                        };

                        if (prev.inventarioNuevo !== undefined) {
                          next.inventarioNuevo = undefined;
                        }

                        return next;
                      });
                      setModoInventario('ajuste');
                    }}
                  />

                </div>

                 {['Precio público', 'Precio con descuento', 'Precio semi mayoreo', 'Precio mayoreo'].map((label, index) => {
                  const num = index + 1;
                  return (
                    <div key={num}>
                      <label className="block text-sm font-medium">{label}</label>
                      <Input
                        type="number"
                        value={formEditar[`precio${num}`] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const precio = val === '' ? undefined : Number(val);
                          setFormEditar((prev: any) => {
                            const next: any = { ...prev };
                            const key = `precio${num}`;

                            if (Number.isFinite(precio as number)) {
                              next[key] = precio as number;
                            } else {
                              next[key] = undefined;
                            }

                            if (prev.inventarioNuevo !== undefined) {
                              next.inventarioNuevo = undefined;
                            }

                            const utilidadKey = `utilidad${num}`;
                            if (utilidadKey in next) {
                              delete next[utilidadKey];
                            }

                            return next;
                          });
                          setModoInventario('ajuste');
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sección inferior */}
            <div className="grid grid-cols-4 gap-4 mt-6" data-guide="modal-inventory-section">
              <div>
                <label className="block text-sm font-medium">Cantidad actual (solo lectura)</label>
                <Input value={formEditar.cantidad_existencia} disabled />
              </div>

              <div>
                <label className="block text-sm font-medium" data-guide="input-cantidad-nueva">Cantidad nueva</label>
                <Input
                  type="number"
                  value={formEditar.inventarioNuevo ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const cantidad = val === '' ? undefined : Number(val);
                    setFormEditar((prev: any) => ({
                      ...prev,
                      inventarioNuevo: Number.isFinite(cantidad as number)
                        ? (cantidad as number)
                        : undefined,
                    }));
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Total esperado (solo lectura)</label>
                <Input
                  type="number"
                  value={Number.isFinite(totalEsperado) ? totalEsperado : 0}
                  disabled
                  className={
                    totalEsperado < 0
                      ? 'bg-red-100 text-red-800 font-semibold'
                      : ''
                  }
                />
                {totalEsperado < 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Este movimiento dejaría el inventario en negativo.
                  </p>
                )}
              </div>

              <div data-guide="select-modo-inventario">
                <label className="block text-sm font-medium">Modo de inventario</label>
                <select
                  value={modoInventario}
                  onChange={(e) => setModoInventario(e.target.value as any)}
                  className="border rounded px-2 py-2 w-full"
                >
                  <option value="entrada">Entrada (+)</option>
                  <option value="salida">Salida (-)</option>
                  <option value="ajuste">Ajuste (igualar)</option>
                </select>
              </div>
            </div>



            <div className="mt-4" data-guide="modal-comments">
              <label className="block text-sm font-medium">Comentario</label>
              <Input
                value={formEditar.comentario || ''}
                 onChange={(e) => {
                  setFormEditar({ ...formEditar, comentario: e.target.value });
                  if (erroresFormulario.comentario) {
                    setErroresFormulario((prev) => {
                      const next = { ...prev };
                      delete next.comentario;
                      return next;
                    });
                  }
                }}
              />
              {erroresFormulario.comentario && (
                <p className="text-sm text-red-500 mt-1">
                  {erroresFormulario.comentario}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Responsable del movimiento:{' '}
                {cargandoResponsable
                  ? 'Cargando...'
                  : responsableNombre || 'Sin información'}
              </p>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-4 mt-8">
              <Button variant="secondary" onClick={() => setModalAbierto(false)}>
                Cancelar
              </Button>
              <Button
                data-guide="modal-save-btn"
                onClick={async () => {
                  setErroresFormulario({});
                  const nuevoInventario = toFiniteNumber(formEditar.inventarioNuevo);
                  let nuevaCantidad = formEditar.cantidad_existencia;
                  let cantidadMovimiento = nuevoInventario ?? 0;
                  let forzarAjuste = false;

                  const estaActualizandoPrecios =
                    !numbersAreEqual(formEditar.costo, productoEditar?.costo) ||
                    !numbersAreEqual(formEditar.precio1, productoEditar?.precio1) ||
                    !numbersAreEqual(formEditar.precio2, productoEditar?.precio2) ||
                    !numbersAreEqual(formEditar.precio3, productoEditar?.precio3) ||
                    !numbersAreEqual(formEditar.precio4, productoEditar?.precio4);

                  if (nuevoInventario !== undefined) {
                    forzarAjuste = estaActualizandoPrecios && modoInventario !== 'ajuste';

                    if (forzarAjuste || modoInventario === 'ajuste') {
                      cantidadMovimiento = Math.abs(nuevoInventario - formEditar.cantidad_existencia);
                      nuevaCantidad = nuevoInventario;
                    } else if (modoInventario === 'entrada') {
                      nuevaCantidad += nuevoInventario;
                    } else if (modoInventario === 'salida') {
                      nuevaCantidad -= nuevoInventario;
                      if (nuevaCantidad < 0) {
                        toast.error('No puedes tener inventario negativo.');
                        return;
                      }
                    }
                  }

                  const hayCambioProducto =
                    formEditar.cod_barras !== productoEditar?.cod_barras ||
                    formEditar.nombre !== productoEditar?.nombre ||
                    !numbersAreEqual(formEditar.costo, productoEditar?.costo) ||
                    !numbersAreEqual(formEditar.precio1, productoEditar?.precio1) ||
                    !numbersAreEqual(formEditar.precio2, productoEditar?.precio2) ||
                    !numbersAreEqual(formEditar.precio3, productoEditar?.precio3) ||
                    !numbersAreEqual(formEditar.precio4, productoEditar?.precio4) ||
                    !numbersAreEqual(formEditar.stock_min, productoEditar?.stock_min) ||
                    !numbersAreEqual(nuevaCantidad, productoEditar?.cantidad_existencia);

                  const comentarioTrim = (formEditar.comentario || '').trim();
                  const hayCambioComentario = comentarioTrim !== '';
                  const hayCambioCantidad =
                    nuevoInventario !== undefined &&
                    !numbersAreEqual(nuevaCantidad, formEditar.cantidad_existencia);

                  if (hayCambioCantidad && comentarioTrim === '') {
                    setErroresFormulario({
                      comentario: 'Ingresa un comentario para registrar el movimiento de inventario.',
                    });
                    toast.error('El comentario es obligatorio para registrar movimientos de inventario.');
                    return;
                  }


                  if (!hayCambioProducto && !hayCambioComentario) {
                    toast.error('No se encontraron cambios para guardar');
                    return;
                  }

                  try {
                    const token = localStorage.getItem('token');
                    const body = {
                      sucursalId: sucursalIdSession,
                      cod_barras: formEditar.cod_barras,
                      nombre: formEditar.nombre,
                      costo: formEditar.costo,
                      precio1: formEditar.precio1,
                      precio2: formEditar.precio2,
                      precio3: formEditar.precio3,
                      precio4: formEditar.precio4,
                      utilidad1: calcularUtilidadPorcentaje(formEditar.precio1, formEditar.costo),
                      utilidad2: calcularUtilidadPorcentaje(formEditar.precio2, formEditar.costo),
                      utilidad3: calcularUtilidadPorcentaje(formEditar.precio3, formEditar.costo),
                      utilidad4: calcularUtilidadPorcentaje(formEditar.precio4, formEditar.costo),
                      stock_min: formEditar.stock_min,
                      cantidad_existencia: nuevaCantidad,
                    };


                    const response = await fetch(`${apiUrl}/producto/productos/${productoEditar?.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify(body),
                    });

                    if (!response.ok) {
                      const err = await response.json();
                      console.error('Error del servidor:', err);
                      toast.error('Error al guardar los cambios');
                      return;
                    }

                    if (hayCambioCantidad) {
                      const logBody = {
                        id_producto: productoEditar?.id,
                        comentario: comentarioTrim,
                        tipo_esa: (forzarAjuste ? 'AJUSTE' : modoInventario.toUpperCase()),
                        cantidad: cantidadMovimiento,
                        cantidad_antigua: formEditar.cantidad_existencia,
                        fecha: new Date().toISOString(),
                        id_user: userIdSession,
                        costo: formEditar.costo,
                        sucursalId: sucursalIdSession,
                      };

                      await fetch(`${apiUrl}/inventario-esa`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(logBody),
                      });
                    }
                    setModalAbierto(false);
                    await cargarProductos(); // <-- fuerza recarga inmediata del grid
                    toast.success('Producto actualizado');
                    setTerminoBusqueda('');
                  } catch (error) {
                    console.error('Error al actualizar producto:', error);
                  }
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}