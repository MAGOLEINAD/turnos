import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string({ required_error: 'El email es requerido' }).email('Email invalido').min(1, 'El email es requerido'),
  password: z
    .string({ required_error: 'La contrasena es requerida' })
    .min(6, 'La contrasena debe tener al menos 6 caracteres')
    .max(100, 'La contrasena es demasiado larga'),
  publicSedeSlug: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: z.string({ required_error: 'El email es requerido' }).email('Email invalido').min(1, 'El email es requerido'),
  password: z
    .string({ required_error: 'La contrasena es requerida' })
    .min(8, 'La contrasena debe tener al menos 8 caracteres')
    .max(100, 'La contrasena es demasiado larga'),
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  apellido: z
    .string({ required_error: 'El apellido es requerido' })
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'El apellido es demasiado largo'),
  publicSedeSlug: z.string().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z.string({ required_error: 'El email es requerido' }).email('Email invalido').min(1, 'El email es requerido'),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z
      .string({ required_error: 'La contrasena es requerida' })
      .min(8, 'La contrasena debe tener al menos 8 caracteres')
      .max(100, 'La contrasena es demasiado larga'),
    confirmPassword: z.string({ required_error: 'Confirme su contrasena' }).min(1, 'Confirme su contrasena'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const updateProfileSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  apellido: z
    .string({ required_error: 'El apellido es requerido' })
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'El apellido es demasiado largo'),
  telefono: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        const cleaned = val.replace(/\D/g, '')
        return cleaned.length >= 10 && cleaned.length <= 13
      },
      { message: 'Telefono invalido' }
    ),
  avatar_url: z.string().url('URL invalida').optional().or(z.literal('')),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
