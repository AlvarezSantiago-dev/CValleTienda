export default function ReportesLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="h-8 w-32 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 w-20 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="h-12 bg-gray-50 animate-pulse" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 border-t border-gray-50 bg-gray-100/50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
