import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateRoomModal from '@/components/CreateRoomModal'

export default async function ProjectPage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    redirect('/dashboard')
  }

  // Fetch rooms
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
        >
          ← Back to Projects
        </Link>
        <div className="flex justify-between items-center mt-4">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <CreateRoomModal projectId={params.projectId} />
        </div>
      </div>

      {roomsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Error loading rooms: {roomsError.message}
        </div>
      )}

      {rooms && rooms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No rooms yet. Create your first room to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms?.map((room) => (
            <Link
              key={room.id}
              href={`/dashboard/${params.projectId}/${room.id}`}
              className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {room.name}
              </h2>
              <p className="text-sm text-gray-500">
                Created {new Date(room.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

