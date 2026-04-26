/**
 * Discord Bot Service Layer
 * Handles all Discord-specific operations and business logic
 */

import { createClient } from '@supabase/supabase-js'

// Create Supabase client for bot (runs outside Next.js context)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export interface DiscordConnection {
  discord_user_id: string
  user_id: string
  linked_at: string
  last_linked_at: string
}

export interface Task {
  id: string
  text: string
  completed: boolean
  section_id: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  title: string
  user_id: string
  order_index: number
}

export interface TaskStats {
  total_tasks: number
  completed_tasks: number
  completion_rate: number
  completed_this_week: number
  remaining_tasks: number
}

/**
 * Get user ID from Discord user ID
 */
export async function getUserIdFromDiscord(discordUserId: string): Promise<string | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('discord_connections')
    .select('user_id')
    .eq('discord_user_id', discordUserId)
    .single()

  if (error || !data) {
    return null
  }

  return data.user_id
}

/**
 * Link Discord account to user using token
 */
export async function linkDiscordAccount(discordUserId: string, token: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  console.log('Attempting to link Discord account...')
  console.log('Discord User ID:', discordUserId)
  console.log('Token:', token)
  console.log('Token length:', token.length)

  // Verify token and get user_id
  const { data: tokenData, error: tokenError } = await supabase
    .from('user_preferences')
    .select('user_id')
    .eq('discord_link_token', token)
    .single()

  console.log('Token query result:')
  console.log('- Error:', tokenError)
  console.log('- Data:', tokenData)

  if (tokenError || !tokenData) {
    console.log('Token validation failed')
    return false
  }

  console.log('Token validated, user_id:', tokenData.user_id)

  // Create Discord connection
  const { error: linkError } = await supabase
    .from('discord_connections')
    .upsert({
      discord_user_id: discordUserId,
      user_id: tokenData.user_id,
      last_linked_at: new Date().toISOString(),
    })

  console.log('Discord connection result:')
  console.log('- Error:', linkError)

  if (linkError) {
    console.log('Failed to create Discord connection')
    return false
  }

  console.log('Discord connection created successfully')

  // Clear the token
  await supabase
    .from('user_preferences')
    .update({ discord_link_token: null })
    .eq('user_id', tokenData.user_id)

  console.log('Token cleared')

  return true
}

/**
 * Create a new task for user
 */
export async function createTask(userId: string, text: string, sectionTitle: string = 'To Do Today'): Promise<Task | null> {
  const supabase = getSupabaseClient()

  // Get the section
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('*')
    .eq('user_id', userId)
    .eq('title', sectionTitle)
    .single()

  if (sectionError || !section) {
    return null
  }

  // Create the task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      section_id: section.id,
      text,
      completed: false,
    })
    .select()
    .single()

  if (taskError || !task) {
    return null
  }

  return task
}

/**
 * Get all tasks for user
 */
export async function getTasks(userId: string, sectionFilter?: 'today' | 'backlog' | 'all'): Promise<{
  sections: Section[]
  tasks: Task[]
} | null> {
  const supabase = getSupabaseClient()

  let sectionQuery = supabase
    .from('sections')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true })

  const { data: sections, error: sectionsError } = await sectionQuery

  if (sectionsError || !sections) {
    return null
  }

  const sectionIds = sections.map(s => s.id)

  let taskQuery = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .in('section_id', sectionIds)
    .order('created_at', { ascending: true })

  // Filter by section if specified
  if (sectionFilter && sectionFilter !== 'all') {
    const todaySection = sections.find(s => s.title.toLowerCase().includes('today'))
    const backlogSection = sections.find(s => s.title.toLowerCase().includes('backlog'))

    if (sectionFilter === 'today' && todaySection) {
      taskQuery = taskQuery.eq('section_id', todaySection.id)
    } else if (sectionFilter === 'backlog' && backlogSection) {
      taskQuery = taskQuery.eq('section_id', backlogSection.id)
    }
  }

  const { data: tasks, error: tasksError } = await taskQuery

  if (tasksError || !tasks) {
    return { sections, tasks: [] }
  }

  return { sections, tasks }
}

/**
 * Complete a task
 */
export async function completeTask(userId: string, taskIdOrNumber: string): Promise<Task | null> {
  const supabase = getSupabaseClient()

  // First try to find by task ID
  let { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('id', taskIdOrNumber)
    .single()

  // If not found by ID, try to find by position in list
  if (error || !task) {
    const taskNumber = parseInt(taskIdOrNumber)
    if (!isNaN(taskNumber)) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .order('created_at', { ascending: true })

      if (tasks && tasks[taskNumber - 1]) {
        task = tasks[taskNumber - 1]
      }
    }
  }

  if (!task) {
    return null
  }

  // Mark as completed
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({ completed: true })
    .eq('id', task.id)
    .select()
    .single()

  if (updateError || !updatedTask) {
    return null
  }

  return updatedTask
}

/**
 * Delete a task
 */
export async function deleteTask(userId: string, taskIdOrNumber: string): Promise<Task | null> {
  const supabase = getSupabaseClient()

  // First try to find by task ID
  let { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('id', taskIdOrNumber)
    .single()

  // If not found by ID, try to find by position in list
  if (error || !task) {
    const taskNumber = parseInt(taskIdOrNumber)
    if (!isNaN(taskNumber)) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .order('created_at', { ascending: true })

      if (tasks && tasks[taskNumber - 1]) {
        task = tasks[taskNumber - 1]
      }
    }
  }

  if (!task) {
    return null
  }

  // Delete the task
  const { error: deleteError } = await supabase
    .from('tasks')
    .delete()
    .eq('id', task.id)

  if (deleteError) {
    return null
  }

  return task
}

/**
 * Get task statistics for user
 */
export async function getTaskStats(userId: string): Promise<TaskStats | null> {
  const supabase = getSupabaseClient()

  // Get total tasks
  const { count: totalTasks, error: totalError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (totalError) {
    return null
  }

  // Get completed tasks
  const { count: completedTasks, error: completedError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)

  if (completedError) {
    return null
  }

  // Get tasks completed this week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { count: completedThisWeek, error: weekError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('updated_at', weekAgo.toISOString())

  if (weekError) {
    return null
  }

  const total = totalTasks || 0
  const completed = completedTasks || 0
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    total_tasks: total,
    completed_tasks: completed,
    completion_rate: completionRate,
    completed_this_week: completedThisWeek || 0,
    remaining_tasks: total - completed,
  }
}
