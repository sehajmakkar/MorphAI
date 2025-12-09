export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
        <p className="text-gray-600">
          There was an error with the authentication code. Please try signing in again.
        </p>
        <a
          href="/auth"
          className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go to Sign In
        </a>
      </div>
    </div>
  )
}

