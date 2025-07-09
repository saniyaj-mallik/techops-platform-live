import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                TechOps Platform
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                WordPress Login Testing Automation
              </p>
            </div>
          </div>
          <nav className="flex items-center space-x-2">
            <Link href="/">
              <span className="ml-4 px-4 py-2 rounded-lg text-indigo-700 dark:text-indigo-200 hover:underline transition font-medium cursor-pointer">
                Test
              </span>
            </Link>
            <Link href="/reports">
              <span className="ml-2 px-4 py-2 rounded-lg text-indigo-700 dark:text-indigo-200 hover:underline transition font-medium cursor-pointer">
                Reports
              </span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
