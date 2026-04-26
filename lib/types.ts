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
          priority: 'none' | 'low' | 'medium' | 'high'
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
          priority?: 'none' | 'low' | 'medium' | 'high'
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
          priority?: 'none' | 'low' | 'medium' | 'high'
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
          end_time: string
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
          end_time?: string
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
          end_time?: string
          duration_minutes?: number
          color?: string
          all_day?: boolean
          import_batch_id?: string | null
          import_file_name?: string | null
          imported_at?: string | null
          updated_at?: string
        }
      }
      import_groups: {
        Row: {
          id: string
          batch_id: string
          user_id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          user_id: string
          name: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          color?: string
          updated_at?: string
        }
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          title: string
          duration_minutes: number
          started_at: string
          completed_at: string | null
          type: 'study' | 'break'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id?: string | null
          title?: string
          duration_minutes: number
          started_at?: string
          completed_at?: string | null
          type?: 'study' | 'break'
          created_at?: string
          updated_at?: string
        }
        Update: {
          task_id?: string | null
          title?: string
          duration_minutes?: number
          completed_at?: string | null
          type?: 'study' | 'break'
          updated_at?: string
        }
      }
      user_stats: {
        Row: {
          id: string
          user_id: string
          stat_name: string
          stat_value: Json
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          stat_name: string
          stat_value: Json
          last_updated?: string
        }
        Update: {
          stat_name?: string
          stat_value?: Json
          last_updated?: string
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
export type EventsInsert = Tables['events']['Insert']
export type EventsUpdate = Tables['events']['Update']
export type ImportGroupsRow = Tables['import_groups']['Row']
export type ImportGroupsInsert = Tables['import_groups']['Insert']
export type ImportGroupsUpdate = Tables['import_groups']['Update']
export type StudySessionsRow = Tables['study_sessions']['Row']
export type StudySessionsInsert = Tables['study_sessions']['Insert']
export type StudySessionsUpdate = Tables['study_sessions']['Update']
export type UserStatsRow = Tables['user_stats']['Row']
export type UserStatsInsert = Tables['user_stats']['Insert']
export type UserStatsUpdate = Tables['user_stats']['Update']

// Calendar event types
export type EventColor = 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink'
export type EventVariant = 'compact' | 'full' | 'month'

// Event with import group info
export interface EventWithGroup extends EventsRow {
  import_group?: {
    name: string
    color: string
  } | null
}

// Study session types
export type SessionType = 'study' | 'break'

export interface StreakData {
  current_streak: number
  best_streak: number
  last_study_date: string | null
  last_updated: string
}

export interface TimeMetricsData {
  today_minutes: number
  week_minutes: number
  total_minutes: number
  total_sessions: number
  last_updated: string
}

export interface HeatmapDataPoint {
  study_date: string
  total_minutes: number
  session_count: number
}

export interface ActiveSession {
  id: string
  task_id: string | null
  title: string
  started_at: string
  tasks?: Array<{ id: string; task_id: string; completed: boolean; task: { id: string; text: string } }>
}

// Session tasks junction table
export interface SessionTask {
  id: string
  session_id: string
  task_id: string
  completed: boolean
  position: number
  created_at: string
  updated_at: string
}

// Extended session with tasks
export interface StudySessionWithTasks extends StudySessionsRow {
  tasks?: Array<SessionTask & { task: { id: string; text: string } }>
}
