import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DocumentUpload from '@/components/DocumentUpload'
import DocumentList from '@/components/DocumentList'

export default async function RoomPage({
  params,
}: {
  params: { projectId: string; roomId: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Verify room access
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*, projects!inner(*)')
    .eq('id', params.roomId)
    .eq('projects.user_id', user.id)
    .single()

  if (roomError || !room) {
    redirect(`/dashboard/${params.projectId}`)
  }

  // Fetch documents
  const { data: documents, error: documentsError } = await supabase
    .from('documents')
    .select('*')
    .eq('room_id', params.roomId)
    .order('uploaded_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/${params.projectId}`}
          className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
        >
          ← Back to {room.projects.name}
        </Link>
        <div className="flex justify-between items-center mt-4">
          <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
          <Link
            href={`/dashboard/${params.projectId}/${params.roomId}/meeting`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Start Meeting
          </Link>
        </div>
      </div>

      <div className="mb-8">
        <DocumentUpload roomId={params.roomId} />
      </div>

      {documentsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Error loading documents: {documentsError.message}
        </div>
      )}

      <DocumentList documents={documents || []} />
    </div>
  )
}

