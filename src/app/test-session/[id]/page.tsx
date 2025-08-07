"use client";

export default function TestPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-content-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Page</h1>
        <p className="text-gray-600 mb-6">
          ID: {params.id}
        </p>
        <p className="text-green-600">
          ✅ Test routing is working!
        </p>
      </div>
    </div>
  );
}
