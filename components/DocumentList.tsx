'use client'

interface Document {
  id: string
  file_name: string
  file_type: string
  file_size: number | null
  uploaded_at: string
}

export default function DocumentList({ documents }: { documents: Document[] }) {
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-gray-500 text-center">No documents uploaded yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold">Documents</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {documents.map((doc) => (
          <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{doc.file_name}</h3>
                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                  <span className="uppercase">{doc.file_type}</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

