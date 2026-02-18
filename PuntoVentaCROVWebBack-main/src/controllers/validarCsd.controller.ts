
// src/controllers/validarCsd.controller.ts 
import type { Request, Response } from 'express';
import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import os from 'os';
import { downloadFromS3 } from './s3.controller';
import 'dotenv/config';

/* ==========================
   Helpers de entorno / OpenSSL
========================== */

function normalizeEnvPath(p?: string) {
  if (!p) return '';
  const trimmed = p.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  return trimmed;
}

function resolveOpenSSLBin(): string {
  const projectBinDir = path.join(process.cwd(), 'node_modules', '.bin');
  const isWin = process.platform === 'win32';
  const localOpenssl = path.join(projectBinDir, isWin ? 'openssl.cmd' : 'openssl');
  if (fssync.existsSync(localOpenssl)) return localOpenssl;
  const envBin = normalizeEnvPath(process.env.OPENSSL_BIN || '');
  if (envBin) return envBin;
  return 'openssl';
}
const OPENSSL_BIN = resolveOpenSSLBin();

function isWindowsCmdLike(p: string) {
  return process.platform === 'win32' && /\.(cmd|bat)$/i.test(p);
}
function quote(s: string) {
  return /[\s()]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}
function runOpenSSLSync(args: string[]) {
  let r;
  if (isWindowsCmdLike(OPENSSL_BIN)) {
    const line = [quote(OPENSSL_BIN), ...args.map(quote)].join(' ');
    r = spawnSync(line, { encoding: 'utf8', shell: true });
  } else {
    r = spawnSync(OPENSSL_BIN, args, { encoding: 'utf8', shell: false });
  }
  return {
    code: r.status ?? -1,
    stdout: r.stdout?.toString?.() ?? '',
    stderr: (r.stderr?.toString?.() ?? '') + (r.error ? ` ${r.error.message}` : ''),
  };
}

let OPENSSL_WORKS: boolean | null = null;
function checkOpenSSLAvailable(): boolean {
  if (OPENSSL_WORKS !== null) return OPENSSL_WORKS;
  try {
    const r = spawnSync(OPENSSL_BIN, ['version'], { encoding: 'utf8' });
    OPENSSL_WORKS = !!r.stdout && r.status === 0;
  } catch {
    OPENSSL_WORKS = false;
  }
  return OPENSSL_WORKS;
}

/* ==========================
   Tipos y utilidades
========================== */

type ValidationErrorCode =
  | 'PASSWORD_WRONG' | 'MODULUS_MISMATCH' | 'EXPIRED_CERT' | 'NOT_YET_VALID'
  | 'NOT_CSD' | 'RFC_MISMATCH' | 'CORRUPTED_CER' | 'CORRUPTED_KEY'
  | 'SIZE_LIMIT' | 'EXTENSION_INVALID' | 'DOWNLOAD_ERROR' | 'OPENSSL_NOT_AVAILABLE' | 'UNKNOWN';

interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  details?: any;
}
function pushErr(arr: ValidationError[], code: ValidationErrorCode, message: string, details?: any) {
  arr.push({ code, message, details });
}
function isCerFilename(name?: string) { return !!name && /\.(cer)$/i.test(name); }
function isKeyFilename(name?: string) { return !!name && /\.key$/i.test(name); }

async function mkTmpFile(name: string, buf: Buffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'csd-'));
  const p = path.join(dir, name);
  await fs.writeFile(p, buf);
  return p;
}
async function cleanupPaths(...paths: string[]) {
  for (const p of paths) {
    if (!p) continue;
    try {
      if (fssync.existsSync(p)) await fs.rm(p, { force: true });
      const dir = path.dirname(p);
      if (fssync.existsSync(dir)) {
        try { await fs.rmdir(dir); } catch { /* si no está vacío, lo dejamos */ }
      }
    } catch { /* ignore */ }
  }
}

/* ==========================
   Lectura de certificado con OpenSSL
========================== */

function readLine(args: string[]) {
  const r = runOpenSSLSync(args);
  if (r.code !== 0) return '';
  return (r.stdout || '').trim();
}
function getSha256Fingerprint(cerPath: string): string | null {
  const r = runOpenSSLSync(['x509', '-in', cerPath, '-noout', '-fingerprint', '-sha256']);
  if (r.code !== 0) return null;
  const m = r.stdout.match(/SHA256 Fingerprint=([0-9A-F:]+)/i);
  return m ? m[1].replace(/:/g, '').toUpperCase() : null;
}
function extractRfc(subjectLine: string, fullText?: string): string | null {
  const candidates = [
    /\bRFC\s*=\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/i,
    /\bserialNumber\s*=\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/i,
    /\b2\.5\.4\.45\s*=\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/i,
    /\bx500UniqueIdentifier\s*=\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/i
  ];
  for (const rx of candidates) {
    const m = rx.exec(subjectLine) || (fullText ? rx.exec(fullText) : null);
    if (m) return m[1].toUpperCase();
  }
  return null;
}
function readDates(cerPath: string): { notBefore: Date | null; notAfter: Date | null } {
  let out = readLine(['x509', '-in', cerPath, '-inform', 'DER', '-noout', '-dates']);
  if (!out) out = readLine(['x509', '-in', cerPath, '-noout', '-dates']);
  const nb = /notBefore=(.+)/i.exec(out)?.[1];
  const na = /notAfter=(.+)/i.exec(out)?.[1];
  return { notBefore: nb ? new Date(nb) : null, notAfter: na ? new Date(na) : null };
}
function readCertInfo(cerPath: string) {
  let r = runOpenSSLSync(['x509', '-in', cerPath, '-inform', 'DER', '-noout', '-text']);
  if (r.code !== 0) r = runOpenSSLSync(['x509', '-in', cerPath, '-noout', '-text']);
  if (r.code !== 0) return { ok: false as const, stderr: r.stderr };
  const text = r.stdout;

  let subject = readLine(['x509', '-in', cerPath, '-inform', 'DER', '-noout', '-subject', '-nameopt', 'RFC2253']);
  if (!subject) subject = readLine(['x509', '-in', cerPath, '-noout', '-subject', '-nameopt', 'RFC2253']);
  subject = subject.replace(/^subject=\s*/i, '');

  let issuer = readLine(['x509', '-in', cerPath, '-inform', 'DER', '-noout', '-issuer', '-nameopt', 'RFC2253']);
  if (!issuer) issuer = readLine(['x509', '-in', cerPath, '-noout', '-issuer', '-nameopt', 'RFC2253']);
  issuer = issuer.replace(/^issuer=\s*/i, '');

  const { notBefore, notAfter } = readDates(cerPath);
  const serialHex = (text.match(/Serial Number:\s*([0-9A-F:\s]+)/i)?.[1] || '')
    .replace(/[\s:]/g, '').toUpperCase() || null;

  const sha256 = getSha256Fingerprint(cerPath);
  const rfc = extractRfc(subject, text);

  return {
    ok: true as const,
    text, subject, issuer,
    notBefore, notAfter,
    serialHex, noCertificado: serialHex,
    sha256Thumbprint: sha256,
    rfc
  };
}

/* ==========================
   Apertura y modulus de la .key (muchas rutas)
========================== */

function tryOpenSSL(args: string[], label: string) {
  const r = runOpenSSLSync(args);
  return { label, code: r.code, out: r.stdout, err: r.stderr };
}

/** Intenta múltiples rutas para comprobar password/estructura. */
function openKeyWithPassword(keyPath: string, password?: string) {
  type Out = { label: string; code: number; out: string; err: string };
  const outs: Out[] = [];
  const last = () => outs[outs.length - 1]; 

  // pkcs8 DER -> PEM nocrypt (caso típico SAT)
  outs.push(tryOpenSSL(['pkcs8', '-inform', 'DER', '-in', keyPath, '-passin', `pass:${password}`, '-outform', 'PEM', '-nocrypt'], 'pkcs8-der'));
  if (last().code === 0 && /BEGIN (?:ENCRYPTED )?PRIVATE KEY/.test(last().out)) return { ok: true as const, outs };

  // pkcs8 PEM
  outs.push(tryOpenSSL(['pkcs8', '-inform', 'PEM', '-in', keyPath, '-passin', `pass:${password}`, '-outform', 'PEM', '-nocrypt'], 'pkcs8-pem'));
  if (last().code === 0 && /BEGIN PRIVATE KEY/.test(last().out)) return { ok: true as const, outs };

  // pkcs8 autodetect
  outs.push(tryOpenSSL(['pkcs8', '-in', keyPath, '-passin', `pass:${password}`, '-outform', 'PEM', '-nocrypt'], 'pkcs8-auto'));
  if (last().code === 0 && /BEGIN PRIVATE KEY/.test(last().out)) return { ok: true as const, outs };

  // pkey/rsa solo para validar lectura
  outs.push(tryOpenSSL(['pkey', '-in', keyPath, '-noout', '-text', '-passin', `pass:${password}`], 'pkey-text'));
  if (last().code === 0) return { ok: true as const, outs };

  outs.push(tryOpenSSL(['rsa', '-in', keyPath, '-noout', '-text', '-passin', `pass:${password}`], 'rsa-text'));
  if (last().code === 0) return { ok: true as const, outs };

  // Diagnóstico
  const combined = outs.map(o => `[${o.label}] code=${o.code}\n${o.err}`).join('\n---\n');
  const allMinusOne = outs.length > 0 && outs.every(o => o.code === -1);
  if (allMinusOne) {
    return { ok: false as const, reason: 'OPENSSL_NOT_AVAILABLE', detail: combined };
  }
  if (/bad decrypt|mac verify failure/i.test(combined)) {
    return { ok: false as const, reason: 'PASSWORD_WRONG', detail: combined };
  }
  return { ok: false as const, reason: 'FORMAT', detail: combined };
}


function getCertModulus(cerPath: string) {
  let r = runOpenSSLSync(['x509', '-in', cerPath, '-inform', 'DER', '-noout', '-modulus']);
  if (r.code !== 0) r = runOpenSSLSync(['x509', '-in', cerPath, '-noout', '-modulus']);
  if (r.code !== 0) return { ok: false as const, stderr: r.stderr };
  const m = r.stdout.match(/Modulus=([0-9A-F]+)\s*$/i);
  return m ? { ok: true as const, modulus: m[1].toUpperCase() } : { ok: false as const, stderr: 'No Modulus' };
}
function getKeyModulus(keyPath: string, password?: string) {
  let r = runOpenSSLSync(['pkey', '-in', keyPath, '-noout', '-modulus', '-passin', `pass:${password}`]);
  if (r.code !== 0) r = runOpenSSLSync(['rsa', '-in', keyPath, '-noout', '-modulus', '-passin', `pass:${password}`]);
  if (r.code !== 0) return { ok: false as const, stderr: r.stderr };
  const m = r.stdout.match(/Modulus=([0-9A-F]+)\s*$/i);
  return m ? { ok: true as const, modulus: m[1].toUpperCase() } : { ok: false as const, stderr: 'No Modulus' };
}

/* ==========================
   Heurística CSD vs FIEL
========================== */

function looksLikeCsd(certText: string, subjectLine: string): boolean {
  // Indicadores
  const strongIndicators = [
    /\bCSD\b/i, 
    /SELLO\s*DIGITAL/i, 
    /Sello\s*Digital/i,
    /OU\s*=\s*Sucursal\s*\d*/i,
    /OU\s*=\s*(SELLO|CSD)/i
  ];
  
  if (strongIndicators.some(rx => rx.test(subjectLine) || rx.test(certText))) {
    return true;
  }
  
  const hasKeyUsage = /Key Usage:.*Digital Signature.*Non Repudiation/is.test(certText);
  const hasExtendedKeyUsage = /Extended Key Usage:/i.test(certText);

  if (hasKeyUsage && !hasExtendedKeyUsage) {
    return true;
  }
  
  return false;
}

function looksLikeFiel(certText: string, subjectLine: string): boolean {

  const fielHints = [
    /FIRMA\s+ELECTR[ÓO]NICA/i, 
    /\bE\.?FIRMA\b/i, 
    /\bFIEL\b/i, 
    /USO\s*:\s*AUTENTICACI[ÓO]N/i,
    /TLS Web Client Authentication/i,  
    /Key Encipherment/i  
  ];
  
  return fielHints.some(rx => rx.test(subjectLine) || rx.test(certText));
}

/**
 * - JSON: { bucket, cerKey, keyKey, password } Postman
 */
export async function validarCsdHandler(req: Request, res: Response) {
  let cerPath = '';
  let keyPath = '';
  const errors: ValidationError[] = [];

  try {
    // Pre-flight: OpenSSL, para que corriga la ruta en el .env si esta mal o no esta instalado
    if (!checkOpenSSLAvailable()) {
      pushErr(errors, 'OPENSSL_NOT_AVAILABLE',
        `No se pudo ejecutar OpenSSL. Configura OPENSSL_BIN (p.ej. "C:\\\\Program Files\\\\OpenSSL-Win64\\\\bin\\\\openssl.exe") ` +
        `o agrega OpenSSL al PATH (en OpenSSL 3.x, activa provider 'legacy' si tu .key es antigua).`);
      return res.status(200).json({ ok: false, errors, csdInfo: null });
    }

    const isMultipart = !!req.headers['content-type']?.includes('multipart/form-data');
    let password = '';

    if (isMultipart) {
      const anyReq = req as any;
      const cerFile = anyReq.files?.cer?.[0] || anyReq.file?.cer;
      const keyFile = anyReq.files?.key?.[0] || anyReq.file?.key;
      password = anyReq.body?.password || '';

      if (!cerFile || !isCerFilename(cerFile.originalname)) {
        pushErr(errors, 'EXTENSION_INVALID', 'El archivo de certificado debe ser .cer');
      } else {
        cerPath = await mkTmpFile(cerFile.originalname, cerFile.buffer ?? await fs.readFile(cerFile.path));
      }
      if (!keyFile || !isKeyFilename(keyFile.originalname)) {
        pushErr(errors, 'EXTENSION_INVALID', 'El archivo de llave debe ser .key');
      } else {
        keyPath = await mkTmpFile(keyFile.originalname, keyFile.buffer ?? await fs.readFile(keyFile.path));
      }
    } else {
      const { bucket, cerKey, keyKey, password: passIn } = req.body || {};
      password = passIn || '';

      if (!bucket || !cerKey || !keyKey) {
        pushErr(errors, 'DOWNLOAD_ERROR', 'Faltan bucket/cerKey/keyKey para descargar desde S3.');
      } else {
        try {
          cerPath = await downloadFromS3(bucket, cerKey);
          keyPath = await downloadFromS3(bucket, keyKey);
        } catch (e: any) {
          pushErr(errors, 'DOWNLOAD_ERROR', 'No se pudieron descargar archivos desde S3.', e?.message);
        }
      }
      if (cerPath && !isCerFilename(cerPath)) pushErr(errors, 'EXTENSION_INVALID', 'El certificado debe ser .cer (no e.firma).');
      if (keyPath && !isKeyFilename(keyPath)) pushErr(errors, 'EXTENSION_INVALID', 'La llave debe ser .key.');
    }

    if (!password) pushErr(errors, 'UNKNOWN', 'La contraseña de la llave (.key) es obligatoria.');
    if (!cerPath || !keyPath) {
      return res.status(200).json({ ok: false, errors, csdInfo: null });
    }

    // Tamaño máx básico
    const [cerStat, keyStat] = [fssync.statSync(cerPath), fssync.statSync(keyPath)];
    if (cerStat.size > 4 * 1024 * 1024) pushErr(errors, 'SIZE_LIMIT', 'El .cer excede 4MB.');
    if (keyStat.size > 4 * 1024 * 1024) pushErr(errors, 'SIZE_LIMIT', 'El .key excede 4MB.');
    if (errors.some(e => e.code === 'SIZE_LIMIT')) {
      return res.status(200).json({ ok: false, errors, csdInfo: null });
    }

    // 1) Info del certificado
    const info = readCertInfo(cerPath);
    if (!info.ok) {
      pushErr(errors, 'CORRUPTED_CER', 'No se pudo leer el certificado.', (info as any).stderr);
      return res.status(200).json({ ok: false, errors, csdInfo: null });
    }
    const {
      text, subject, issuer, notBefore, notAfter,
      serialHex, noCertificado, sha256Thumbprint, rfc: rfcFromCert
    } = info as any;

    // 2) Vigencia
    const now = new Date();
    if (notBefore && now < notBefore) pushErr(errors, 'NOT_YET_VALID', `El certificado aún no es válido (desde ${notBefore.toISOString()}).`);
    if (notAfter && now > notAfter) pushErr(errors, 'EXPIRED_CERT', `El certificado está vencido desde ${notAfter.toISOString()}.`);

    // 3) Abrir key con password (muchas rutas)
    const open = openKeyWithPassword(keyPath, password);
    if (!open.ok) {
      if (open.reason === 'OPENSSL_NOT_AVAILABLE') {
        pushErr(errors, 'OPENSSL_NOT_AVAILABLE', 'OpenSSL no se pudo ejecutar en este entorno.', open.detail);
      } else if (open.reason === 'PASSWORD_WRONG') {
        pushErr(errors, 'PASSWORD_WRONG', 'Contraseña incorrecta para la llave privada.', open.detail);
      } else {
        pushErr(errors, 'CORRUPTED_KEY', 'La .key no es un PKCS#8/PKCS#1 válido (o cifrado legacy sin provider).', open.detail);
      }
      return res.status(200).json({
        ok: false,
        errors,
        csdInfo: {
          subject, issuer, rfc: rfcFromCert ?? null, noCertificado: noCertificado ?? serialHex ?? null,
          notBefore: notBefore ?? null, notAfter: notAfter ?? null, sha256Thumbprint: sha256Thumbprint ?? null,
          keyOpens: false, modulusMatch: null, isCsd: null
        }
      });
    }

    // 4) Modulus match
    const [mCert, mKey] = [getCertModulus(cerPath), getKeyModulus(keyPath, password)];
    let modulusMatch: boolean | null = null;
    if (mCert.ok && mKey.ok) {
      modulusMatch = (mCert as any).modulus === (mKey as any).modulus;
      if (!modulusMatch) pushErr(errors, 'MODULUS_MISMATCH', 'El certificado y la llave no forman pareja (modulos distinto).');
    } else {
      if (!mCert.ok) pushErr(errors, 'CORRUPTED_CER', 'No se pudo obtener el módulo del certificado.', (mCert as any).stderr);
      if (!mKey.ok) pushErr(errors, 'CORRUPTED_KEY', 'No se pudo obtener el módulo de la llave.', (mKey as any).stderr);
    }

    // 5) CSD vs FIEL (heurística MEJORADA)
    const isCsd = looksLikeCsd(text, subject);
    const isFiel = looksLikeFiel(text, subject);
    if (isFiel) pushErr(errors, 'NOT_CSD', 'El certificado parece ser e.firma (FIEL), no CSD.');

    // 6) Respuesta
    const payload = {
      ok: errors.length === 0,
      errors,
      csdInfo: {
        subject,
        issuer,
        rfc: rfcFromCert ?? null,
        noCertificado: noCertificado ?? serialHex ?? null,
        notBefore: notBefore ?? null,
        notAfter: notAfter ?? null,
        sha256Thumbprint: sha256Thumbprint ?? null,
        keyOpens: true,
        modulusMatch,
        isCsd
      }
    };

    return res.status(200).json(payload);
  } catch (e: any) {
    pushErr(errors, 'UNKNOWN', 'Error inesperado al validar CSD.', e?.message);
    return res.status(200).json({ ok: false, errors, csdInfo: null });
  } finally {
    await cleanupPaths(cerPath, keyPath);
  }
}
