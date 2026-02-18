'use client';

import { useState, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export interface ProductoExcel {
  nombreProducto: string;
  codigoProducto: string;
  codigoBarras: string;
  inventario: number | undefined;
  inventarioMinimo: number | undefined;
  costo: number | undefined;
  precioPublico: number | undefined;
  precioConDescuento: number | undefined;
  precioSemiMayoreo: number | undefined;
  precioMayoreo: number | undefined;
  claveUnidadSat: string;
  codigoSat: string;
  departamento: string;
  marca: string;
  modelo: string;
  iva: number | undefined;
}

export const COLUMNAS_EXCEL = [
  'Nombre del producto',
  'Código del producto',
  'Código de barras',
  'Inventario',
  'Inventario minimo',
  'Costo',
  'Precio al publico',
  'Precio con descuento',
  'Precio al semi mayoreo',
  'Precio al mayoreo',
  'Clave unidad SAT',
  'Codigo SAT',
  'Departamento',
  'Marca',
  'Modelo',
  'Iva',
] as const;

export const COLUMNAS_EXCEL_OBLIGATORIAS = [
  'Código del producto',
  'Nombre del producto',
  'Costo',
  'Inventario',
  'Precio al publico',
  'Precio con descuento',
  'Precio al semi mayoreo',
  'Precio al mayoreo',
] as const;

const limpiarNumeroExcel = (valor: unknown): number | undefined => {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : undefined;
  }

  if (typeof valor === 'string') {
    const trimmed = valor.trim();
    if (trimmed === '') {
      return undefined;
    }

    const normalizado = trimmed
      .replace(/[^0-9,.-]/g, '')
      .replace(/,(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    if (normalizado === '' || normalizado === '-' || normalizado === '.') {
      return undefined;
    }
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : undefined;
  }

  return undefined;
};

interface ProductosExcelImportDialogProps {
  onProductsImported: (productos: ProductoExcel[]) => void;
}

export function ProductosExcelImportDialog({
  onProductsImported,
}: ProductosExcelImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const manejarArchivoExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const archivo = input.files?.[0];

    if (!archivo) return;

    setError(null);
    setProcessing(true);

    try {
      const data = await archivo.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const nombreHoja = workbook.SheetNames[0];
      const hoja = workbook.Sheets[nombreHoja];

      if (!hoja) {
        throw new Error('Hoja de Excel no encontrada');
      }

      const filas = XLSX.utils.sheet_to_json<(string | number | null)[]>(hoja, {
        defval: '',
        raw: false,
        header: 1,
        blankrows: false,
      });

      if (!Array.isArray(filas) || filas.length === 0) {
        throw new Error('El archivo no contiene datos.');
      }

      const indiceEncabezados = filas.findIndex((fila) =>
        Array.isArray(fila) &&
        fila.some((celda) =>
          typeof celda === 'string' &&
          COLUMNAS_EXCEL.includes(celda.trim() as (typeof COLUMNAS_EXCEL)[number])
        )
      );

      if (indiceEncabezados === -1) {
        throw new Error('No se encontraron encabezados válidos en el archivo.');
      }

      const encabezados = filas[indiceEncabezados]
        .map((celda) => String(celda ?? '').trim());

      const columnasFaltantes = COLUMNAS_EXCEL.filter(
        (columna) => !encabezados.includes(columna)
      );

      if (columnasFaltantes.length > 0) {
        throw new Error(
          `Faltan columnas requeridas: ${columnasFaltantes.join(', ')}`
        );
      }

      const filasDatos = filas
        .slice(indiceEncabezados + 1)
        .map((fila) => {
          const registro: Record<string, unknown> = {};
          encabezados.forEach((columna, index) => {
            registro[columna] = fila?.[index] ?? '';
          });
          return registro;
        })
        .filter((registro) =>
          Object.values(registro).some(
            (valor) => String(valor ?? '').trim() !== ''
          )
        );

      if (filasDatos.length === 0) {
        throw new Error('El archivo no contiene datos.');
      }

      const productosParseados = filasDatos
        .map((fila) => {
          const nombre = String(fila['Nombre del producto'] ?? '').trim();
          const codigo = String(fila['Código del producto'] ?? '').trim();

          if (!nombre && !codigo) {
            return null;
          }

          return {
            nombreProducto: nombre,
            codigoProducto: codigo,
            codigoBarras: String(fila['Código de barras'] ?? '').trim(),
            inventario: limpiarNumeroExcel(fila['Inventario']),
            inventarioMinimo: limpiarNumeroExcel(fila['Inventario minimo']),
            costo: limpiarNumeroExcel(fila['Costo']),
            precioPublico: limpiarNumeroExcel(fila['Precio al publico']),
            precioConDescuento: limpiarNumeroExcel(
              fila['Precio con descuento']
            ),
            precioSemiMayoreo: limpiarNumeroExcel(
              fila['Precio al semi mayoreo']
            ),
            precioMayoreo: limpiarNumeroExcel(fila['Precio al mayoreo']),
            claveUnidadSat: String(fila['Clave unidad SAT'] ?? '').trim(),
            codigoSat: String(fila['Codigo SAT'] ?? '').trim(),
            departamento: String(fila['Departamento'] ?? '').trim(),
            marca: String(fila['Marca'] ?? '').trim(),
            modelo: String(fila['Modelo'] ?? '').trim(),
            iva: limpiarNumeroExcel(fila['Iva']),
          } satisfies ProductoExcel;
        })
        .filter((producto): producto is ProductoExcel => producto !== null);

      if (productosParseados.length === 0) {
        throw new Error('No se encontraron productos válidos en el archivo.');
      }

      onProductsImported(productosParseados);
      toast.success('Productos cargados temporalmente desde Excel');
      setOpen(false);
    } catch (error) {
      console.error('Error al procesar el archivo de Excel:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo procesar el archivo de Excel.'
      );
    } finally {
      setProcessing(false);
      setInputKey((prev) => prev + 1);
      input.value = '';
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" /> Importar productos desde Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar productos desde Excel</DialogTitle>
          <DialogDescription>
            Selecciona un archivo con las columnas requeridas para cargar los
            productos. 
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            key={inputKey}
            type="file"
            accept=".xlsx,.xls"
            onChange={manejarArchivoExcel}
            disabled={processing}
          />
          {processing && (
            <p className="text-sm text-muted-foreground">Procesando archivo...</p>
          )}
          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}
          <p className="text-xs font-semibold text-amber-600">
            NOTA: al reiniciar la pagina se perderán los datos guardados.
          </p>
          <p className="text-xs text-muted-foreground">
            Columnas esperadas: {COLUMNAS_EXCEL.join(', ')}.
          </p>
          <p className="text-xs text-muted-foreground">
            Columnas Obligatorias: {COLUMNAS_EXCEL_OBLIGATORIAS.join(', ')}.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
