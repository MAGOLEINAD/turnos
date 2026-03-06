/**
 * Tipos de base de datos generados desde Supabase
 *
 * IMPORTANTE: Este archivo debe ser regenerado cuando el esquema de DB cambie.
 * Comando: npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/database.types.ts
 *
 * Por ahora, definimos tipos básicos. Los tipos completos se generarán desde Supabase CLI.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizaciones: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          logo_url: string | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          logo_url?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          logo_url?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
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
      }
      // TODO: Agregar tipos para todas las demás tablas
      // Este archivo será regenerado desde Supabase CLI con todos los tipos
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
      estado_reserva: 'confirmada' | 'cancelada' | 'completada'
      estado_pago: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | 'reembolsado'
      tipo_autorizacion_profesor: 'solo_individual' | 'solo_grupal' | 'ambas'
      frecuencia_horario: 'semanal_1' | 'semanal_2' | 'semanal_3'
      dia_semana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
    }
  }
}
