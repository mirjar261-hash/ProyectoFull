import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';

export const register = async (req: Request, res: Response) => {
  try {
    const { nombre, apellidos, telefono, correo, password, perfil, activo,validado,cambio_contraseña, sucursalId } = req.body;
    console.info('Solicitud de registro de usuario', { correo, sucursalId });
    const hashed = await bcrypt.hash(password, 10);

    const existing = await prisma.usuario.findUnique({
      where: { correo_activo: { correo, activo: 1 } }
    });
    if (existing) {
      return res.status(400).json({ error: 'El correo ya está en uso' });
    }
    const user = await prisma.usuario.create({
      data: {
        nombre,
        apellidos,
        telefono,
        correo,
        password: hashed,
        perfil,
        activo,
        validado,
        cambio_contraseña,
        sucursalId,
      },
    });
    
    if (perfil === "Administrador") {
      const adminCount = await prisma.usuario.count({
        where: {
          perfil: "Administrador",
          activo: 1,
          sucursalId: sucursalId
        }
      });

      if (adminCount > 0) {
        return res.status(400).json({ error: "Ya existe un administrador en esta sucursal" });
      }
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error al registrar usuario' });
  }
};

export const cambiarPassword = async (req: Request, res: Response): Promise<void> => {
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
};

export const editarUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, apellidos, correo, telefono, perfil, password, validado,cambio_contraseña } = req.body;
  

  try {
    const userId = parseInt(id);
    const current = await prisma.usuario.findUnique({ where: { id: userId }, select: { perfil: true } });
    const dataToUpdate: any = {
      nombre,
      apellidos,
      correo,
      telefono,
      perfil,
      validado,
      cambio_contraseña
    };

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

     const perfilChanged = perfil && current?.perfil !== perfil;

    const actualizado = await prisma.$transaction(async (tx) => {
      if (perfilChanged) {
        await tx.historialPermiso.deleteMany({ where: { usuarioId: userId } });
      }
      return tx.usuario.update({ where: { id: userId }, data: dataToUpdate });
    });
    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ error: 'Error al editar el usuario' });
  }
};


export const desactivarUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { activo: 0 },
    });

    res.json({ mensaje: 'Usuario desactivado' });
  } catch (err) {
    res.status(400).json({ error: 'Error al desactivar usuario' });
  }
};


export const obtenerUsuariosActivos = async (req: Request, res: Response) => {
  const sucursalId = req.user?.sucursalId;
  const usuarios = await prisma.usuario.findMany({
    where: { activo: 1, sucursalId: sucursalId}, 
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      correo: true,
      telefono: true,
      perfil: true,
      sucursalId: true,
    },
  });

  res.json(usuarios);
};

export const checkEmail = async (req: Request, res: Response) => {
  try {
    const correo = req.query.correo as string | undefined;
    if (!correo) {
      res.status(400).json({ error: 'Correo requerido' });
      return;
    }
    const usuario = await prisma.usuario.findUnique({ where: { correo_activo: { correo, activo: 1 } }
    });
    res.json({ exists: !!usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar correo' });
  }
};

