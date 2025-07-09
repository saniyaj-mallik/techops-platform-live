'use client';

import { useState } from 'react';

export default function TestRunner({ onTestComplete }) {
  const [isRunning, setIsRunning] = useState(false);
  const [testMode, setTestMode] = useState('headless');
  const [logs, setLogs] = useState([]);
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const runTest = async () => {
    setIsRunning(true);
    setLogs([]);

    try {
      const response = await fetch('/api/test/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headless: testMode === 'headless',
          url,
          username,
          password
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setLogs(result.logs || []);
      } else {
        setLogs([
          { type: 'error', message: 'Test failed', timestamp: new Date().toISOString() },
          { type: 'error', message: result.error || 'Unknown error', timestamp: new Date().toISOString() }
        ]);
      }
      if (onTestComplete) onTestComplete(result);
    } catch (error) {
      setLogs([
        { type: 'error', message: 'Failed to run test', timestamp: new Date().toISOString() },
        { type: 'error', message: error.message, timestamp: new Date().toISOString() }
      ]);
      if (onTestComplete) onTestComplete({ success: false, error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <form
      className="space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 max-w-lg mx-auto"
      onSubmit={e => { e.preventDefault(); runTest(); }}
      autoComplete="off"
    >
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">Run WordPress Login Test</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WordPress Site URL</label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 text-base"
            placeholder="https://your-site.com/wp-admin"
            disabled={isRunning}
            required
          />
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 text-base"
              placeholder="admin"
              disabled={isRunning}
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 text-base"
              placeholder="••••••••"
              disabled={isRunning}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Browser Mode</label>
          <div className="flex gap-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="headless"
                checked={testMode === 'headless'}
                onChange={(e) => setTestMode(e.target.value)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                disabled={isRunning}
              />
              <span className="ml-2 text-base text-gray-700 dark:text-gray-300">Headless</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="headed"
                checked={testMode === 'headed'}
                onChange={(e) => setTestMode(e.target.value)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                disabled={isRunning}
              />
              <span className="ml-2 text-base text-gray-700 dark:text-gray-300">Headed</span>
            </label>
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={isRunning}
        className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg text-white 
          ${isRunning 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          } transition-colors`}
      >
        {isRunning ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Running Test...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
            Run WordPress Login Test
          </>
        )}
      </button>
      {logs.length > 0 && (
        <div className="space-y-3 mt-8">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Test Logs</h4>
          <div className="bg-gray-900 rounded-md p-4 max-h-60 overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`text-sm font-mono ${
                  log.type === 'error' 
                    ? 'text-red-400' 
                    : log.type === 'success'
                    ? 'text-green-400'
                    : 'text-gray-300'
                }`}
              >
                <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}