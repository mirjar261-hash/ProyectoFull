import { Request, Response } from 'express';
import { TipoArchivo } from '@prisma/client';
import nodemailer from 'nodemailer';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import prisma from '../utils/prisma';

const s3 = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const streamToBuffer = async (stream: any) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const parseS3Url = (url: string) => {
  if (/^https?:\/\//.test(url)) {
    const { hostname, pathname } = new URL(url);
    const key = pathname.replace(/^\//, '');
    const bucket = hostname.split('.')[0];
    return { bucket, key };
  }
  const key = url.replace(/^\//, '');
  const bucket = key.startsWith('users/')
    ? (process.env.AWS_S3_BUCKET2 as string)
    : (process.env.AWS_S3_BUCKET as string);
  return { bucket, key };
};

const collectSolicitudFiles = (solicitud: any) => {
  const files: { tipo: string; url: string }[] = [];
  if (solicitud.ineFrente)
    files.push({ tipo: 'ineFrente', url: solicitud.ineFrente });
  if (solicitud.ineReverso)
    files.push({ tipo: 'ineReverso', url: solicitud.ineReverso });
  if (solicitud.comprobanteDomicilio)
    files.push({ tipo: 'comprobanteDomicilio', url: solicitud.comprobanteDomicilio });
  if (solicitud.constanciaFiscal)
    files.push({ tipo: 'constanciaFiscal', url: solicitud.constanciaFiscal });
  if (solicitud.estadocuenta)
    files.push({ tipo: 'estadocuenta', url: solicitud.estadocuenta });
  if (solicitud.archivos)
    files.push(
      ...solicitud.archivos.map((a: { tipo: string; url: string }) => ({
        tipo: a.tipo,
        url: a.url,
      }))
    );
  return files;
};

const obtenerNombreEmpresaPorSucursal = async (
  sucursalId?: number
): Promise<string | undefined> => {
  if (!sucursalId) return undefined;
  const sucursal = await prisma.sucursal.findUnique({
    where: { id: sucursalId },
    select: { empresa: { select: { nombre: true } } },
  });
  return sucursal?.empresa?.nombre;
};

const sendSolicitudEmail = async (solicitud: any, empresaNombre?: string) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const fileEntries = collectSolicitudFiles(solicitud);
  const files = await Promise.all(
    fileEntries.map(async (a) => {
      const { bucket, key } = parseS3Url(a.url);
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const content = await streamToBuffer(obj.Body as any);
      const ext = key.includes('.') ? `.${key.split('.').pop()}` : '';
      const filename = `${a.tipo}${ext}`;
      return { tipo: a.tipo, filename, content };
    })
  );


  const attachments = files.map((f) => ({ filename: f.filename, content: f.content }));

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
   to: [process.env.SPIN_NEGOCIOS_EMAIL, process.env.SPIN_CROV]
      .filter(v => v && v.trim())
      .join(', ') || process.env.SMTP_FROM,
    subject: `Nueva solicitud Spin Negocios${
      empresaNombre ? ` - ${empresaNombre}` : ''
    }`,
    html: `
        <!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Notificación interna · Solicitud SPIN Negocios</title>
  <style>
    /* Responsive para apps Gmail */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .p-24 { padding: 16px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f6f7f9;">
  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;">
    <tr>
      <td align="center" style="padding:24px;">
        <!-- Card -->
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; background:#ffffff; border-radius:8px; border:1px solid #eef2f7;">
          <!-- Header -->
          <tr>
            <td align="center" bgcolor="#fff7f3" style="background:#fff7f3; border-bottom:1px solid #ffe6dc; padding:24px;">
              <h1 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:22px; line-height:1.3; color:#EA580C;">
                Aviso: Solicitud SPIN Negocios
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="p-24" style="padding:24px; font-family:Arial, Helvetica, sans-serif; color:#111827; font-size:14px; line-height:1.6;">
              <!-- Preheader invisible (mejora el preview en inbox) -->
              <span style="display:none !important; visibility:hidden; opacity:0; mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0; overflow:hidden;">
                Nueva solicitud para SPIN Negocios: revisión interna y adjuntos.
              </span>

              <p style="margin:0 0 12px;">Hola estimado/a,</p>

              <p style="margin:0 0 12px;">
                Les informamos que se registró una <strong>solicitud para SPIN Negocios</strong> a fin de <strong>contratar servicios de terminales de tarjeta</strong>. A continuación, presentamos los datos proporcionados y la relación de archivos adjuntos para su revisión y seguimiento interno.
              </p>
              <p style="margin:0 0 16px;">
                Este aviso se envía a los correos internos designados y <strong>no</strong> se envía al correo del solicitante.
              </p>

              <!-- Info Table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:8px 0 16px; border:1px solid #f3f4f6;">
                <thead>
                  <tr>
                    <th align="left" bgcolor="#fff1eb" style="padding:10px 12px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:.3px; background:#fff1eb; color:#EA580C; border-bottom:1px solid #f3b79f;">
                      Campo
                    </th>
                    <th align="left" bgcolor="#fff1eb" style="padding:10px 12px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:.3px; background:#fff1eb; color:#EA580C; border-bottom:1px solid #f3b79f;">
                      Detalle
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding:10px 12px; border-bottom:1px solid #f3f4f6;">Solicitante</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #f3f4f6;">${solicitud.nombreCompleto || ''}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px; border-bottom:1px solid #f3f4f6;">Correo Electrónico</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #f3f4f6;">${solicitud.correoElectronico || ''}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px; border-bottom:1px solid #f3f4f6;">Empresa / Negocio</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #f3f4f6;">${empresaNombre}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px; border-bottom:1px solid #f3f4f6;">Contacto</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #f3f4f6;">${solicitud.telefono || ''}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px; border-bottom:1px solid #f3f4f6;">Cantidad de terminales que solicita</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #f3f4f6;">${solicitud.numeroTerminales || ''}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Attachments -->
              <p style="margin:0 0 8px; font-weight:bold; color:#EA580C;">Archivos adjuntos</p>
              <ul style="margin:0 0 16px 18px; padding:0; color:#374151;">
                <li>Identificación oficial (ambos lados)</li>
                <li>Comprobante de domicilio</li>
                <li>Constancia de situación fiscal</li>
                <li>2 fotos del interior del negocio</li>
                <li>2 fotos del exterior del negocio</li>
                <li>Estado de cuenta</li>
              </ul>

              <p style="margin:0 0 16px; color:#4b5563;">
                Para continuar con el proceso, les pedimos validar la información y confirmar la recepción de los adjuntos. En caso de requerir información adicional, con gusto la gestionamos.
              </p>

              <hr style="border:none; border-top:1px solid #e5e7eb; margin:16px 0;" />

              <p style="margin:0; font-size:12px; color:#6b7280;">
                Este mensaje fue generado automáticamente desde
                <a href="https://puntoventacrov.com/" target="_blank" rel="noopener noreferrer" style="color:#EA580C; text-decoration:underline;">CROV Punto de Venta Web</a>. Les agradecemos su atención.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="#f9fafb" style="padding:16px 24px; background:#f9fafb; border-top:1px solid #eef2f7; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#6b7280;">
              © <span style="white-space:nowrap;">2025 CROV</span>. Todos los derechos reservados.
              <br />
              <a href="https://puntoventacrov.com/" target="_blank" rel="noopener noreferrer" style="color:#EA580C; text-decoration:underline;">Sitio web</a>
            </td>
          </tr>
        </table>
        <!-- /Card -->
      </td>
    </tr>
  </table>
</body>
</html>


    `,
    attachments,
  });
};
export const crearSolicitud = async (req: Request, res: Response) => {
  try {
    const {
      ineFrente,
      ineReverso,
      comprobanteDomicilio,
      constanciaFiscal,
      estadocuenta,
      correoElectronico,
      linkRedSocial,
      nombreCompleto,
      telefono,
      numeroTerminales,
      activo,
      archivos,
    } = req.body;

    const solicitud = await prisma.solicitudSpinNegocios.create({
      data: {
        ineFrente: ineFrente || null,
        ineReverso: ineReverso || null,
        comprobanteDomicilio: comprobanteDomicilio || null,
        constanciaFiscal: constanciaFiscal || null,
        estadocuenta: estadocuenta || null,
        correoElectronico: correoElectronico || null,
        linkRedSocial: linkRedSocial || null,
        nombreCompleto: nombreCompleto || null,
        telefono: telefono || null,
        numeroTerminales: numeroTerminales || null,
        activo: activo !== undefined ? Number(activo) : undefined,
        archivos: archivos
          ? {
              create: (archivos as { tipo: TipoArchivo; url: string }[]).map(
                (a) => ({ tipo: a.tipo, url: a.url })
              ),
            }
          : undefined,
      },
      include: { archivos: true },
    });

    res.json(solicitud);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la solicitud' });
  }
};

export const editarSolicitud = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const {
      ineFrente,
      ineReverso,
      comprobanteDomicilio,
      constanciaFiscal,
      estadocuenta,
      correoElectronico,
      linkRedSocial,
      nombreCompleto,
      telefono,
      numeroTerminales,
      activo,
       archivos: archivosNuevos,
    } = req.body;

    const data: any = {
      ineFrente: ineFrente || null,
      ineReverso: ineReverso || null,
      comprobanteDomicilio: comprobanteDomicilio || null,
      constanciaFiscal: constanciaFiscal || null,
      estadocuenta: estadocuenta || null,
      correoElectronico: correoElectronico || null,
      linkRedSocial: linkRedSocial || null,
      nombreCompleto: nombreCompleto || null,
      telefono: telefono || null,
      numeroTerminales: numeroTerminales || null,
      activo: activo !== undefined ? Number(activo) : undefined,
    };

   if (archivosNuevos) {
      data.archivos = {
        deleteMany: {},
         create: (archivosNuevos as { tipo: TipoArchivo; url: string }[]).map(
          (a) => ({
            tipo: a.tipo,
            url: a.url,
          })
        ),
      };
    }

    const solicitud = await prisma.solicitudSpinNegocios.update({
      where: { id },
      data,
      include: { archivos: true },
    });

    const fileChanged =
      ineFrente !== undefined ||
      ineReverso !== undefined ||
      comprobanteDomicilio !== undefined ||
      constanciaFiscal !== undefined ||
      estadocuenta !== undefined ||
      archivosNuevos !== undefined;

    if (fileChanged) {
      const empresaNombre = await obtenerNombreEmpresaPorSucursal(
        req.user?.sucursalId
      );
      await sendSolicitudEmail(solicitud, empresaNombre);
    }
    
    res.json(solicitud);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al editar la solicitud' });
  }
};

export const enviarSolicitudCorreo = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const solicitud = await prisma.solicitudSpinNegocios.findUnique({
      where: { id },
      include: { archivos: true },
    });

    if (!solicitud) {
      res.status(404).json({ error: 'Solicitud no encontrada' });
      return;
    }

    await sendSolicitudEmail(solicitud);

    res.json({ mensaje: 'Correo enviado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
};

export const obtenerSolicitudesActivas = async (_req: Request, res: Response) => {
  try {
    const solicitudes = await prisma.solicitudSpinNegocios.findMany({
      where: { activo: 1 },
      include: { archivos: true },
    });
    res.json(solicitudes);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: 'Error al obtener las solicitudes activas' });
  }
};
