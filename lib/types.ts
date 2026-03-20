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
      sections: {
        Row: {
          id: string
          user_id: string
          column_id: 'col-today' | 'col-backlog'
          title: string
          collapsed: boolean
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          column_id: 'col-today' | 'col-backlog'
          title: string
          collapsed?: boolean
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          column_id?: 'col-today' | 'col-backlog'
          title?: string
          collapsed?: boolean
          position?: number
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          section_id: string
          text: string
          completed: boolean
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          section_id: string
          text: string
          completed?: boolean
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          section_id?: string
          text?: string
          completed?: boolean
          position?: number
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          user_id: string
          theme: 'light' | 'dark'
          updated_at: string
        }
        Insert: {
          user_id: string
          theme?: 'light' | 'dark'
          updated_at?: string
        }
        Update: {
          theme?: 'light' | 'dark'
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          event_date: string
          duration_minutes: number
          color: string
          all_day: boolean
          import_batch_id: string | null
          import_file_name: string | null
          imported_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string
          event_date: string
          duration_minutes?: number
          color?: string
          all_day?: boolean
          import_batch_id?: string | null
          import_file_name?: string | null
          imported_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string
          event_date?: string
          duration_minutes?: number
          color?: string
          all_day?: boolean
          import_batch_id?: string | null
          import_file_name?: string | null
          imported_at?: string | null
          updated_at?: string
        }
      }
    }
  }
}

export type Tables = Database['public']['Tables']
export type SectionsRow = Tables['sections']['Row']
export type TasksRow = Tables['tasks']['Row']
export type UserPreferencesRow = Tables['user_preferences']['Row']
export type EventsRow = Tables['events']['Row']
