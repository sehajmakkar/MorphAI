'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Decision {
  id: string
  message: string
  created_at: string
}

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
}

export default function MeetingSidebar({ roomId }: { roomId: string }) {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    fetchData()

    // Set up real-time subscriptions
    const decisionsChannel = supabase
      .channel(`decisions:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).summary_type === 'decision') {
            fetchDecisions()
          }
        }
      )
      .subscribe()

    const tasksChannel = supabase
      .channel(`tasks:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(decisionsChannel)
      supabase.removeChannel(tasksChannel)
    }
  }, [roomId])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchDecisions(), fetchTasks()])
    setLoading(false)
  }

  const fetchDecisions = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('id, message, created_at')
      .eq('room_id', roomId)
      .eq('summary_type', 'decision')
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setDecisions(data as Decision[])
    }
  }

  const fetchTasks = async () => {
    // Tasks table will be created in Phase 4, so this is a placeholder
    // For now, we'll check if the table exists
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, description, status, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data && !error) {
      setTasks(data as Task[])
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Meeting Notes</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Decisions Section */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Decisions
          </h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : decisions.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No decisions yet</p>
          ) : (
            <div className="space-y-3">
              {decisions.map((decision) => (
                <div
                  key={decision.id}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <p className="text-sm text-gray-900">{decision.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(decision.created_at).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Tasks
          </h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No tasks yet</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <h4 className="text-sm font-medium text-gray-900">
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-gray-600 mt-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : task.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {task.status}
                    </span>
                    <p className="text-xs text-gray-500">
                      {new Date(task.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

