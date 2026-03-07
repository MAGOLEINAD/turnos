/**
 * Tipos de base de datos generados desde Supabase
 *
 * IMPORTANTE: Este archivo debe ser regenerado cuando el esquema de DB cambie.
 * Comando: npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/database.types.ts
 *
 * Mientras tanto, mantenemos tipos explícitos para tablas críticas y un fallback
 * para evitar que el resto de tablas quede inferido como never.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type UnknownTable = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      organizaciones: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          icono: string | null
          logo_url: string | null
          admin_usuario_id: string | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          icono?: string | null
          logo_url?: string | null
          admin_usuario_id?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          icono?: string | null
          logo_url?: string | null
          admin_usuario_id?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sedes: {
        Row: {
          id: string
          organizacion_id: string
          nombre: string
          slug: string
          direccion: string | null
          telefono: string | null
          email: string | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organizacion_id: string
          nombre: string
          slug: string
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organizacion_id?: string
          nombre?: string
          slug?: string
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      [key: string]: UnknownTable
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      rol_usuario: 'super_admin' | 'admin' | 'profesor' | 'alumno'
      tipo_reserva: 'individual' | 'grupal'
      estado_reserva: 'confirmada' | 'cancelada' | 'completada' | 'primera_clase'
      estado_pago: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | 'reembolsado'
      tipo_autorizacion_profesor: 'solo_individual' | 'solo_grupal' | 'ambas'
      frecuencia_horario: 'semanal_1' | 'semanal_2' | 'semanal_3'
      dia_semana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
    }
  }
}
