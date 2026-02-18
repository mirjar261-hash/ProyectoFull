// controllers/facturacion.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { downloadFromS3 } from './s3.controller';
// import { decryptPasswordGcm, encryptPasswordGcm } from '../utils/crypto-csd';
import fssync from 'fs';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';


// ------------------------
// Helpers
// ------------------------
const parseIntSafe = (v: any, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
};

const parseActivo = (v: any): number | undefined => {
  if (v === undefined) return undefined;
  if (v === '1' || v === 1 || v === true || v === 'true') return 1;
  if (v === '0' || v === 0 || v === false || v === 'false') return 0;
  return undefined;
};

const parseDate = (v: any): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

function getAesKey(): Buffer {
  const seed = (process.env.SECRET_KEY_32B || '').trim();
  // Deriva exactamente 32 bytes con SHA-256 para evitar problemas de longitud
  return crypto.createHash('sha256').update(seed).digest();
}


const buildPagination = (req: Request, defaultPageSize: number) => {
  const page = parseIntSafe(req.query.page, 1);
  const pageSize = parseIntSafe(req.query.pageSize, defaultPageSize);
  const take = Math.min(Math.max(pageSize, 1), 200); // clamp 1..200
  const skip = (page - 1) * take;
  return { page, pageSize: take, skip, take };
};

const meta = (total: number, page: number, pageSize: number) => ({
  total,
  page,
  pageSize,
  totalPages: Math.max(Math.ceil(total / pageSize), 1),
});

// ------------------------
// CatRegimenFiscal (CFDI 4.0)
// ------------------------
// GET /facturacion/regimen-fiscal
export const listarRegimenFiscal = async (req: Request, res: Response) => {
  try {
    // Por defecto aquí NO forzamos 50; permitimos pageSize configurable (default 100)
    const { page, pageSize, skip, take } = buildPagination(req, 100);

    const q = (req.query.q as string)?.trim();
    const activo = parseActivo(req.query.activo);
    const aplicaFisica = req.query.aplica_fisica;
    const aplicaMoral = req.query.aplica_moral;

    const vigenteEn = parseDate(req.query.vigente_en); // opcional: filtra por fecha dentro de vigencia

    const where: any = {
      activo: activo === undefined ? undefined : activo,
      AND: [],
    };

    if (q) {
      where.AND.push({
        OR: [
          { clave: { contains: q } },
          { descripcion: { contains: q } },
        ],
      });
    }

    if (aplicaFisica !== undefined) {
      where.AND.push({ aplica_fisica: String(aplicaFisica) === '1' || String(aplicaFisica) === 'true' });
    }
    if (aplicaMoral !== undefined) {
      where.AND.push({ aplica_moral: String(aplicaMoral) === '1' || String(aplicaMoral) === 'true' });
    }

    if (vigenteEn) {
      // fecha_inicio_vigencia <= vigenteEn <= fecha_fin_vigencia (o sin fin)
      where.AND.push({
        OR: [
          {
            AND: [
              { fecha_inicio_vigencia: { lte: vigenteEn } },
              {
                OR: [
                  { fecha_fin_vigencia: null },
                  { fecha_fin_vigencia: { gte: vigenteEn } },
                ],
              },
            ],
          },
          // si no hay fechas, lo incluimos también (según tu catálogo)
          {
            AND: [
              { fecha_inicio_vigencia: null },
              { fecha_fin_vigencia: null },
            ],
          },
        ],
      });
    }

    const [total, data] = await Promise.all([
      prisma.catRegimenFiscal.count({ where }),
      prisma.catRegimenFiscal.findMany({
        where,
        orderBy: [{ clave: 'asc' }],
        skip,
        take,
      }),
    ]);

    res.json({ data, meta: meta(total, page, pageSize) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando régimen fiscal' });
  }
};

export const listarRegimenFiscalCliFront = async (req: Request, res: Response) => {
  try {
    const { q, persona, activo } = req.query as {
      q?: string;
      persona?: 'FISICA' | 'MORAL' | string;
      activo?: string;
    };

    const where: any = { activo: activo !== undefined ? Number(activo) : 1 };

    if (q && q.trim()) {
      where.OR = [
        { clave: { contains: q.trim() } },
        { descripcion: { contains: q.trim() } },
      ];
    }

    if (persona === 'FISICA') where.aplica_fisica = true;
    if (persona === 'MORAL') where.aplica_moral = true;

    const data = await prisma.catRegimenFiscal.findMany({
      where,
      orderBy: { clave: 'asc' },
      select: {
        clave: true,
        descripcion: true,
        aplica_fisica: true,
        aplica_moral: true,
      },
    });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al listar régimen fiscal' });
  }
};

// GET /facturacion/regimen-fiscal/:clave
export const obtenerRegimenFiscalPorClave = async (req: Request, res: Response) => {
  try {
    const { clave } = req.params;
    const item = await prisma.catRegimenFiscal.findUnique({ where: { clave } });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo régimen fiscal' });
  }
};

// GET /facturacion/cliente/:id/regimen-fiscal
export const obtenerRegimenFiscalDeCliente = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'id de cliente inválido' });
    }
    // Obtener cliente y su régimen fiscal
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        razon_social: true,
        rfc_facturacion: true,
        tipo_persona: true,
        regimen_fiscal: true,
      },
    });


    if (!cliente) {
      return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });
    }

    if (!cliente.regimen_fiscal) {
      return res.json({
        ok: true,
        cliente,
        regimen: null,
        validoParaPersona: null,
        vigenteHoy: null,
        warnings: ['El cliente no tiene regimen_fiscal asignado'],
      });
    }

    const regimen = await prisma.catRegimenFiscal.findUnique({
      where: { clave: cliente.regimen_fiscal },
      select: {
        clave: true,
        descripcion: true,
        aplica_fisica: true,
        aplica_moral: true,
        fecha_inicio_vigencia: true,
        fecha_fin_vigencia: true,
        activo: true,
      },
    });

    if (!regimen) {
      return res.json({
        ok: true,
        cliente,
        regimen: null,
        validoParaPersona: null,
        vigenteHoy: null,
        warnings: ['La clave de régimen del cliente no existe en el catálogo'],
      });
    }

    // ¿aplica para el tipo de persona?
    let validoParaPersona: boolean | null = null;
    if (cliente.tipo_persona === 'FISICA') validoParaPersona = !!regimen.aplica_fisica;
    else if (cliente.tipo_persona === 'MORAL') validoParaPersona = !!regimen.aplica_moral;

    // ¿vigente hoy?
    const hoy = new Date();
    const inicioOk = !regimen.fecha_inicio_vigencia || regimen.fecha_inicio_vigencia <= hoy;
    const finOk = !regimen.fecha_fin_vigencia || regimen.fecha_fin_vigencia >= hoy;
    const vigenteHoy = inicioOk && finOk;

    return res.json({
      ok: true,
      cliente,
      regimen,
      validoParaPersona,
      vigenteHoy,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ ok: false, message: 'Error obteniendo régimen fiscal del cliente', detail: err?.message });
  }
};

// ------------------------
// CatClaveUnidad (paginación default 50)
// ------------------------
export const listarClaveUnidad = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, skip, take } = buildPagination(req, 50);

    const q = (req.query.q as string)?.trim();
    const activo = parseActivo(req.query.activo);
    const vigenteEn = parseDate(req.query.vigente_en);

    const where: any = {
      activo: activo === undefined ? undefined : activo,
      AND: [],
    };

    if (q) {
      where.AND.push({
        OR: [
          { clave: { contains: q } },
          { nombre: { contains: q } },
          { descripcion: { contains: q } },
          { simbolo: { contains: q } },
        ],
      });
    }

    if (vigenteEn) {
      where.AND.push({
        OR: [
          {
            AND: [
              { fecha_inicio_vigencia: { lte: vigenteEn } },
              {
                OR: [
                  { fecha_fin_vigencia: null },
                  { fecha_fin_vigencia: { gte: vigenteEn } },
                ],
              },
            ],
          },
          {
            AND: [
              { fecha_inicio_vigencia: null },
              { fecha_fin_vigencia: null },
            ],
          },
        ],
      });
    }

    const [total, data] = await Promise.all([
      prisma.catClaveUnidad.count({ where }),
      prisma.catClaveUnidad.findMany({
        where,
        orderBy: [{ clave: 'asc' }],
        skip,
        take,
      }),
    ]);

    res.json({ data, meta: meta(total, page, pageSize) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando clave unidad' });
  }
};

// GET /facturacion/clave-unidad/:clave
export const obtenerClaveUnidadPorClave = async (req: Request, res: Response) => {
  try {
    const { clave } = req.params;
    const item = await prisma.catClaveUnidad.findUnique({ where: { clave } });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo clave unidad' });
  }
};

// GET /facturacion/clave-unidad/autocomplete?q=...
export const autocompleteClaveUnidad = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q) return res.json([]);

    const data = await prisma.catClaveUnidad.findMany({
      where: {
        OR: [
          { clave: { contains: q } },
          { nombre: { contains: q } },
          { descripcion: { contains: q } },
        ],
      },
      orderBy: [{ clave: 'asc' }],
      take: 10,
      select: { id: true, clave: true, nombre: true, simbolo: true },
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en autocomplete de clave unidad' });
  }
};

// ------------------------
// CatClaveProdServ (paginación default 50)
// ------------------------
// GET /facturacion/clave-prodserv
export const listarClaveProdServ = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, skip, take } = buildPagination(req, 50);

    const q = (req.query.q as string)?.trim();
    const activo = parseActivo(req.query.activo);
    const vigenteEn = parseDate(req.query.vigente_en);

    const where: any = {
      activo: activo === undefined ? undefined : activo,
      AND: [],
    };

    if (q) {
      where.AND.push({
        OR: [
          { clave: { contains: q } },
          { descripcion: { contains: q } },
          { palabras_similares: { contains: q } },
          { complemento_que_debe_incluir: { contains: q } },
          { incluir_iva_trasladado: { contains: q } },
          { incluir_ieps_trasladado: { contains: q } },
        ],
      });
    }

    if (vigenteEn) {
      where.AND.push({
        OR: [
          {
            AND: [
              { fecha_inicio_vigencia: { lte: vigenteEn } },
              {
                OR: [
                  { fecha_fin_vigencia: null },
                  { fecha_fin_vigencia: { gte: vigenteEn } },
                ],
              },
            ],
          },
          {
            AND: [
              { fecha_inicio_vigencia: null },
              { fecha_fin_vigencia: null },
            ],
          },
        ],
      });
    }

    const [total, data] = await Promise.all([
      prisma.catClaveProdServ.count({ where }),
      prisma.catClaveProdServ.findMany({
        where,
        orderBy: [{ clave: 'asc' }],
        skip,
        take,
      }),
    ]);

    res.json({ data, meta: meta(total, page, pageSize) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando clave producto/servicio' });
  }
};

// GET /facturacion/clave-prodserv/:clave
export const obtenerClaveProdServPorClave = async (req: Request, res: Response) => {
  try {
    const { clave } = req.params;
    const item = await prisma.catClaveProdServ.findUnique({ where: { clave } });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo clave producto/servicio' });
  }
};

// GET /facturacion/clave-prodserv/autocomplete?q=...
export const autocompleteClaveProdServ = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q) return res.json([]);

    const data = await prisma.catClaveProdServ.findMany({
      where: {
        OR: [
          { clave: { contains: q } },
          { descripcion: { contains: q } },
          { palabras_similares: { contains: q } },
        ],
      },
      orderBy: [{ clave: 'asc' }],
      take: 10,
      select: { id: true, clave: true, descripcion: true },
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en autocomplete de clave prod/serv' });
  }
};


/** =========================================================
 *  PUT /facturacion/csd/password
 *  Body: { sucursalId: number, password?: string | null, clear?: boolean }
 *
 *  - Si clear=true, se limpia password_cer_key.
 *  - Si password (string no vacía), se cifra y se guarda.
 *  - Rechaza si faltan parámetros o si la sucursal no existe.
 *  ========================================================= */
export const actualizarPasswordCsd = async (req: Request, res: Response) => {
  try {
    const rawSucursalId = (req.body?.sucursalId ?? req.query?.sucursalId);
    const sucursalId = Number(rawSucursalId);
    const clear = req.body?.clear === true || String(req.body?.clear).toLowerCase() === 'true';
    const rawPassword = (req.body?.password ?? '') as string;

    if (!Number.isFinite(sucursalId) || sucursalId <= 0) {
      return res.status(400).json({ ok: false, message: 'sucursalId inválido' });
    }

    // Verifica que la sucursal exista
    const suc = await prisma.sucursal.findUnique({ where: { id: sucursalId }, select: { id: true } });
    if (!suc) {
      return res.status(404).json({ ok: false, message: 'Sucursal no encontrada' });
    }

    // Decidir si limpiar o actualizar
    let password_cer_key: string | null = null;

    if (!clear) {
      const trimmed = (rawPassword || '').trim();
      if (!trimmed) {
        return res.status(400).json({ ok: false, message: 'password vacío: envía un valor o usa clear=true para limpiar' });
      }
      // Cifrar
      try {
        //password_cer_key = encryptPasswordGcm(trimmed);
      } catch (e: any) {
        return res.status(500).json({ ok: false, message: `Error cifrando password: ${e?.message || e}` });
      }
    }

    // Persistir
    await prisma.sucursal.update({
      where: { id: sucursalId },
      data: { password_cer_key },
    });

    return res.json({
      ok: true,
      action: clear ? 'cleared' : 'updated',
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({
      ok: false,
      message: 'Error actualizando contraseña del CSD',
      detail: err?.message || String(err),
    });
  }
};


const OPENSSL = (process.env.OPENSSL_BIN && process.env.OPENSSL_BIN.trim()) || 'openssl';
import { spawnSync } from 'child_process';
function runOpenSSLSync(args: string[], extraEnv: Record<string, string> = {}) {
  const r = spawnSync(OPENSSL, args, {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv }, 
  });
  return {
    code: r.status ?? 0,
    stdout: r.stdout?.toString?.() ?? '',
    stderr: (r.stderr?.toString?.() ?? '') + (r.error ? ` ${r.error.message}` : ''),
  };
}

async function keyDerToPem(keyDerPath: string, password?: string) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cfdi-'));
  const keyPemPath = path.join(tmpDir, `key-${Date.now()}-${Math.random().toString(36).slice(2)}.pem`);
  const safePass = (password ?? '').replace(/\r?\n/g, '').trim();
  if (!safePass) return { ok: false as const, wrongPass: true, message: 'Password vacío para .key' };

  const passFile = path.join(tmpDir, 'pass.txt');
  await fs.writeFile(passFile, safePass, { encoding: 'utf8' });

  // 1) Intento sin providers
  let args = [
    'pkcs8', '-inform', 'DER', '-in', keyDerPath, '-passin', `file:${passFile}`,
    '-out', keyPemPath, '-outform', 'PEM'
  ];
  let r = runOpenSSLSync(args);

  // 2) Si falla por "provider/legacy", reintenta con providers y OPENSSL_MODULES
  if (r.code !== 0 && /provider|legacy|OPENSSL_MODULES/i.test(r.stderr + r.stdout)) {
    const modulesPath =
      process.env.OPENSSL_MODULES ||
      'C:\\Program Files\\OpenSSL\\lib\\ossl-modules'; // por defecto en Windows común
    args = [
      'pkcs8', '-inform', 'DER', '-in', keyDerPath, '-passin', `file:${passFile}`,
      '-out', keyPemPath, '-outform', 'PEM',
      '-provider', 'legacy', '-provider', 'default'
    ];
    r = runOpenSSLSync(args, { OPENSSL_MODULES: modulesPath });
  }

  try { fssync.existsSync(passFile) && fssync.rmSync(passFile, { force: true }); } catch { }
  if (r.code !== 0) {
    const msg = (r.stderr || r.stdout).toLowerCase();
    const wrongPass = /bad decrypt|cipherfinal error|password|pkcs8|error decrypting/.test(msg);
    try { fssync.existsSync(keyPemPath) && fssync.rmSync(keyPemPath, { force: true }); } catch { }
    return { ok: false as const, wrongPass, message: r.stderr || r.stdout };
  }
  try { fssync.existsSync(keyPemPath) && fssync.rmSync(keyPemPath, { force: true }); } catch { }
  return { ok: true as const };
}

// Para el CSD y el KEY tiene que mandar true.
export async function verificarPasswordCsd(req: Request, res: Response) {
  try {
    const sucursalId = Number(req.body?.sucursalId ?? req.query?.sucursalId);
    if (!Number.isFinite(sucursalId) || sucursalId <= 0) {
      return res.status(400).json({ ok: false, message: 'sucursalId inválido' });
    }

    const saveIfOk = req.body?.saveIfOk === true || String(req.body?.saveIfOk).toLowerCase() === 'true';

    const suc = await prisma.sucursal.findUnique({
      where: { id: sucursalId },
      select: { id: true, cer: true, key: true, password_cer_key: true },
    });
    if (!suc) return res.status(404).json({ ok: false, message: 'Sucursal no encontrada' });
    if (!suc.cer || !suc.key) return res.status(400).json({ ok: false, message: 'Sucursal sin CSD (cer/key)' });

    const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || '';
    if (!bucket) return res.status(500).json({ ok: false, message: 'Falta S3_BUCKET' });

    const candidate =
      (req.body?.password as string | undefined)?.trim() ||
      //decryptPasswordGcm(suc.password_cer_key) ||
      '';

    if (!candidate) return res.status(400).json({ ok: false, message: 'No hay password para verificar' });

    const keyPath = await downloadFromS3(bucket, suc.key);

    const r = await keyDerToPem(keyPath, candidate);
    if (!r.ok) {
      return res.json({ ok: false, wrongPass: r.wrongPass === true, message: r.message });
    }

    if (saveIfOk && typeof req.body?.password === 'string' && req.body.password.trim()) {
      await prisma.sucursal.update({
        where: { id: sucursalId },
        data: { password_cer_key: ''//encryptPasswordGcm(req.body.password.trim()) 

        },
      });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ ok: false, message: 'Error verificando password', detail: err?.message || String(err) });
  }
}

/**
 * GET /csd/password/status?sucursalId=#
 * Respuesta: { ok:true, hasPassword:boolean }
 * (no devuelve la contraseña)
 */
export async function statusPasswordCsd(req: Request, res: Response) {
  try {
    const sucursalId = Number(req.query?.sucursalId);
    if (!Number.isFinite(sucursalId) || sucursalId <= 0) {
      return res.status(400).json({ ok: false, message: 'sucursalId inválido' });
    }
    const suc = await prisma.sucursal.findUnique({
      where: { id: sucursalId },
      select: { password_cer_key: true },
    });
    if (!suc) return res.status(404).json({ ok: false, message: 'Sucursal no encontrada' });
    return res.json({ ok: true, hasPassword: !!suc.password_cer_key });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: 'Error consultando status', detail: e?.message || String(e) });
  }
}

const boolFromQuery = (v: any): boolean | undefined => {
  const s = qStr(v)?.toLowerCase();
  if (s === '1' || s === 'true') return true;
  if (s === '0' || s === 'false') return false;
  return undefined;
};
const dateFromQuery = (v: any): Date | undefined => {
  const s = qStr(v);
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
};
const reqEnumFromQuery = (v: any): 'NO' | 'OPCIONAL' | 'OBLIGATORIO' | undefined => {
  const s = qStr(v)?.toUpperCase();
  if (s === 'NO' || s === 'OPCIONAL' || s === 'OBLIGATORIO') return s;
  return undefined;
};

// GET /facturacion/forma-pago
export const listarFormaPago = async (req: Request, res: Response) => {
  try {
    const q = qStr(req.query.q);
    const activo = activoFromQuery(req.query.activo);
    const bancarizado = boolFromQuery(req.query.bancarizado);
    const vigenteEn = dateFromQuery(req.query.vigente_en);

    // Requisitos (RequerimientoCampo)
    const reqNumOp = reqEnumFromQuery(req.query.req_num_op);
    const reqRfcEmCtaOrd = reqEnumFromQuery(req.query.req_rfc_emisor_cta_ord);
    const reqCtaOrd = reqEnumFromQuery(req.query.req_cta_ord);
    const reqRfcEmCtaBen = reqEnumFromQuery(req.query.req_rfc_emisor_cta_ben);
    const reqCtaBen = reqEnumFromQuery(req.query.req_cta_ben);
    const reqTipoCadenaPago = reqEnumFromQuery(req.query.req_tipo_cadena_pago);
    const reqNombreBancoExt = reqEnumFromQuery(req.query.req_nombre_banco_ext);

    const where: any = {
      activo: activo === undefined ? undefined : activo,
      AND: [],
    };

    if (q) {
      where.AND.push({
        OR: [
          { clave: { contains: q } },
          { descripcion: { contains: q } },
        ],
      });
    }
    if (bancarizado !== undefined) where.AND.push({ bancarizado });

    // Filtros por requisito (si vienen)
    if (reqNumOp) where.AND.push({ reqNumeroOperacion: reqNumOp });
    if (reqRfcEmCtaOrd) where.AND.push({ reqRfcEmisorCtaOrd: reqRfcEmCtaOrd });
    if (reqCtaOrd) where.AND.push({ reqCuentaOrdenante: reqCtaOrd });
    if (reqRfcEmCtaBen) where.AND.push({ reqRfcEmisorCtaBen: reqRfcEmCtaBen });
    if (reqCtaBen) where.AND.push({ reqCuentaBeneficiaria: reqCtaBen });
    if (reqTipoCadenaPago) where.AND.push({ reqTipoCadenaPago: reqTipoCadenaPago });
    if (reqNombreBancoExt) where.AND.push({ reqNombreBancoExtranj: reqNombreBancoExt });

    // Vigencia (si se solicita)
    if (vigenteEn) {
      where.AND.push({
        OR: [
          {
            AND: [
              { fecha_inicio_vigencia: { lte: vigenteEn } },
              {
                OR: [
                  { fecha_fin_vigencia: null },
                  { fecha_fin_vigencia: { gte: vigenteEn } },
                ],
              },
            ],
          },
          { AND: [{ fecha_inicio_vigencia: null }, { fecha_fin_vigencia: null }] },
        ],
      });
    }

    const data = await prisma.catFormaPago.findMany({
      where,
      orderBy: { clave: 'asc' },
      select: {
        clave: true,
        descripcion: true,
        bancarizado: true,
        reqNumeroOperacion: true,
        reqRfcEmisorCtaOrd: true,
        reqCuentaOrdenante: true,
        patronCuentaOrdenante: true,
        reqCuentaBeneficiaria: true,
        patronCuentaBen: true,
        reqTipoCadenaPago: true,
        reqNombreBancoExtranj: true,
        condicionBancoExtranj: true,
        fecha_inicio_vigencia: true,
        fecha_fin_vigencia: true,
        activo: true,
      },
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando forma de pago' });
  }
};

// GET /facturacion/forma-pago/:clave
export const obtenerFormaPagoPorClave = async (req: Request, res: Response) => {
  try {
    const { clave } = req.params;
    const item = await prisma.catFormaPago.findUnique({
      where: { clave },
      select: {
        clave: true,
        descripcion: true,
        bancarizado: true,
        reqNumeroOperacion: true,
        reqRfcEmisorCtaOrd: true,
        reqCuentaOrdenante: true,
        patronCuentaOrdenante: true,
        reqCuentaBeneficiaria: true,
        patronCuentaBen: true,
        reqTipoCadenaPago: true,
        reqNombreBancoExtranj: true,
        condicionBancoExtranj: true,
        fecha_inicio_vigencia: true,
        fecha_fin_vigencia: true,
        activo: true,
      },
    });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo forma de pago' });
  }
};

// // GET /facturacion/forma-pago/autocomplete?q=...
// export const autocompleteFormaPago = async (req: Request, res: Response) => {
//   try {
//     const q = qStr(req.query.q);
//     if (!q) return res.json([]);

//     const data = await prisma.catFormaPago.findMany({
//       where: {
//         OR: [
//           { clave: { contains: q } },
//           { descripcion: { contains: q } },
//         ],
//       },
//       orderBy: { clave: 'asc' },
//       take: 10,
//       select: { clave: true, descripcion: true },
//     });

//     res.json(data);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Error en autocomplete de forma de pago' });
//   }
// };

// GET /facturacion/forma-pago/front (lista simple para selects del front)
export const listarFormaPagoCliFront = async (req: Request, res: Response) => {
  try {
    const q = qStr(req.query.q);
    const activo = activoFromQuery(req.query.activo);
    const where: any = { activo: activo === undefined ? 1 : activo };

    if (q) {
      where.OR = [
        { clave: { contains: q } },
        { descripcion: { contains: q } },
      ];
    }

    const data = await prisma.catFormaPago.findMany({
      where,
      orderBy: { clave: 'asc' },
      select: { clave: true, descripcion: true },
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando formas de pago (front)' });
  }
};

//Catalogo Metodo de Pago PUE/ PDD

// GET /facturacion/metodo-pago
export const listarMetodoPago = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.catMetodoPago.findMany({
      orderBy: { clave: 'asc' },
      select: {
        clave: true,
        descripcion: true,
        fecha_inicio_vigencia: true,
        fecha_fin_vigencia: true,
        activo: true,
      },
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando métodos de pago' });
  }
};

// GET /facturacion/metodo-pago/:clave
export const obtenerMetodoPagoPorClave = async (req: Request, res: Response) => {
  try {
    const { clave } = req.params;
    const item = await prisma.catMetodoPago.findUnique({
      where: { clave },
      select: {
        clave: true,
        descripcion: true,
        fecha_inicio_vigencia: true,
        fecha_fin_vigencia: true,
        activo: true,
      },
    });

    if (!item) return res.status(404).json({ error: 'Método de pago no encontrado' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo método de pago' });
  }
};

// // GET /facturacion/metodo-pago/autocomplete?q=...
// export const autocompleteMetodoPago = async (req: Request, res: Response) => {
//   try {
//     const q = (req.query.q as string)?.trim();
//     const where: any = q
//       ? {
//         OR: [
//           { clave: { contains: q } },
//           { descripcion: { contains: q } },
//         ],
//       }
//       : {};

//     const data = await prisma.catMetodoPago.findMany({
//       where,
//       orderBy: { clave: 'asc' },
//       select: { clave: true, descripcion: true },
//     });

//     res.json(data);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Error en autocomplete de método de pago' });
//   }
// };

// GET /facturacion/metodo-pago/front
export const listarMetodoPagoCliFront = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.catMetodoPago.findMany({
      where: { activo: 1 },
      orderBy: { clave: 'asc' },
      select: { clave: true, descripcion: true },
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando métodos de pago (front)' });
  }
};

// Helpers
const qStr = (v: any): string | undefined => {
  if (v === undefined || v === null) return undefined;
  return Array.isArray(v) ? String(v[0]).trim() : String(v).trim();
};
const activoFromQuery = (v: any): number | undefined => {
  const s = qStr(v)?.toLowerCase();
  if (s === '1' || s === 'true') return 1;
  if (s === '0' || s === 'false') return 0;
  return undefined;
};
const parseDateSafe = (v: any): Date | undefined => {
  const s = qStr(v);
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
};


// GET /facturacion/uso-cfdi?q=&activo=1|0&persona=FISICA|MORAL&regimen=601&vigente_en=2025-01-01
export const listarUsoCFDI = async (req: Request, res: Response) => {
  try {
    const q = qStr(req.query.q);
    const activo = activoFromQuery(req.query.activo);
    const persona = qStr(req.query.persona)?.toUpperCase(); // FISICA | MORAL
    const regimenFilter = qStr(req.query.regimen);          // p.ej. "601"
    const vigenteEn = parseDateSafe(req.query.vigente_en);

    const and: any[] = [];

    if (q) {
      and.push({
        OR: [
          { clave: { contains: q, mode: 'insensitive' as const } },
          { descripcion: { contains: q, mode: 'insensitive' as const } },
        ],
      });
    }
    if (persona === 'FISICA') and.push({ aplica_fisica: true });
    if (persona === 'MORAL') and.push({ aplica_moral: true });

    if (vigenteEn) {
      and.push({
        OR: [
          {
            AND: [
              { fecha_inicio_vigencia: { lte: vigenteEn } },
              { OR: [{ fecha_fin_vigencia: null }, { fecha_fin_vigencia: { gte: vigenteEn } }] },
            ],
          },
          { AND: [{ fecha_inicio_vigencia: null }, { fecha_fin_vigencia: null }] },
        ],
      });
    }

    const where: any = {
      ...(activo !== undefined ? { activo } : {}),
      ...(and.length ? { AND: and } : {}),
    };

    // 1) Carga TODOS los regímenes activos (para fallback)
    const allRegimenesActivos = await prisma.catRegimenFiscal.findMany({
      where: { activo: 1 },
      select: {
        clave: true,
        descripcion: true,
        aplica_fisica: true,
        aplica_moral: true,
      },
    });

    // 2) Carga los usos con su pivote (solo activos) + datos del régimen
    const usos = await prisma.catUsoCFDI.findMany({
      where,
      orderBy: { clave: 'asc' },
      select: {
        clave: true,
        descripcion: true,
        aplica_fisica: true,
        aplica_moral: true,
        fecha_inicio_vigencia: true,
        fecha_fin_vigencia: true,
        activo: true,
        regimenes: {
          where: { activo: 1 },
          select: {
            regimen_clave: true,
            regimen: {
              select: {
                clave: true,
                descripcion: true,
                aplica_fisica: true,
                aplica_moral: true,
                activo: true,
              },
            },
          },
        },
      },
    });

    const result = usos.map((uso) => {
      // Preferir el pivote si trae filas activas
      const pivotRegs = uso.regimenes
        .map(r => r.regimen)
        .filter((r): r is NonNullable<typeof r> => !!r && r.activo === 1);

      // Si pivote vacío → fallback a TODOS los regímenes activos
      const base = pivotRegs.length > 0 ? pivotRegs : allRegimenesActivos;

      // Filtrar por banderas del UsoCFDI (Física / Moral)
      const byPersona = base.filter(r =>
        (uso.aplica_fisica && r.aplica_fisica) ||
        (uso.aplica_moral && r.aplica_moral)
      );

      // Si venía un filtro ?regimen=601, aplícalo aquí
      const byRegimen = regimenFilter
        ? byPersona.filter(r => r.clave === regimenFilter)
        : byPersona;

      return {
        clave: uso.clave,
        descripcion: uso.descripcion,
        aplica_fisica: uso.aplica_fisica,
        aplica_moral: uso.aplica_moral,
        fecha_inicio_vigencia: uso.fecha_inicio_vigencia,
        fecha_fin_vigencia: uso.fecha_fin_vigencia,
        activo: uso.activo,
        // Para compatibilidad con tu front, devolvemos SOLO claves
        regimenes: byRegimen.map(r => r.clave),
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando Uso CFDI' });
  }
};


// GET /facturacion/uso-cfdi/:clave
export const obtenerUsoCFDIPorClave = async (req: Request, res: Response) => {
  try {
    const { clave } = req.params;

    // Fallback: todos los regímenes activos
    const allRegimenesActivos = await prisma.catRegimenFiscal.findMany({
      where: { activo: 1 },
      select: {
        clave: true,
        descripcion: true,
        aplica_fisica: true,
        aplica_moral: true,
      },
    });

    const uso = await prisma.catUsoCFDI.findUnique({
      where: { clave },
      select: {
        clave: true,
        descripcion: true,
        aplica_fisica: true,
        aplica_moral: true,
        fecha_inicio_vigencia: true,
        fecha_fin_vigencia: true,
        activo: true,
        regimenes: {
          where: { activo: 1 },
          select: {
            regimen_clave: true,
            regimen: {
              select: {
                clave: true,
                descripcion: true,
                aplica_fisica: true,
                aplica_moral: true,
                activo: true,
              },
            },
          },
        },
      },
    });

    if (!uso) return res.status(404).json({ error: 'UsoCFDI no encontrado' });

    const pivotRegs = uso.regimenes
      .map(r => r.regimen)
      .filter((r): r is NonNullable<typeof r> => !!r && r.activo === 1);

    const base = pivotRegs.length > 0 ? pivotRegs : allRegimenesActivos;

    const regimenesFiltrados = base
      .filter(r =>
        (uso.aplica_fisica && r.aplica_fisica) ||
        (uso.aplica_moral && r.aplica_moral)
      )
      .map(r => ({ clave: r.clave, descripcion: r.descripcion }));

    res.json({
      clave: uso.clave,
      descripcion: uso.descripcion,
      aplica_fisica: uso.aplica_fisica,
      aplica_moral: uso.aplica_moral,
      fecha_inicio_vigencia: uso.fecha_inicio_vigencia,
      fecha_fin_vigencia: uso.fecha_fin_vigencia,
      activo: uso.activo,
      regimenes: regimenesFiltrados,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo Uso CFDI' });
  }
};


// GET /facturacion/uso-cfdi/:clave/regimenes?persona=FISICA|MORAL&vigente_en=YYYY-MM-DD
export const listarRegimenesPermitidosPorUso = async (req: Request, res: Response) => {
  try {
    const { clave } = req.params;
    const persona = qStr(req.query.persona)?.toUpperCase();
    const vigenteEn = parseDateSafe(req.query.vigente_en);

    const regimenWhere: any = { activo: 1, uso_clave: clave };

    // Filtra por persona contra el catálogo de régimen
    const regimenRelationFilter: any = {};
    if (persona === 'FISICA') regimenRelationFilter.aplica_fisica = true;
    if (persona === 'MORAL') regimenRelationFilter.aplica_moral = true;

    if (vigenteEn) {
      regimenRelationFilter.AND = [
        { OR: [{ fecha_inicio_vigencia: null }, { fecha_inicio_vigencia: { lte: vigenteEn } }] },
        { OR: [{ fecha_fin_vigencia: null }, { fecha_fin_vigencia: { gte: vigenteEn } }] },
      ];
    }

    const rows = await prisma.catUsoCFDIRegimen.findMany({
      where: regimenWhere,
      orderBy: { regimen_clave: 'asc' },
      select: {
        regimen_clave: true,
        regimen: { select: { clave: true, descripcion: true, aplica_fisica: true, aplica_moral: true, fecha_inicio_vigencia: true, fecha_fin_vigencia: true } },
      },
    });

    const filtered = rows.filter(r => {
      if (!r.regimen) return false;
      // aplica persona
      if (persona === 'FISICA' && !r.regimen.aplica_fisica) return false;
      if (persona === 'MORAL' && !r.regimen.aplica_moral) return false;
      // vigencia
      if (vigenteEn) {
        const iniOk = !r.regimen.fecha_inicio_vigencia || r.regimen.fecha_inicio_vigencia <= vigenteEn;
        const finOk = !r.regimen.fecha_fin_vigencia || r.regimen.fecha_fin_vigencia >= vigenteEn;
        if (!(iniOk && finOk)) return false;
      }
      return true;
    });

    res.json(filtered.map(r => ({ clave: r.regimen_clave, descripcion: r.regimen!.descripcion })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando regímenes por UsoCFDI' });
  }
};

// GET /facturacion/uso-cfdi/front
export const listarUsoCFDICliFront = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.catUsoCFDI.findMany({
      where: { activo: 1 },
      orderBy: { clave: 'asc' },
      select: { clave: true, descripcion: true, aplica_fisica: true, aplica_moral: true },
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando UsoCFDI (front)' });
  }
};

// GET /facturacion/cliente/:id/uso-cfdi/:uso/validar
export const validarUsoCFDIParaCliente = async (req: Request, res: Response) => {
  try {
    const clienteId = Number(req.params.id);
    const uso = (req.params.uso || '').toUpperCase();

    if (!Number.isFinite(clienteId) || clienteId <= 0) {
      return res.status(400).json({ ok: false, message: 'id de cliente inválido' });
    }
    if (!uso) {
      return res.status(400).json({ ok: false, message: 'uso CFDI requerido' });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, razon_social: true, tipo_persona: true, regimen_fiscal: true },
    });
    if (!cliente) return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });

    const usoRow = await prisma.catUsoCFDI.findUnique({
      where: { clave: uso },
      select: {
        clave: true,
        descripcion: true,
        aplica_fisica: true,
        aplica_moral: true,
        fecha_inicio_vigencia: true,
        fecha_fin_vigencia: true,
        regimenes: {
          select: { regimen_clave: true, activo: true },
          where: { activo: 1 },
        },
      },
    });
    if (!usoRow) return res.status(404).json({ ok: false, message: 'UsoCFDI no encontrado' });

    // 1) Persona
    let aplicaPersona = true;
    if (cliente.tipo_persona === 'FISICA') aplicaPersona = !!usoRow.aplica_fisica;
    if (cliente.tipo_persona === 'MORAL') aplicaPersona = !!usoRow.aplica_moral;

    // 2) Vigencia
    const hoy = new Date();
    const inicioOk = !usoRow.fecha_inicio_vigencia || usoRow.fecha_inicio_vigencia <= hoy;
    const finOk = !usoRow.fecha_fin_vigencia || usoRow.fecha_fin_vigencia >= hoy;
    const vigente = inicioOk && finOk;

    // 3) Lista de regímenes permitidos:
    let regimenesPermitidos = usoRow.regimenes.map(r => r.regimen_clave);

    // Fallback: si la pivote NO tiene filas, usamos los CatRegimenFiscal que apliquen a la persona
    if (regimenesPermitidos.length === 0) {
      if (usoRow.aplica_fisica || usoRow.aplica_moral) {
        const wherePersona =
          cliente.tipo_persona === 'FISICA'
            ? { aplica_fisica: true, activo: 1 }
            : { aplica_moral: true, activo: 1 };

        const catRegs = await prisma.catRegimenFiscal.findMany({
          select: { clave: true },
          where: wherePersona,
        });
        regimenesPermitidos = catRegs.map(r => r.clave);
      }
    }

    const tieneRestr = regimenesPermitidos.length > 0; // con fallback, normalmente sí habrá
    let regimenOk: boolean | null = null;
    if (cliente.regimen_fiscal) {
      regimenOk = tieneRestr ? regimenesPermitidos.includes(cliente.regimen_fiscal) : true;
    }

    return res.json({
      ok: true,
      cliente: {
        id: cliente.id,
        tipo_persona: cliente.tipo_persona,
        regimen_fiscal: cliente.regimen_fiscal,
      },
      uso: { clave: usoRow.clave, descripcion: usoRow.descripcion },
      aplicaPersona,
      vigente,
      regimenOk,
      regimenesPermitidos,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error validando UsoCFDI para cliente', detail: err?.message });
  }
};
