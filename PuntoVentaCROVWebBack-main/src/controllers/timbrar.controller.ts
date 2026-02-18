import type { Request, Response } from 'express';
import axios from 'axios';

const SF_ENV_DEFAULT = process.env.SF_ENV_DEFAULT === 'prod' ? 'prod' : 'test';
const SF_USER = process.env.SF_USER || 'testing@solucionfactible.com';
const SF_PASS = process.env.SF_PASS || 'timbrado.SF.16672';
const SF_TIMBRADO_TEST = process.env.SF_TIMBRADO_TEST || 'https://testing.solucionfactible.com/ws/services/Timbrado';
const SF_TIMBRADO_PROD = process.env.SF_TIMBRADO_PROD || 'https://solucionfactible.com/ws/services/Timbrado';

/** Construye el sobre SOAP */
function buildTimbrarEnvelope(user: string, pass: string, cfdiXmlBase64: string, zip = false) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <ns:timbrar xmlns:ns="http://timbrado.ws.cfdi.solucionfactible.com">
      <usuario>${escapeXml(user)}</usuario>
      <password>${escapeXml(pass)}</password>
      <cfdi>${cfdiXmlBase64}</cfdi>
      <ZIP>${zip ? 'true' : 'false'}</ZIP>
    </ns:timbrar>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/** Escapa caracteres XML básicos */
function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Helpers de parsing muy específicos al XML de respuesta del PAC */
function extractTag(text: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

/** Busca dentro del bloque <resultados>... </resultados> los campos del CFDI timbrado */
function parseResultadosBlock(xml: string) {

  const blockMatch = xml.match(/<resultados[^>]*>([\s\S]*?)<\/resultados>/i);
  const block = blockMatch ? blockMatch[1] : '';

  // Algunos tags pueden venir con prefijos (ax23:uuid). Buscamos sin prefijo:
  const get = (t: string) => {
    const re = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${t}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${t}>`, 'i');
    const m = block.match(re);
    return m ? m[1].trim() : null;
  };

  return {
    status: get('status'),
    mensaje: get('mensaje'),
    uuid: get('uuid'),
    versionTFD: get('versionTFD'),
    fechaTimbrado: get('fechaTimbrado'),
    selloSAT: get('selloSAT'),
    certificadoSAT: get('certificadoSAT'),
    cadenaOriginal: get('cadenaOriginal'),
    cfdiTimbradoBase64: get('cfdiTimbrado'),
    qrCodePngBase64: get('qrCode'),
  };
}

/** Decodifica base64 a string UTF-8 (XML) con try/catch */
function b64ToUtf8(b64?: string | null) {
  if (!b64) return null;
  try {
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export async function timbrarFactura(req: Request, res: Response) {
  try {
    const { env, zip, user, pass } = req.body || {};
    const xmlRaw: string | undefined = req.body?.xml;
    const xmlB64: string | undefined = req.body?.xmlB64;

    let xmlStr: string | null = null;
    if (typeof xmlRaw === 'string' && xmlRaw.includes('<cfdi:Comprobante')) {
      xmlStr = xmlRaw;
    } else if (typeof xmlB64 === 'string') {
      try { xmlStr = Buffer.from(xmlB64, 'base64').toString('utf8'); } catch { }
    }

    if (!xmlStr || xmlStr.indexOf('<cfdi:Comprobante') === -1) {
      return res.status(400).json({ ok: false, error: 'XML CFDI inválido o no proporcionado (xml o xmlB64).' });
    }

    const targetEnv = env === 'prod' ? 'prod' : (env === 'test' ? 'test' : SF_ENV_DEFAULT);
    const endpoint = targetEnv === 'prod' ? SF_TIMBRADO_PROD : SF_TIMBRADO_TEST;
    const usuario = (user && String(user)) || SF_USER;
    const password = (pass && String(pass)) || SF_PASS;

    const cfdiXmlBase64 = Buffer.from(xmlStr, 'utf8').toString('base64');
    const soap = buildTimbrarEnvelope(usuario, password, cfdiXmlBase64, !!zip);

    const { data: responseRaw } = await axios.post<string>(endpoint, soap, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      timeout: 30000,
      // Nota: no se requiere SOAPAction para este WS
      validateStatus: () => true,
    });

    // Extrae encabezado de CFDICertificacion
    const status = extractTag(responseRaw, '(?:[a-zA-Z0-9_]+:)?status');
    const mensaje = extractTag(responseRaw, '(?:[a-zA-Z0-9_]+:)?mensaje');

    // Extrae el primer resultado (lo usual es 1 CFDI por request)
    const r = parseResultadosBlock(responseRaw);

    // Si viene el cfdiTimbrado, lo decodificamos a XML legible
    const xmlTimbrado = b64ToUtf8(r.cfdiTimbradoBase64);

    const ok =
      (status === '200' || status === 'OK' || status === 'Success') &&
      (!!r.uuid || !!xmlTimbrado);

    // Se puede guardar xmlTimbrado en BD / S3 aquí, o regresarlo directo
    return res.json({
      ok,
      ambiente: targetEnv,
      endpoint,
      status: status || null,
      mensaje: mensaje || null,
      uuid: r.uuid || null,
      versionTFD: r.versionTFD || null,
      fechaTimbrado: r.fechaTimbrado || null,
      selloSAT: r.selloSAT || null,
      certificadoSAT: r.certificadoSAT || null,
      cadenaOriginal: r.cadenaOriginal || null,
      xmlTimbrado: xmlTimbrado || null,
      rawSoap: process.env.EXPOSE_RAW_SOAP === '1' ? responseRaw : undefined,
    });
  } catch (error: any) {
    const msg =
      error?.response?.data?.toString?.() ||
      error?.message ||
      'Error desconocido al llamar al WS de timbrado.';
    return res.status(500).json({ ok: false, error: msg });
  }
}
