import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'
import type { StreakData, TimeMetricsData } from '@/lib/types'

// GET - Fetch user statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statType = searchParams.get('type') || 'all' // 'streak', 'time', 'heatmap', or 'all'

    const result: any = {
      success: true,
    }

    // Fetch streak data
    if (statType === 'all' || statType === 'streak') {
      const { data: streakData } = await supabase
        .from('user_stats')
        .select('stat_value')
        .eq('user_id', user.id)
        .eq('stat_name', 'streak')
        .single()

      result.streak = (streakData as any)?.stat_value as StreakData || {
        current_streak: 0,
        best_streak: 0,
        last_study_date: null,
        last_updated: new Date().toISOString(),
      }
    }

    // Fetch time metrics
    if (statType === 'all' || statType === 'time') {
      const { data: timeData } = await supabase
        .from('user_stats')
        .select('stat_value')
        .eq('user_id', user.id)
        .eq('stat_name', 'time_metrics')
        .single()

      result.timeMetrics = (timeData as any)?.stat_value as TimeMetricsData || {
        today_minutes: 0,
        week_minutes: 0,
        total_minutes: 0,
        total_sessions: 0,
        last_updated: new Date().toISOString(),
      }
    }

    // Fetch heatmap data (direct query to study_sessions)
    if (statType === 'all' || statType === 'heatmap') {
      const { data: heatmapData, error } = await (supabase.rpc as any)('get_heatmap_data', {
        p_user_id: user.id,
      })

      if (!error && heatmapData) {
        result.heatmap = heatmapData
      } else {
        result.heatmap = []
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching study stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch study stats', details: error?.message },
      { status: 500 }
    )
  }
}
