import { Request, Response } from 'express';
import {

  S3Client,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import prisma from '../utils/prisma';


const s3 = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});


const s3Client = new S3Client({ region: process.env.AWS_REGION });

const BUCKET = process.env.AWS_S3_BUCKET as string;
const BUCKET2 = process.env.AWS_S3_BUCKET2 as string;
const AWS_REGION = process.env.AWS_REGION as string;
const MAX_SIZE = 10_000_000; // 10 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg', 'application/pdf', 'application/csd', 'application/cer', 'application/key', 'application/octet-stream', 'application/x-x509-ca-cert', 'application/pkix-cert'];
const POST_EXPIRES_SECONDS = Number(process.env.S3_POST_EXPIRES ?? 600); // 10 min

const sanitizeName = (name: string) => name.replace(/[^\w.\-]+/g, '_');

const normalizeForComparison = (value?: string | number | null) => {
  if (value === undefined || value === null) {
    return '';
  }
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const distributorDocumentKey = (value?: string | number | null) =>
  normalizeForComparison(value).replace(/[^a-z0-9]+/g, '');

type DistributorDocumentField =
  | 'ineDocumento'
  | 'constanciaFiscalDocumento'
  | 'comprobanteDomicilioDocumento';

type DistributorDocumentDescriptor = {
  folder: string;
  type: 'INE' | 'CONSTANCIA_FISCAL' | 'COMPROBANTE_DOMICILIO';
  label: string;
  field: DistributorDocumentField;
};

type DistributorDocumentInfo = {
  folder: string;
  descriptor: DistributorDocumentDescriptor | null;
};

const DISTRIBUTOR_DOCUMENT_DEFINITIONS: Record<string, DistributorDocumentDescriptor> = {
  ine: { folder: 'ine', type: 'INE', label: 'INE', field: 'ineDocumento' },
  inefrente: { folder: 'ine', type: 'INE', label: 'INE', field: 'ineDocumento' },
  inereverso: { folder: 'ine', type: 'INE', label: 'INE', field: 'ineDocumento' },
  constanciafiscal: {
    folder: 'constancia-situacion-fiscal',
    type: 'CONSTANCIA_FISCAL',
    label: 'Constancia de situación fiscal',
    field: 'constanciaFiscalDocumento',
  },
  constanciasituacionfiscal: {
    folder: 'constancia-situacion-fiscal',
    type: 'CONSTANCIA_FISCAL',
    label: 'Constancia de situación fiscal',
    field: 'constanciaFiscalDocumento',
  },
  constanciadesituacionfiscal: {
    folder: 'constancia-situacion-fiscal',
    type: 'CONSTANCIA_FISCAL',
    label: 'Constancia de situación fiscal',
    field: 'constanciaFiscalDocumento',
  },
  comprobantedomicilio: {
    folder: 'comprobante-domicilio',
    type: 'COMPROBANTE_DOMICILIO',
    label: 'Comprobante de domicilio',
    field: 'comprobanteDomicilioDocumento',
  },
  comprobantededomicilio: {
    folder: 'comprobante-domicilio',
    type: 'COMPROBANTE_DOMICILIO',
    label: 'Comprobante de domicilio',
    field: 'comprobanteDomicilioDocumento',
  },
};

const DISTRIBUTOR_DEFAULT_FOLDER = 'otros';

const extractDistributorFolderFromKey = (key?: string | null) => {
  if (!key) return null;
  const match = key.match(/^distribuidores\/\d+\/([^/]+)\//);
  return match ? match[1] : null;
};

const resolveDistributorDocumentInfo = (
  documentType?: string | number | null,
  key?: string | null,
) : DistributorDocumentInfo => {
  const docKey = distributorDocumentKey(documentType);
  if (docKey) {
    const descriptor = DISTRIBUTOR_DOCUMENT_DEFINITIONS[docKey];
    if (descriptor) {
      return { folder: descriptor.folder, descriptor };
    }
  }

  const folderFromKey = extractDistributorFolderFromKey(key);
  if (folderFromKey) {
    const folderKey = distributorDocumentKey(folderFromKey);
    if (folderKey) {
      const descriptor = DISTRIBUTOR_DOCUMENT_DEFINITIONS[folderKey];
      if (descriptor) {
        return { folder: descriptor.folder, descriptor };
      }
    }

    if (folderFromKey === 'uploads') {
      return { folder: DISTRIBUTOR_DEFAULT_FOLDER, descriptor: null };
    }

    return { folder: sanitizeName(folderFromKey), descriptor: null };
  }

  return { folder: DISTRIBUTOR_DEFAULT_FOLDER, descriptor: null };
};

// Helper: determina a qué campo de Sucursal asignar según la extensión
const fieldForSucursalByExt = (key: string): 'csd' | 'key' | 'cer' | null => {
  const name = key.split('/').pop() ?? '';
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'key') return 'key';
  if (ext === 'cer') return 'cer';
  if (ext === 'csd') return 'csd';
  return null;
};

export async function downloadFromS3(bucket: string, key: string): Promise<string> {
  // descarga el objeto y guarda en archivo temporal
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const res = await s3Client.send(cmd);
  const body = res.Body;
  if (!body) throw new Error('S3 object body empty');

  // read stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as any) chunks.push(chunk);
  const buf = Buffer.concat(chunks);

  // Generar ruta temporal con nombre original
  const filename = path.basename(key);
  const tmpPath = path.join(os.tmpdir(), `${Date.now()}-${filename}`);
  await fs.writeFile(tmpPath, buf);
  return tmpPath;
}

// 1.bis) Presigned POST para par CSD (.cer y .key) de una sucursal
//      - Recibe: sucursalId, cerFileName, cerContentType, cerFileSize, keyFileName, keyContentType, keyFileSize
//      - Devuelve dos presigned posts independientes (uno por archivo), ya apuntando a la carpeta de la sucursal.
export const getPresignedPostForSucursalCSDPair = async (req: Request, res: Response) => {
  try {
    const {
      sucursalId,
      cerFileName,
      cerContentType,
      cerFileSize,
      keyFileName,
      keyContentType,
      keyFileSize,
    } = req.body as {
      sucursalId?: string | number;
      cerFileName?: string;
      cerContentType?: string;
      cerFileSize?: number;
      keyFileName?: string;
      keyContentType?: string;
      keyFileSize?: number;
    };

    // Validaciones mínimas
    const sidNum = Number(sucursalId);
    if (!Number.isInteger(sidNum) || sidNum <= 0) {
      return res.status(400).json({ mensaje: 'sucursalId inválido' });
    }

    if (!cerFileName || !cerContentType || !cerFileSize) {
      return res.status(400).json({ mensaje: 'Datos de archivo .cer incompletos' });
    }
    if (!keyFileName || !keyContentType || !keyFileSize) {
      return res.status(400).json({ mensaje: 'Datos de archivo .key incompletos' });
    }

    if (!ALLOWED_TYPES.includes(cerContentType) || cerFileSize > MAX_SIZE) {
      return res.status(400).json({ mensaje: 'Tipo o tamaño inválido para .cer' });
    }
    if (!ALLOWED_TYPES.includes(keyContentType) || keyFileSize > MAX_SIZE) {
      return res.status(400).json({ mensaje: 'Tipo o tamaño inválido para .key' });
    }

    const safeCer = sanitizeName(cerFileName);
    const safeKey = sanitizeName(keyFileName);

    // Prefijo definitivo de la sucursal
    const prefix = `sucursales/${sidNum}/uploads/`;
    const bucket = BUCKET;

    // Forzar extensiones esperadas en el nombre (por si vienen sin extensión)
    const ensureExt = (name: string, ext: 'cer' | 'key') => {
      const lower = name.toLowerCase();
      if (lower.endsWith(`.${ext}`)) return name;
      return `${name}.${ext}`;
    };

    const cerKey = `${prefix}${uuidv4()}-${ensureExt(safeCer, 'cer')}`;
    const keyKey = `${prefix}${uuidv4()}-${ensureExt(safeKey, 'key')}`;

    // Crear presigned POST para .cer
    const cerPost = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: cerKey,
      Conditions: [
        ['content-length-range', 0, MAX_SIZE],
        ['starts-with', '$Content-Type', cerContentType],
        ['starts-with', '$key', prefix],
      ],
      Fields: { 'Content-Type': cerContentType },
      Expires: POST_EXPIRES_SECONDS,
    });

    // Crear presigned POST para .key
    const keyPost = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: keyKey,
      Conditions: [
        ['content-length-range', 0, MAX_SIZE],
        ['starts-with', '$Content-Type', keyContentType],
        ['starts-with', '$key', prefix],
      ],
      Fields: { 'Content-Type': keyContentType },
      Expires: POST_EXPIRES_SECONDS,
    });

    // Opcional: verificar que exista la sucursal antes (no obligatorio para subir)
    // const sucursalExiste = await prisma.sucursal.findUnique({ where: { id: sidNum }, select: { id: true } });

    return res.json({
      sucursalId: sidNum,
      bucket,
      prefix,
      expiresIn: POST_EXPIRES_SECONDS,
      cer: {
        url: cerPost.url,
        fields: cerPost.fields,
        key: cerKey,
        contentType: cerContentType,
        fileName: safeCer,
      },
      key: {
        url: keyPost.url,
        fields: keyPost.fields,
        key: keyKey,
        contentType: keyContentType,
        fileName: safeKey,
      },
      // Nota: luego llama a confirmUpload dos veces (una por cada key) para asociarlos en la sucursal.
    });
  } catch (error) {
    console.error('Error generando presigned POST par CSD', error);
    return res.status(500).json({ mensaje: 'No se pudo generar URLs para .cer y .key' });
  }
};


// 1) Presigned POST: productId es OPCIONAL.
//    - Si viene productId válido => sube bajo products/{id}/uploads/
//    - Si NO viene => sube a staging/uploads/
export const getPresignedPost = async (req: Request, res: Response) => {
  try {
    const {
      productId,
      userId,
      contentType,
      fileName,
      fileSize,
      sucursalId,
      distribuidorId,
      documentType,
      clienteCrovId,
    } = req.body as {
      productId?: string | number;
      userId?: string | number;
      contentType?: string;
      fileName?: string;
      fileSize?: number;
      sucursalId?: string | number;
      distribuidorId?: string | number;
      documentType?: string;
      clienteCrovId?: string | number;
    };

    if (!contentType || !fileName || !fileSize) {
      return res.status(400).json({ mensaje: 'Datos incompletos' });
    }
    if (!ALLOWED_TYPES.includes(contentType) || fileSize > MAX_SIZE) {
      return res.status(400).json({ mensaje: 'Tipo o tamaño de archivo inválido' });
    }

    const safeName = sanitizeName(fileName);

    let prefix: string;
    let bucket: string = BUCKET;
    let pidNum: number | null = null;
    let uidNum: number | null = null;
    let sidNum: number | null = null; //Sucursal
    let didNum: number | null = null; //Distribuidor
    let clienteCrovNum: number | null = null; // Cliente CROV
    let distributorDocumentType: string | null = null;
    let distributorFolder: string | null = null;

    if (userId !== undefined && userId !== null && userId !== '') {
      const n = Number(userId);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({ mensaje: 'userId inválido' });
      }
      uidNum = n;
      bucket = BUCKET2;
      prefix = `users/${n}/uploads/`;
    } else if (productId !== undefined && productId !== null && productId !== '') {
      const n = Number(productId);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({ mensaje: 'productId inválido' });
      }
      pidNum = n;
      prefix = `products/${n}/uploads/`;

    } else if (sucursalId !== undefined && sucursalId !== null && sucursalId !== '') {
      const n = Number(sucursalId);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({ mensaje: 'sucursalId inválido' });
      }
      sidNum = n;
      bucket = BUCKET;
      prefix = `sucursales/${n}/uploads/`;
    } else if (clienteCrovId !== undefined && clienteCrovId !== null && clienteCrovId !== '') {
      const n = Number(clienteCrovId);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({ mensaje: 'clienteCrovId inválido' });
      }
      clienteCrovNum = n;
      bucket = BUCKET;
      prefix = `clientes-crov/${n}/logo/`;
    } else if (distribuidorId !== undefined && distribuidorId !== null && distribuidorId !== '') {
      const n = Number(distribuidorId);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({ mensaje: 'distribuidorId inválido' });
      }
      didNum = n;
      bucket = BUCKET;
      const { folder, descriptor } = resolveDistributorDocumentInfo(documentType);
      const folderWithSlash = folder ? `${folder}/` : '';
      prefix = `distribuidores/${n}/${folderWithSlash}`;
      distributorDocumentType = descriptor?.type ?? null;
      distributorFolder = folder;
    } else {
      // Modo staging cuando aún no hay producto ni usuario
      prefix = `staging/uploads/`;
    }

    const key = `${prefix}${uuidv4()}-${safeName}`;
    const key2 = `${prefix}${safeName}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 0, MAX_SIZE],
        ['starts-with', '$Content-Type', contentType],
        ['starts-with', '$key', prefix],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: POST_EXPIRES_SECONDS,
    });

    return res.json({
      url,
      fields,
      key,
      prefix,
      bucket,
      productId: pidNum ?? null,
      userId: uidNum ?? null,
      sucursalId: sidNum ?? null,
      distribuidorId: didNum ?? null,
      clienteCrovId: clienteCrovNum ?? null,
      documentType: distributorDocumentType ?? (documentType ?? null),
      folder: distributorFolder,
      expiresIn: POST_EXPIRES_SECONDS,
    });
  } catch (error) {
    console.error('Error generando presigned POST', error);
    return res.status(500).json({ mensaje: 'No se pudo generar URL' });
  }
};

// 2) Confirmar subida:
//    - Valida que el objeto exista y sea imagen válida.
//    - Si hay productId => guarda en el producto.
//    - Si NO hay productId => solo confirma y devuelve el key.
export const confirmUpload = async (req: Request, res: Response) => {
  try {
    const { productId, userId, key, sucursalId, distribuidorId, documentType, clienteCrovId } = req.body as {
      productId?: string | number;
      userId?: string | number;
      key?: string;
      key2?: string;
      sucursalId?: string | number;
      distribuidorId?: string | number;
      documentType?: string;
      clienteCrovId?: string | number;
    };
    if (!key) {
      return res.status(400).json({ mensaje: 'Datos incompletos' });
    }


    // Permitir staging o products
    const allowedPrefixes = ['staging/uploads/', 'products/', 'users/', 'sucursales/', 'distribuidores/', 'clientes-crov/'];
    if (!allowedPrefixes.some((p) => key.startsWith(p))) {
      return res.status(400).json({ mensaje: 'Key con prefijo no permitido' });
    }
    // Determinar bucket según prefijo
    const bucket = key.startsWith('users/') ? BUCKET2 : BUCKET;
    // HEAD para validar existencia, tipo y tamaño
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const contentType = head.ContentType ?? '';
    const size = Number(head.ContentLength ?? 0);
    if (!ALLOWED_TYPES.includes(contentType) || size > MAX_SIZE) {
      return res.status(400).json({ mensaje: 'Archivo inválido' });
    }

    // Si NO hay productId ni userId => confirmamos y devolvemos key para asociar después
    if (
      (productId === undefined || productId === null || String(productId) === '') &&
      (userId === undefined || userId === null || String(userId) === '') &&
       (sucursalId === undefined || sucursalId === null || String(sucursalId) === '') &&
      (distribuidorId === undefined || distribuidorId === null || String(distribuidorId) === '') &&
      (clienteCrovId === undefined || clienteCrovId === null || String(clienteCrovId) === '')
    ) {
      return res.json({
        mensaje: 'Subida confirmada (pendiente de asociar)',
        key,
        contentType,
        size,
      });
    }

    // --- Caso Cliente CROV ---
    if (
      key.startsWith('clientes-crov/') ||
      (clienteCrovId !== undefined && clienteCrovId !== null && String(clienteCrovId) !== '')
    ) {
      let cidNum: number | null = null;

      if (clienteCrovId !== undefined && clienteCrovId !== null && String(clienteCrovId) !== '') {
        const parsed = Number(clienteCrovId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return res.status(400).json({ mensaje: 'clienteCrovId inválido' });
        }
        cidNum = parsed;
      }

      if (!cidNum) {
        const match = key.match(/^clientes-crov\/(\d+)\//);
        if (match) {
          cidNum = Number(match[1]);
        }
      }

      if (!cidNum) {
        return res.status(400).json({ mensaje: 'No se pudo determinar clienteCrovId' });
      }

      const expectedPrefix = `clientes-crov/${cidNum}/logo/`;
      let finalKey = key;

      if (!key.startsWith(expectedPrefix)) {
        const nombre = key.split('/').pop() ?? `logo`;
        const nombreSeguro = sanitizeName(nombre);
        finalKey = `${expectedPrefix}${uuidv4()}-${nombreSeguro}`;

        await s3.send(
          new CopyObjectCommand({
            Bucket: BUCKET,
            CopySource: `/${BUCKET}/${key}`,
            Key: finalKey,
            ContentType: contentType,
            MetadataDirective: 'REPLACE',
          }),
        );
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      }

      const clienteExiste = await prisma.clientes_CROV.findUnique({
        where: { id: cidNum },
        select: { id: true },
      });

      if (!clienteExiste) {
        return res.status(202).json({
          mensaje:
            'Cliente CROV no existe aún; logo preparado. Asocia esta key cuando registres el cliente.',
          key: finalKey,
          contentType,
          size,
          clienteCrovId: cidNum,
        });
      }

      const cliente = await prisma.clientes_CROV.update({
        where: { id: cidNum },
        data: { logo: finalKey },
        include: { giroComercial: true },
      });

      return res.json({
        mensaje: 'Logo de cliente CROV confirmado',
        key: finalKey,
        contentType,
        size,
        cliente,
      });
    }
    // Manejo para imágenes de usuario
    if (key.startsWith('users/') || (userId !== undefined && userId !== null && String(userId) !== '')) {
      const uidNum = Number(userId);
      if (!Number.isInteger(uidNum) || uidNum <= 0) {
        return res.status(400).json({ mensaje: 'userId inválido' });
      }

      let finalKey = key;
      const expectedPrefix = `users/${uidNum}/uploads/`;

      if (!key.startsWith(expectedPrefix)) {
        const nombre = key.split('/').pop() ?? `${uuidv4()}.img`;
        finalKey = `${expectedPrefix}${uuidv4()}-${nombre}`;

        await s3.send(
          new CopyObjectCommand({
            Bucket: BUCKET2,
            CopySource: `/${BUCKET2}/${key}`,
            Key: finalKey,
            ContentType: contentType,
            MetadataDirective: 'REPLACE',
          }),
        );
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET2, Key: key }));
      }

      return res.json({
        mensaje: 'Imagen de usuario confirmada',
        key: finalKey,
        contentType,
        size,
      });
    }

    // --- Caso Sucursal ---
    if (key.startsWith('sucursales/') || (sucursalId !== undefined && sucursalId !== null && String(sucursalId) !== '')) {
      const sidNum = Number(sucursalId);
      if (!Number.isInteger(sidNum) || sidNum <= 0) {
        return res.status(400).json({ mensaje: 'sucursalId inválido' });
      }

      let finalKey = key;
      const expectedPrefix = `sucursales/${sidNum}/uploads/`;

      // Si viene de staging u otra carpeta, mover a la definitiva de la sucursal
      if (!key.startsWith(expectedPrefix)) {
        const nombre = key.split('/').pop() ?? `file`;
        finalKey = `${expectedPrefix}-${nombre}`;

        await s3.send(
          new CopyObjectCommand({
            Bucket: BUCKET,
            CopySource: `/${BUCKET}/${key}`,
            Key: finalKey,
            ContentType: contentType,
            MetadataDirective: 'REPLACE',
          }),
        );
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      }

      // Determinar campo a actualizar según extensión
      const targetField = fieldForSucursalByExt(finalKey);
      if (!targetField) {
        return res.status(400).json({ mensaje: 'Extensión no soportada para Sucursal (usa .cer/.csd/.key)' });
      }

      // Verificar existencia de sucursal
      const sucursalExiste = await prisma.sucursal.findUnique({
        where: { id: sidNum },
        select: { id: true },
      });

      if (!sucursalExiste) {
        // No falles: deja el archivo listo para asociar luego
        return res.status(202).json({
          mensaje: 'Sucursal no existe aún; archivo preparado. Asocia esta key cuando registres la sucursal.',
          key: finalKey,
        });
      }

      // Construir update dinámico
      const dataUpdate: Record<'csd' | 'key' | 'cer', string | undefined> = { csd: undefined, key: undefined, cer: undefined };
      dataUpdate[targetField] = finalKey;

      const sucursal = await prisma.sucursal.update({
        where: { id: sidNum },
        data: dataUpdate,
        // select: { id: true, csd: true, key: true, cer: true },
        select: { id: true, cer: true, key: true }
      });

      return res.json({
        mensaje: `Archivo de sucursal guardado en campo ${targetField}`,
        sucursal,
        key: finalKey,
      });
    }

     // --- Caso Distribuidor ---
    if (
      key.startsWith('distribuidores/') ||
      (distribuidorId !== undefined && distribuidorId !== null && String(distribuidorId) !== '')
    ) {
      let didNum: number | null = null;

      if (distribuidorId !== undefined && distribuidorId !== null && String(distribuidorId) !== '') {
        const parsed = Number(distribuidorId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return res.status(400).json({ mensaje: 'distribuidorId inválido' });
        }
        didNum = parsed;
      }

      if (!didNum) {
        const match = key.match(/^distribuidores\/(\d+)\//);
        if (match) {
          didNum = Number(match[1]);
        }
      }

      if (!didNum) {
        return res.status(400).json({ mensaje: 'No se pudo determinar distribuidorId' });
      }

      const { folder, descriptor } = resolveDistributorDocumentInfo(documentType, key);
      const folderWithSlash = folder ? `${folder}/` : '';
      const expectedPrefix = `distribuidores/${didNum}/${folderWithSlash}`;
      let finalKey = key;

      if (!key.startsWith(expectedPrefix)) {
        const nombre = key.split('/').pop() ?? `file`;
        const nombreSeguro = sanitizeName(nombre);
        finalKey = `${expectedPrefix}${uuidv4()}-${nombreSeguro}`;

        await s3.send(
          new CopyObjectCommand({
            Bucket: BUCKET,
            CopySource: `/${BUCKET}/${key}`,
            Key: finalKey,
            ContentType: contentType,
            MetadataDirective: 'REPLACE',
          }),
        );
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      }

      const mensaje = descriptor
        ? `Documento ${descriptor.label} confirmado`
        : 'Documento de distribuidor confirmado';

      const documentField = descriptor?.field ?? null;

      const distribuidorExiste = await prisma.distribuidor.findUnique({
        where: { id: didNum },
        select: { id: true },
      });

      if (!distribuidorExiste) {
        return res.status(202).json({
          mensaje:
            'Distribuidor no existe aún; documento preparado. Asocia esta key cuando registres el distribuidor.',
          key: finalKey,
          contentType,
          size,
          distribuidorId: didNum,
          documentType: descriptor?.type ?? (documentType ? documentType.toString() : null),
          folder,
          field: documentField,
        });
      }

      if (documentField) {
        await prisma.distribuidor.update({
          where: { id: didNum },
          data: { [documentField]: finalKey },
        });
      }

      return res.json({
        mensaje,
        key: finalKey,
        contentType,
        size,
        distribuidorId: didNum,
        documentType: descriptor?.type ?? (documentType ? documentType.toString() : null),
        folder,
        field: documentField,
      });
    }

    // Si llega aquí, tratamos el caso de producto
    const pidNum = Number(productId);
    if (!Number.isInteger(pidNum) || pidNum <= 0) {
      return res.status(400).json({ mensaje: 'productId inválido' });
    }

    // Recomendado: verificar que key pertenezca al producto si ya está en /products/{id}/...
    // Si el key es staging, igual sirve: puedes guardar tal cual o copiar a la carpeta final
    // Aquí elegimos copiar a la ruta final si viene de staging
    let finalKey = key;
    const expectedPrefix = `products/${pidNum}/uploads/`;

    if (!key.startsWith(expectedPrefix)) {
      // Mover (copy+delete) a products/{id}/uploads/{uuid}-{nombre}
      const nombre = key.split('/').pop() ?? `${uuidv4()}.img`;
      finalKey = `${expectedPrefix}${uuidv4()}-${nombre}`;

      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: `/${BUCKET}/${key}`,
          Key: finalKey,
          ContentType: contentType,
          MetadataDirective: 'REPLACE', // preserva ContentType explícitamente
        }),
      );
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    }

    // Ahora sí, actualiza el producto (aquí SÍ validamos existencia)
    const productoExiste = await prisma.producto.findUnique({
      where: { id: BigInt(pidNum) },
      select: { id: true },
    });
    if (!productoExiste) {
      // Si aún no existe el producto, no falles: devuelve el finalKey para que se asocie al crearlo
      return res.status(202).json({
        mensaje:
          'Producto no existe aún; imagen preparada. Asocia esta key cuando registres el producto.',
        key: finalKey,
      });
    }

    const producto = await prisma.producto.update({
      where: { id: BigInt(pidNum) },
      data: { imagen: finalKey },
    });

    return res.json({
      mensaje: 'Imagen guardada',
      producto: { ...producto, id: producto.id.toString() },
    });
  } catch (error: any) {
    const code = error?.$metadata?.httpStatusCode;
    if (code === 404) {
      return res.status(404).json({ mensaje: 'Objeto no encontrado. Intenta nuevamente.' });
    }
    console.error('Error al confirmar subida', error);
    return res.status(500).json({ mensaje: 'Error al confirmar subida' });
  }
};

// 3) Adjuntar imagen a un producto (cuando ya lo creaste):
//    - Recibe { productId, key } (key puede venir de staging).
//    - Copia a products/{productId}/uploads/... si hace falta y actualiza el producto.
export const attachImageToProduct = async (req: Request, res: Response) => {
  try {
    const { productId, key } = req.body as { productId?: string | number; key?: string };
    if (!productId || !key) {
      return res.status(400).json({ mensaje: 'Datos incompletos' });
    }

    const pidNum = Number(productId);
    if (!Number.isInteger(pidNum) || pidNum <= 0) {
      return res.status(400).json({ mensaje: 'productId inválido' });
    }

    const productoExiste = await prisma.producto.findUnique({
      where: { id: BigInt(pidNum) },
      select: { id: true },
    });
    if (!productoExiste) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    // Validar objeto origen
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    const contentType = head.ContentType ?? '';
    const size = Number(head.ContentLength ?? 0);
    if (!ALLOWED_TYPES.includes(contentType) || size > MAX_SIZE) {
      return res.status(400).json({ mensaje: 'Archivo inválido' });
    }

    const finalPrefix = `products/${pidNum}/uploads/`;
    let finalKey = key;

    if (!key.startsWith(finalPrefix)) {
      const nombre = key.split('/').pop() ?? `${uuidv4()}.img`;
      finalKey = `${finalPrefix}${uuidv4()}-${nombre}`;

      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: `/${BUCKET}/${key}`,
          Key: finalKey,
          ContentType: contentType,
          MetadataDirective: 'REPLACE',
        }),
      );
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    }

    const producto = await prisma.producto.update({
      where: { id: BigInt(pidNum) },
      data: { imagen: finalKey },
    });

    return res.json({
      mensaje: 'Imagen asociada al producto',
      producto: { ...producto, id: producto.id.toString() },
    });
  } catch (error) {
    console.error('Error al adjuntar imagen', error);
    return res.status(500).json({ mensaje: 'Error al adjuntar imagen' });
  }
};
// 4) Obtener imagen de un producto
//    - Devuelve una URL firmada para acceder a la imagen del producto
export const getProductImage = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params as { productId?: string };
    const pidNum = Number(productId);
    if (!Number.isInteger(pidNum) || pidNum <= 0) {
      return res.status(400).json({ mensaje: 'productId inválido' });
    }

    const producto = await prisma.producto.findUnique({
      where: { id: BigInt(pidNum) },
      select: { imagen: true },
    });

    if (!producto || !producto.imagen) {
      return res.status(404).json({ mensaje: 'Imagen no encontrada' });
    }

    const command = new GetObjectCommand({ Bucket: BUCKET, Key: producto.imagen });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return res.json({ url });
  } catch (error) {
    console.error('Error obteniendo imagen', error);
    return res.status(500).json({ mensaje: 'Error al obtener imagen' });
  }
};

// 4.1) Obtener logo de un cliente CROV
export const getClienteCrovLogo = async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.params as { clienteId?: string };
    const cidNum = Number(clienteId);
    if (!Number.isInteger(cidNum) || cidNum <= 0) {
      return res.status(400).json({ mensaje: 'clienteId inválido' });
    }

    const cliente = await prisma.clientes_CROV.findUnique({
      where: { id: cidNum },
      select: { logo: true },
    });

    if (!cliente || !cliente.logo) {
      return res.status(404).json({ mensaje: 'Logo no encontrado' });
    }

    const command = new GetObjectCommand({ Bucket: BUCKET, Key: cliente.logo });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return res.json({ url });
  } catch (error) {
    console.error('Error obteniendo logo de cliente CROV', error);
    return res.status(500).json({ mensaje: 'Error al obtener logo de cliente CROV' });
  }
};

// 5) Obtener archivo de un usuario
//    - Devuelve una URL firmada para acceder a un archivo del usuario
export const getUserFile = async (req: Request, res: Response) => {
  try {
    const { userId, fileKey } = req.params as { userId?: string; fileKey?: string };

    const uidNum = Number(userId);
    if (!Number.isInteger(uidNum) || uidNum <= 0) {
      return res.status(400).json({ mensaje: 'userId inválido' });
    }
    if (!fileKey || fileKey.includes('/') || fileKey.includes('..')) {
      return res.status(400).json({ mensaje: 'fileKey inválido' });
    }

    const key = `users/${uidNum}/uploads/${fileKey}`;
    const command = new GetObjectCommand({ Bucket: BUCKET2, Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return res.json({ url });
  } catch (error) {
    console.error('Error obteniendo archivo de usuario', error);
    return res.status(500).json({ mensaje: 'Error al obtener archivo de usuario' });
  }
};

// 6) Obtener archivo de una sucursal
//     - /sucursales/:sucursalId/file/:fileKey
export const getSucursalFile = async (req: Request, res: Response) => {
  try {
    const { sucursalId, fileKey } = req.params as { sucursalId?: string; fileKey?: string };

    const sidNum = Number(sucursalId);
    if (!Number.isInteger(sidNum) || sidNum <= 0) {
      return res.status(400).json({ mensaje: 'sucursalId inválido' });
    }
    if (!fileKey || fileKey.includes('/') || fileKey.includes('..')) {
      return res.status(400).json({ mensaje: 'fileKey inválido' });
    }

    const key = `sucursales/${sidNum}/uploads/${fileKey}`;
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key }); // usamos el BUCKET
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return res.json({ url });
  } catch (error) {
    console.error('Error obteniendo archivo de sucursal', error);
    return res.status(500).json({ mensaje: 'Error al obtener archivo de sucursal' });
  }
};

export const getPresignedUploadUrlImgForNewJiraTasks = async (req: Request, res: Response) => {
  try {
    const { fileType } = req.body;

    const fileName = `jira/tareas/${uuidv4()}`;
    const bucket = BUCKET;
    const awsRegion = AWS_REGION;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      ContentType: fileType,
      ACL: 'public-read', // Descomenta si el bucket no es público por política y necesitas ACL
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60, // 1 minuto
    });

    const publicUrl = `https://${bucket}.s3.${awsRegion}.amazonaws.com/${fileName}`;

    res.json({
      uploadUrl,
      publicUrl,
    });

  } catch (err) {
    res.status(500).json({ message: "Error generando URL firmada" });
  }
};

export const deleteImageByUrlForJiraTasks = async (imageUrl: string) => {
  
  const bucket = BUCKET;

  const url = new URL(imageUrl);

  const key = url.pathname.substring(1);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
};