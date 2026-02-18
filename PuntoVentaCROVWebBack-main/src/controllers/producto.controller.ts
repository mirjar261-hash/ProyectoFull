import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const TIPO_MEDICAMENTO_PERMITIDOS = ['ANTIBIOTICO', 'CONTROLADO'] as const;

type TipoMedicamento = (typeof TIPO_MEDICAMENTO_PERMITIDOS)[number];

type SanitizadoTipoMedicamento =
  | { value: TipoMedicamento | null }
  | { value: undefined }
  | { error: string };

const sanitizeTipoMedicamento = (valor: unknown): SanitizadoTipoMedicamento => {
  if (valor === undefined) {
    return { value: undefined };
  }

  if (valor === null) {
    return { value: null };
  }

  if (typeof valor === 'string') {
    const normalizado = valor.trim();

    if (normalizado === '') {
      return { value: null };
    }

    const mayusculas = normalizado.toUpperCase();

    if (TIPO_MEDICAMENTO_PERMITIDOS.includes(mayusculas as TipoMedicamento)) {
      return { value: mayusculas as TipoMedicamento };
    }
  }

  return {
    error: "tipo_medicamento debe ser 'ANTIBIOTICO' o 'CONTROLADO'",
  };
};

/* ---------------------------
   Helpers
--------------------------- */
function normalizarImagenEntrada(img?: any): string | undefined {
  if (!img) return undefined;

  // Si ya viene como data URL válida
  if (typeof img === 'string' && img.startsWith('data:image')) {
    // Guardamos solo la parte base64 para ahorrar espacio (opcional)
    const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
    return base64Data;
  }

  // Si viene como string base64 pelón (sin "data:")
  if (typeof img === 'string') {
    // heurística: si parece base64, la guardamos tal cual
    return img;
  }

  // Si viene como Buffer
  if (Buffer.isBuffer(img)) {
    return img.toString('base64');
  }

  return undefined;
}

function convertirImagenSalida(producto: any) {
  if (!producto) return producto;

  const img = producto.imagen;
  if (!img) return producto;

  // Puede venir como Buffer, base64 pelón o data url
  if (Buffer.isBuffer(img)) {
    producto.imagen = `data:image/png;base64,${img.toString('base64')}`;
  } else if (typeof img === 'string') {
    if (img.startsWith('data:image')) {
      // ya es data url
      producto.imagen = img;
    } else {
      // asumimos string base64 pelón
      producto.imagen = `data:image/png;base64,${img}`;
    }
  }

  return producto;
}

function toNull(v: any) {
  return v === '' || v === undefined ? null : v;
}

async function validarCatalogosOpcionales(data: any) {

  data.clave_unidad_medida = toNull(data.clave_unidad_medida);
  data.clave_prodserv = toNull(data.clave_prodserv);

  if (data.clave_unidad_medida) {
    const u = await prisma.catClaveUnidad.findUnique({
      where: { clave: data.clave_unidad_medida },
      select: { id: true },
    });
    if (!u) {
      throw { status: 400, mensaje: 'clave_unidad_medida no existe en CatClaveUnidad.clave' };
    }
  }

  if (data.clave_prodserv) {
    const ps = await prisma.catClaveProdServ.findUnique({
      where: { clave: data.clave_prodserv },
      select: { id: true },
    });
    if (!ps) {
      throw { status: 400, mensaje: 'clave_prodserv no existe en CatClaveProdServ.clave' };
    }
  }

  if (typeof data.unidad_medida === 'string' && data.unidad_medida.trim() === '') {
    data.unidad_medida = null;
  }
}


/* ---------------------------
   Obtener listados
--------------------------- */
export const obtenerProductos = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const activo = req.query.activo ? Number(req.query.activo) : undefined;

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const productos = await prisma.producto.findMany({
    where: {
      sucursalId,
      ...(typeof activo === 'number' ? { activo } : {}),
    },
    include: {
      clase: true,
      marca: true,
      modelo: true,
      unidad: { select: { clave: true, nombre: true } },        // CatClaveUnidad
      prodServ: { select: { clave: true, descripcion: true } },  // CatClaveProdServ
    },
  });

  const productosSerializados = productos.map((p) =>
    convertirImagenSalida({
      ...p,
      id: p.id.toString(),
    })
  );

  res.json(productosSerializados);
};

/* ---------------------------
   Obtener por ID
--------------------------- */
export const obtenerProductoPorId = async (req: Request, res: Response) => {
  const { id } = req.params;

  const producto = await prisma.producto.findUnique({
    where: { id: BigInt(id) },
    include: {
      clase: true,
      marca: true,
      modelo: true,
      unidad: { select: { clave: true, nombre: true } },
      prodServ: { select: { clave: true, descripcion: true } },
    },
  });

  if (!producto) {
    res.status(404).json({ mensaje: 'Producto no encontrado' });
    return;
  }

  const productoSerializado = {
    ...producto,
    id: producto.id.toString(),
  };

  res.json(convertirImagenSalida(productoSerializado));
};

/* ---------------------------
   Obtener por código de barras
--------------------------- */
export const obtenerProductoPorCodigoBarras = async (req: Request, res: Response) => {
  const { codigo } = req.params;
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ mensaje: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  try {
    const producto = await prisma.producto.findFirst({
      where: {
        cod_barras: codigo,
        activo: 1,
        sucursalId,
      },
      include: {
        unidad: { select: { clave: true, nombre: true } },
        prodServ: { select: { clave: true, descripcion: true } },
      },
    });

    if (!producto) {
      res.status(404).json({ mensaje: 'Producto no encontrado' });
      return;
    }

    const productoSerializado = {
      ...producto,
      id: producto.id.toString(),
    };

    res.json(convertirImagenSalida(productoSerializado));
  } catch (error) {
    console.error('Error al buscar producto:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};


/* ---------------------------
   Crear
--------------------------- */
export const crearProducto = async (req: Request, res: Response) => {
  const data: any = req.body ?? {};

  if (!data.sucursalId || !Number.isFinite(Number(data.sucursalId))) {
    res.status(400).json({ mensaje: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const sucursal = await prisma.sucursal.findUnique({
    where: { id: Number(data.sucursalId) },
    select: { id: true },
  });
  if (!sucursal) {
    res.status(400).json({ mensaje: 'La sucursal indicada no existe' });
    return;
  }

  // Normalizar imagen de entrada (se almacena como base64 sin prefijo)
  const img = normalizarImagenEntrada(data.imagen);
  if (img) data.imagen = img; else delete data.imagen;
  if (typeof data.activo === 'undefined') {
    data.activo = 1; // activo por defecto
  }
  try {
    // Validaciones de unicidad (dentro de sucursal) cuando vienen presentes
    if (Object.prototype.hasOwnProperty.call(data, 'tipo_medicamento')) {
      const tipoMedicamentoSanitizado = sanitizeTipoMedicamento(data.tipo_medicamento);

      if ('error' in tipoMedicamentoSanitizado) {
        res.status(400).json({ mensaje: tipoMedicamentoSanitizado.error });
        return;
      }

      if (tipoMedicamentoSanitizado.value === undefined) {
        delete data.tipo_medicamento;
      } else {
        data.tipo_medicamento = tipoMedicamentoSanitizado.value;
      }
    }

    if (data.codigo && data.sucursalId) {
      const codigoExistente = await prisma.producto.findFirst({
        where: {
          codigo: data.codigo,
          sucursalId: Number(data.sucursalId),
          activo: 1,
        },
      });
      if (codigoExistente) {
        res.status(400).json({ mensaje: 'Ya existe un producto activo con ese código' });
        return;
      }
    }

    if (data.cod_barras && data.sucursalId) {
      const codBarrasExistente = await prisma.producto.findFirst({
        where: {
          cod_barras: data.cod_barras,
          sucursalId: Number(data.sucursalId),
          activo: 1,
        },
      });
      if (codBarrasExistente) {
        res.status(400).json({ mensaje: 'Ya existe un producto activo con ese código de barras' });
        return;
      }
    }

    // Validar catálogos si vienen (no obligatorios)
    await validarCatalogosOpcionales(data);

    const producto = await prisma.producto.create({ data });
    const productoSerializado = {
      ...producto,
      id: producto.id.toString(),
    };

    res.json(convertirImagenSalida(productoSerializado));
  } catch (error: any) {
    if (error?.status) {
      res.status(error.status).json({ mensaje: error.mensaje });
      return;
    }
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear', error });
  }
};

/* ---------------------------
   Actualizar
--------------------------- */
export const actualizarProducto = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data: any = req.body ?? {};

  if (!data.sucursalId || !Number.isFinite(Number(data.sucursalId))) {
    res.status(400).json({ mensaje: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const sucursal = await prisma.sucursal.findUnique({
    where: { id: Number(data.sucursalId) },
    select: { id: true },
  });
  if (!sucursal) {
    res.status(400).json({ mensaje: 'La sucursal indicada no existe' });
    return;
  }


  // Normalizar imagen si se envía
  if (typeof data.imagen !== 'undefined') {
    const img = normalizarImagenEntrada(data.imagen);
    if (img) data.imagen = img;
    else delete data.imagen; // si vino vacío, lo omitimos (no borramos)
  }

  try {
    if (Object.prototype.hasOwnProperty.call(data, 'tipo_medicamento')) {
      const tipoMedicamentoSanitizado = sanitizeTipoMedicamento(data.tipo_medicamento);

      if ('error' in tipoMedicamentoSanitizado) {
        res.status(400).json({ mensaje: tipoMedicamentoSanitizado.error });
        return;
      }

      if (tipoMedicamentoSanitizado.value === undefined) {
        delete data.tipo_medicamento;
      } else {
        data.tipo_medicamento = tipoMedicamentoSanitizado.value;
      }
    }

    // Validar catálogos si vienen
    await validarCatalogosOpcionales(data);

    const producto = await prisma.producto.update({
      where: { id: BigInt(id) },
      data,
      include: {
        unidad: { select: { clave: true, nombre: true } },
        prodServ: { select: { clave: true, descripcion: true } },
      },
    });

    const productoSerializado = {
      ...producto,
      id: producto.id.toString(),
    };
    res.json(convertirImagenSalida(productoSerializado));
  } catch (error: any) {
    if (error?.status) {
      res.status(error.status).json({ mensaje: error.mensaje });
      return;
    }
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar', error });
  }
};

/* ---------------------------
   Eliminar (lógico)
--------------------------- */
export const eliminarProducto = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.producto.update({
      where: { id: BigInt(id) },
      data: { activo: 0 },
    });
    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar', error });
  }
};

/* ---------------------------
   Paginación + Filtros
--------------------------- */export const obtenerProductosPaginacion = async (req: Request, res: Response) => {
  const { pagina = 1, limite = 50, sucursalId, termino = '', departamentoId } = req.query;

  const page = Number(pagina);
  const limit = Number(limite);
  const offset = (page - 1) * limit;

  if (!sucursalId || isNaN(Number(sucursalId))) {
    res.status(400).json({ mensaje: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const where: any = {
    sucursalId: Number(sucursalId),
    activo: 1,
  };

  if (departamentoId && departamentoId.toString().trim() !== '') {
    const deptoId = Number(departamentoId);
    if (!isNaN(deptoId)) where.idclase = deptoId;
  }

  if (termino && termino.toString().trim() !== '') {
    const t = termino.toString();
    where.OR = [
      { nombre: { contains: t } },
      { codigo: { contains: t } },
      { cod_barras: { contains: t } },
      { prodServ: { is: { descripcion: { contains: t } } } },
      { unidad: { is: { nombre: { contains: t } } } },
    ];
  }


  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { nombre: 'desc' },
      select: {
        id: true,
        codigo: true,
        cod_barras: true,
        nombre: true,
        costo: true,
        servicio: true,
        precio1: true,
        precio2: true,
        precio3: true,
        precio4: true,
        stock_min: true,
        cantidad_existencia: true,
        tipo_medicamento: true,
        unidad_medida: true,
        clave_prodserv: true,
        clase: { select: { nombre: true } },
        insumo: true,
        unidad: { select: { clave: true, nombre: true } },
        prodServ: { select: { clave: true, descripcion: true } },
      },
    }),
    prisma.producto.count({ where }),
  ]);

  const productosNormalizados = productos.map((p) => ({
    ...p,
    id: p.id.toString(),
    costo: Number(p.costo),
    precio1: Number(p.precio1),
    precio2: Number(p.precio2),
    precio3: Number(p.precio3),
    precio4: Number(p.precio4),
    insumo: typeof p.insumo === 'number' ? Number(p.insumo) : p.insumo,
  }));

  res.json({
    productos: productosNormalizados,
    total,
    pagina: page,
    limite: limit,
    totalPaginas: Math.ceil(total / limit),
  });
};
