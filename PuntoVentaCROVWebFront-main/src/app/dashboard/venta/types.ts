export interface Producto {
  id: number;
  codigo: string;
  cod_barras: string;
  nombre: string;
  costo: number;
  precio1: number;
  precio2: number;
  precio3: number;
  precio4: number;
  cantidad_existencia: number;
  servicio?: number;
  activo?: number;
  tipo_medicamento?: string | null;
}

export interface ProductoTransferEvent {
  producto?: Producto;
  cantidad?: number;
  timestamp?: number;
  productoId?: number;
  codigo?: string | null;
  codBarras?: string | null;
  sucursalId?: number | null;
}