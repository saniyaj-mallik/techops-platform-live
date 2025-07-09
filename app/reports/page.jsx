'use client';

import { useEffect, useState } from 'react';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/api/test/results')
      .then(res => res.json())
      .then(data => {
        setReports(data.results || []);
        if (data.results && data.results.length > 0) setSelected(data.results[0]);
      });
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Test Reports</h2>
        <ul className="space-y-2">
          {reports.map((report, idx) => (
            <li key={report._id || idx}>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg transition font-medium ${selected === report ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'}`}
                onClick={() => setSelected(report)}
              >
                {report.type} - {new Date(report.timestamp).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-8">
        {selected ? (
          <div className="max-w-xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Test Report</h1>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selected.type === 'Success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{selected.type}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(selected.timestamp).toLocaleString()}</span>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <img src={selected.imageUrl} alt={selected.type + ' screenshot'} className="w-full h-auto max-h-96 object-contain" />
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div><strong>Public ID:</strong> {selected.publicId}</div>
              <div><strong>Size:</strong> {selected.size} bytes</div>
              {selected.meta && selected.meta.cloudinary && selected.meta.cloudinary.secure_url && (
                <div><strong>Cloudinary URL:</strong> <a href={selected.meta.cloudinary.secure_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">View on Cloudinary</a></div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">No report selected.</div>
        )}
      </main>
    </div>
  );
}
