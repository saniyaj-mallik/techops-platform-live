'use client';

import TestRunner from "@/components/TestRunner";
import { useEffect, useState } from "react";

export default function Home() {
  const [lastResult, setLastResult] = useState(null);

  // Handler to update lastResult from TestRunner
  const handleTestComplete = (result) => {
    if (result && result.success) {
      setLastResult({
        success: result.success,
        imageUrl: result.imageUrl,
        error: null,
        timestamp: new Date().toISOString(),
      });
    } else if (result && result.error) {
      setLastResult({
        success: false,
        imageUrl: result.imageUrl || null,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    fetch("/api/test/results")
      .then((res) => res.json())
      .then((data) => setLastResult(data?.lastRun || null));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col lg:flex-row gap-8 w-full">
          {/* Test Runner Section */}
          <div className="flex-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  WordPress Login Test
                </h2>
              </div>
              <TestRunner onTestComplete={handleTestComplete} />
            </div>
          </div>
          {/* Recent Test Result */}
          <div className="flex-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Test Result
              </h3>
              {lastResult ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lastResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{lastResult.success ? '✅ Passed' : '❌ Failed'}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(lastResult.timestamp).toLocaleString()}</span>
                  </div>
                  {lastResult.imageUrl && (
                    <div className="border rounded-lg overflow-hidden mt-2">
                      <img src={lastResult.imageUrl} alt="Test screenshot" className="w-full h-auto max-h-96 object-contain" />
                    </div>
                  )}
                  {lastResult.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mt-2">
                      <p className="text-sm text-red-700 dark:text-red-400">
                        <strong>Error:</strong> {lastResult.error}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400">No test result yet.</div>
              )}
            </div>
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              TechOps Platform - Automated WordPress Testing
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-xs text-gray-500 dark:text-gray-500">
                Powered by Playwright & Next.js
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
