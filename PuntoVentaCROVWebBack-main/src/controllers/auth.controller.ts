import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RequestHandler } from 'express';
import nodemailer from 'nodemailer';
import path from "path";
import { toUTC } from '../utils/date';
import prisma from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const login: RequestHandler = async (req, res) => {
  const { correo, password } = req.body;

  const user = await prisma.usuario.findUnique({
    where: { correo_activo: { correo, activo: 1 } }
  });
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Credenciales incorrectas' });
    return;
  }

  const token = jwt.sign(
    { 
        userId: user.id, 
        sucursalId: user.sucursalId 
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const sucursal = await prisma.sucursal.findUnique({
    where: { id: user.sucursalId },
    select: {
      empresa: {
        select: { fecha_vencimiento: true, token: true, id: true,activo:true }
      }
    }
  });

  let fechaVencimiento = sucursal?.empresa.fecha_vencimiento;
  const tokenEmpresa = sucursal?.empresa.token;
  const empresaId = sucursal?.empresa.id;
  const estatusEmpresa = sucursal?.empresa.activo;
  let requiresPaymentMethod = false;

  if (empresaId && fechaVencimiento && new Date(fechaVencimiento) <= new Date()) {
    try {
      const latestPayment = await prisma.payment.findFirst({
        where: { empresaId, status: 'succeeded' } as any,
        orderBy: { created: 'desc' },
      });

      requiresPaymentMethod = !latestPayment;
    } catch (error) {
      console.error('Error verifying payment intent on login:', error);
      requiresPaymentMethod = true;
    }
  }

  res.json({ token, user, fecha_vencimiento: fechaVencimiento, token_empresa: tokenEmpresa, id_empresa: empresaId, requires_payment_method: requiresPaymentMethod, estatusEmpresa: estatusEmpresa });
};

export const setup: RequestHandler = async (req, res) => {
  const { empresa, sucursal, usuario } = req.body;

  try {
    const nuevaEmpresa = await prisma.empresa.create({
      data: {
        nombre: empresa.nombre,
        fecha_vencimiento: toUTC(empresa.fecha_vencimiento),
        activo: empresa.activo,
        token: empresa.token,
      },
    });

    const { rfc, ...sucursalData } = sucursal;
    const nuevaSucursal = await prisma.sucursal.create({
      data: {
        ...sucursalData,
        empresaId: nuevaEmpresa.id,
      },
    });

    const hashed = await bcrypt.hash(usuario.password, 10);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        ...usuario,
        password: hashed,
        sucursalId: nuevaSucursal.id,
        validado: 1,
      },
    });

    // Asignar todos los permisos existentes al nuevo usuario
    const permisos = await prisma.permiso.findMany({ select: { id: true } });
    if (permisos.length) {
      await prisma.historialPermiso.createMany({
        data: permisos.map((p) => ({
          usuarioId: nuevoUsuario.id,
          permisoId: p.id,
          permitido: true,
        })),
        skipDuplicates: true,
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: nuevoUsuario.id,
        sucursalId: nuevaSucursal.id,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Enviar respuesta
    res.json({
      token,
      user: nuevoUsuario,
      empresa: nuevaEmpresa,
      sucursal: nuevaSucursal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la empresa y sus entidades relacionadas' });
  }
};


export const perfil: RequestHandler = async (req, res) => {
  try {
    // Asegúrate de que tu middleware `verifyToken` agregue `req.userId`
    const userId = (req as any).userId;

    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        nombre: true,
        correo: true,
        perfil: true,
        sucursalId: true,
        sucursal: {
          select: {
            nombre_comercial: true,
          },
        },
      },
    });

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

export const sendCode: RequestHandler = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email requerido' });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Código de verificación',
      text: `Tu código de verificación es ${code}`,
    }).catch((err: unknown) => console.error('Error enviando correo de verificación:', err));

    res.json({ code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al enviar el código' });
  }
};


export const changePassword: RequestHandler = async (req, res) => { //***** 
  const userId = req.user?.userId;
  const { actual, nueva } = req.body;

  if (!userId || !actual || !nueva) {
    res.status(400).json({ error: 'Datos incompletos' });
    return;
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const valid = await bcrypt.compare(actual, usuario.password);
  if (!valid) {
    res.status(401).json({ error: 'Contraseña actual incorrecta' });
    return;
  }

  const hashed = await bcrypt.hash(nueva, 10);
  await prisma.usuario.update({
    where: { id: userId },
    data: { password: hashed },
  });

  res.json({ mensaje: 'Contraseña actualizada correctamente' });
};//*************** 


export const sendWelcome: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email requerido' });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const html = `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <img src="cid:logo" alt="CROV" style="max-width: 150px;" />
    <h2>Bienvenido a Punto de Venta CROV Web</h2>
    <p>Tu cuenta ha sido creada correctamente. Utiliza las siguientes credenciales para iniciar sesi&oacute;n:</p>
    <ul>
      <li>Usuario: <strong>${email}</strong></li>
      <li>Contrase&ntilde;a: <strong>${password || '123456'}</strong></li>
    </ul>
    <p>Te recomendamos cambiar tu contrase&ntilde;a despu&eacute;s de iniciar sesi&oacute;n.</p>
  </div>`;

  try {
    transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Bienvenido a Punto de Venta CROV Web',
      html,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(__dirname, '../../assets/logo.png'),
          cid: 'logo',
        },
      ],
    }).catch((err: unknown) => console.error('Error enviando correo de bienvenida:', err));

    res.json({ message: 'Correo enviado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al enviar el correo' });
  }
};

export const resetPassword: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son requeridos' });
    return;
  }

  try {
    const user = await prisma.usuario.findUnique({
      where: { correo_activo: { correo: email, activo: 1 } }
    });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.usuario.update({
      where: { correo_activo: { correo: email, activo: 1 } },
      data: { password: hashed },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
};

