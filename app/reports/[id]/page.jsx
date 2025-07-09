'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const TEST_LABELS = {
    functionalityTest: 'Functionality Test',
    pluginUpdate: 'Plugin Update',
    themeUpdate: 'Theme Update',
    beforeAfterVRT: 'Before/After VRT',
    sitemapVRT: 'Sitemap VRT',
};

const TEST_ORDER = [
    'functionalityTest',
    'pluginUpdate',
    'themeUpdate',
    'beforeAfterVRT',
    'sitemapVRT',
];

// Add icon components for sidebar
const TestIcons = {
    functionalityTest: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
    ),
    pluginUpdate: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0l-4-4a4 4 0 015.656-5.656l4 4a4 4 0 010 5.656z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 8l-1.414 1.414" /></svg>
    ),
    themeUpdate: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
    ),
    beforeAfterVRT: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8" /></svg>
    ),
    sitemapVRT: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6v6H3zM15 3h6v6h-6zM15 15h6v6h-6zM3 15h6v6H3zM9 9h6v6H9z" /></svg>
    ),
};

function getStatusIcon(status) {
    switch (status) {
        case 'success':
        case 'completed':
            return <span className="text-green-600">✔️</span>;
        case 'failure':
        case 'failed':
            return <span className="text-red-600">❌</span>;
        case 'partial':
            return <span className="text-yellow-600">⚠️</span>;
        case 'skipped':
            return <span className="text-gray-400">⏭️</span>;
        default:
            return <span className="text-gray-400">•</span>;
    }
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

function extractVersion(version) {
    if (!version) return '-';
    // Match the first version-like number (e.g., 3.7, 1.2.3, etc.)
    const match = version.match(/\d+(?:\.\d+)+/);
    return match ? match[0] : version.split('|')[0].trim();
}

function PluginThemeCard({ item, before, after, type }) {
    const updated = before?.version !== after?.version;
    return (
        <div className={`flex items-center p-4 rounded-lg border ${updated ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'} mb-2`}>
            <div className="flex-1">
                <div className="font-semibold text-gray-900">{item.name}</div>
                {item.description && <div className="text-xs text-gray-500 mb-1">{item.description}</div>}
                <div className="text-xs text-gray-500">{type === 'plugin' ? 'Plugin' : 'Theme'}</div>
            </div>
            <div className="flex items-center space-x-2">
                <span className="font-mono text-sm text-gray-700">{extractVersion(before?.version)}</span>
                <span className="mx-1 text-xl font-bold text-blue-600" aria-label="to">
                    {/* SVG arrow for clarity */}
                    <span className="mx-1 text-lg">→</span>
                </span>
                <span className={`font-mono text-sm ${updated ? 'text-green-700' : 'text-gray-700'}`}>{extractVersion(after?.version)}</span>
            </div>
            {updated && <span className="ml-3 px-2 py-1 bg-green-200 text-green-800 text-xs rounded">Updated</span>}
        </div>
    );
}

function FunctionalityTestView({ result }) {
    return (
        <div className="p-4">
            <div className="flex items-center space-x-3 mb-2">
                {getStatusIcon(result.status)}
                <span className="font-semibold text-lg">{TEST_LABELS.functionalityTest}</span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">{result.status}</span>
            </div>
            <div className="text-gray-700 mb-2">{result.message}</div>
        </div>
    );
}

function PluginUpdateView({ beforeState, afterState }) {
    // Map by name for before/after comparison
    const beforeMap = new Map((beforeState.plugins || []).map(p => [p.name, p]));
    const afterMap = new Map((afterState.plugins || []).map(p => [p.name, p]));
    const allNames = Array.from(new Set([...beforeMap.keys(), ...afterMap.keys()]));
    return (
        <div className="p-4">
            <div className="font-semibold text-lg mb-4 flex items-center">{getStatusIcon('pluginUpdate')} Plugin Updates</div>
            {allNames.length === 0 && <div className="text-gray-500">No plugins found.</div>}
            {allNames.map(name => (
                <PluginThemeCard
                    key={name}
                    item={beforeMap.get(name) || afterMap.get(name)}
                    before={beforeMap.get(name)}
                    after={afterMap.get(name)}
                    type="plugin"
                />
            ))}
        </div>
    );
}

function ThemeUpdateView({ beforeState, afterState }) {
    const beforeMap = new Map((beforeState.themes || []).map(t => [t.name, t]));
    const afterMap = new Map((afterState.themes || []).map(t => [t.name, t]));
    const allNames = Array.from(new Set([...beforeMap.keys(), ...afterMap.keys()]));
    return (
        <div className="p-4">
            <div className="font-semibold text-lg mb-4 flex items-center">{getStatusIcon('themeUpdate')} Theme Updates</div>
            {allNames.length === 0 && <div className="text-gray-500">No themes found.</div>}
            {allNames.map(name => (
                <PluginThemeCard
                    key={name}
                    item={beforeMap.get(name) || afterMap.get(name)}
                    before={beforeMap.get(name)}
                    after={afterMap.get(name)}
                    type="theme"
                />
            ))}
        </div>
    );
}

function VRTView({ vrtData, result, setVrtModal }) {
    if (!vrtData) return <div className="p-4 text-gray-500">No VRT data available.</div>;
    const allItems = [...(vrtData.pagesData || []), ...(vrtData.postsData || [])];
    return (
        <div className="p-4">
            <div className="font-semibold text-lg mb-4 flex items-center">{getStatusIcon(result?.status)} Before/After VRT</div>
            <div className="mb-2 text-gray-700">Screenshots Captured: {result?.screenshotsCaptured ?? 0}, Failed: {result?.screenshotsFailed ?? 0}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allItems.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 flex flex-col items-center">
                        <a href={item.weblink} target="_blank" rel="noopener noreferrer" className="mb-2 text-blue-600 underline text-sm truncate w-full text-center">{item.weblink}</a>
                        <div className="flex space-x-2">
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 mb-1">Before</span>
                                {item.before?.url ? (
                                    <a href={item.before.url} target="_blank" rel="noopener noreferrer">
                                        <img src={item.before.url} alt="Before screenshot" className="w-32 h-20 object-cover rounded border" />
                                    </a>
                                ) : (
                                    <div className="w-32 h-20 bg-gray-200 flex items-center justify-center rounded border text-xs text-gray-400">No Image</div>
                                )}
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 mb-1">After</span>
                                {item.after?.url ? (
                                    <a href={item.after.url} target="_blank" rel="noopener noreferrer">
                                        <img src={item.after.url} alt="After screenshot" className="w-32 h-20 object-cover rounded border" />
                                    </a>
                                ) : (
                                    <div className="w-32 h-20 bg-gray-200 flex items-center justify-center rounded border text-xs text-gray-400">No Image</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 text-center">
                <button
                    className="text-blue-600 underline"
                    onClick={() => setVrtModal({ open: true, img: vrtData.pagesData[0]?.before?.url || vrtData.pagesData[0]?.after?.url || '' })}
                >
                    View All Screenshots
                </button>
            </div>
        </div>
    );
}

function SitemapVRTView({ result }) {
    return (
        <div className="p-4">
            <div className="font-semibold text-lg mb-4 flex items-center">{getStatusIcon(result?.status)} Sitemap VRT</div>
            <div className="mb-2 text-gray-700">Screenshots Captured: {result?.screenshotsCaptured ?? 0}, Failed: {result?.screenshotsFailed ?? 0}</div>
        </div>
    );
}

function IssuesView({ issues }) {
    if (!issues || issues.length === 0) return null;
    return (
        <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Issues & Errors</h2>
            <div className="space-y-3">
                {issues.map((issue, idx) => (
                    <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium text-red-800">{issue.task}</p>
                                <p className="text-red-700 mt-1">{issue.message}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                                    issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                }`}>
                                {issue.severity}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {new Date(issue.timestamp).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Add a modal component for VRT screenshots
function Modal({ open, onClose, children }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-4 relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                {children}
            </div>
        </div>
    );
}

function VRTDiffResults({ vrtDiffResults, vrtDiffSummary }) {
    if (!vrtDiffResults || vrtDiffResults.length === 0) return null;
    return (
        <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">Visual Regression Test (VRT) Results</h2>
            <div className="mb-4 text-gray-700">
                <span className="mr-4">Total: <b>{vrtDiffSummary?.total ?? 0}</b></span>
                <span className="mr-4 text-green-700">Passed: <b>{vrtDiffSummary?.passed ?? 0}</b></span>
                <span className="text-red-700">Failed: <b>{vrtDiffSummary?.failed ?? 0}</b></span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vrtDiffResults.map((item, idx) => (
                    <div key={idx} className={`bg-gray-50 rounded-lg p-3 flex flex-col items-center border ${item.status === 'fail' ? 'border-red-400' : item.status === 'pass' ? 'border-green-400' : 'border-gray-200'}`}>
                        <a href={item.weblink} target="_blank" rel="noopener noreferrer" className="mb-2 text-blue-600 underline text-sm truncate w-full text-center">{item.weblink}</a>
                        <div className="flex space-x-2 mb-2">
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 mb-1">Before</span>
                                {item.beforeUrl ? (
                                    <a href={item.beforeUrl} target="_blank" rel="noopener noreferrer">
                                        <img src={item.beforeUrl} alt="Before screenshot" className="w-28 h-16 object-cover rounded border" />
                                    </a>
                                ) : <div className="w-28 h-16 bg-gray-200 flex items-center justify-center rounded border text-xs text-gray-400">No Image</div>}
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 mb-1">After</span>
                                {item.afterUrl ? (
                                    <a href={item.afterUrl} target="_blank" rel="noopener noreferrer">
                                        <img src={item.afterUrl} alt="After screenshot" className="w-28 h-16 object-cover rounded border" />
                                    </a>
                                ) : <div className="w-28 h-16 bg-gray-200 flex items-center justify-center rounded border text-xs text-gray-400">No Image</div>}
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 mb-1">Diff</span>
                                {item.diffUrl ? (
                                    <a href={item.diffUrl} target="_blank" rel="noopener noreferrer">
                                        <img src={item.diffUrl} alt="Diff image" className="w-28 h-16 object-cover rounded border" />
                                    </a>
                                ) : <div className="w-28 h-16 bg-gray-200 flex items-center justify-center rounded border text-xs text-gray-400">No Diff</div>}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'fail' ? 'bg-red-100 text-red-800' : item.status === 'pass' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{item.status?.toUpperCase()}</span>
                            {typeof item.diffPercent === 'number' && <span className="text-xs text-gray-700">Diff: {item.diffPercent.toFixed(2)}%</span>}
                            {item.error && <span className="text-xs text-red-500">Error: {item.error}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ReportPage() {
    const params = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTest, setSelectedTest] = useState('functionalityTest');
    const [vrtModal, setVrtModal] = useState({ open: false, img: null });
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        async function fetchReport() {
            try {
                const response = await fetch(`/api/reports/${params.id}`);
                const data = await response.json();
                if (data.success) {
                    setReport(data.data);
                } else {
                    setError(data.error);
                }
            } catch (err) {
                setError('Failed to fetch report');
                console.error('Error fetching report:', err);
            } finally {
                setLoading(false);
            }
        }
        if (params.id) fetchReport();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading report...</p>
                </div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    // Sidebar test list
    const sidebarTests = TEST_ORDER.filter(
        t => report.tasksExecuted?.[t] !== undefined
    );

    // --- Summary Cards ---
    function SummaryCards() {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center border-t-4 border-blue-500">
                    <span className="text-xs text-gray-500 mb-1">Status</span>
                    <span className={`text-lg font-bold ${report.status === 'completed' ? 'text-green-600' : report.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{report.status.charAt(0).toUpperCase() + report.status.slice(1)}</span>
                </div>
                <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center border-t-4 border-indigo-500">
                    <span className="text-xs text-gray-500 mb-1">Success Rate</span>
                    <span className="text-lg font-bold text-indigo-600">{report.successRate}%</span>
                </div>
                <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center border-t-4 border-green-500">
                    <span className="text-xs text-gray-500 mb-1">Duration</span>
                    <span className="text-lg font-bold text-green-600">{formatDuration(report.duration)}</span>
                </div>
                <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center border-t-4 border-purple-500">
                    <span className="text-xs text-gray-500 mb-1">Issues</span>
                    <span className={`text-lg font-bold ${report.issues?.length ? 'text-red-600' : 'text-gray-600'}`}>{report.issues?.length || 0}</span>
                </div>
            </div>
        );
    }

    // --- Responsive Sidebar ---
    function Sidebar() {
        return (
            <aside className={`fixed lg:static z-40 top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-100 to-blue-50 border-r border-gray-200 p-0 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Project Info */}
                <div className="px-6 pt-6 pb-4 bg-white bg-opacity-80 border-b border-gray-200 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center mb-2">
                        <svg className="w-7 h-7 text-blue-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <h1 className="text-lg font-bold text-gray-900 text-center truncate w-full">{report.projectName}</h1>
                    <p className="text-gray-600 text-xs text-center truncate w-full">{report.siteUrl}</p>
                    <div className="flex items-center mt-2 space-x-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {report.siteType === 'staging' ? '🧪 Staging' : '🌐 Live'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${report.status === 'completed' ? 'bg-green-100 text-green-700' : report.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                    </div>
                </div>
                {/* Collapse/Expand Button */}
                <button
                    className="lg:hidden absolute top-4 right-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full p-2 shadow focus:outline-none"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-2 py-6">
                    <ul className="space-y-1">
                        {sidebarTests.map(test => (
                            <li key={test}>
                                <button
                                    className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors group ${selectedTest === test ? 'bg-blue-600 text-white shadow font-semibold' : 'hover:bg-blue-100 text-blue-900'}`}
                                    onClick={() => { setSelectedTest(test); setSidebarOpen(false); }}
                                >
                                    <span className={`mr-3 flex-shrink-0 ${selectedTest === test ? 'text-white' : 'text-blue-500 group-hover:text-blue-700'}`}>{TestIcons[test]}</span>
                                    <span className="truncate flex-1">{TEST_LABELS[test] || test}</span>
                                    {selectedTest === test && <span className="ml-2 w-2 h-2 bg-white rounded-full border border-blue-600" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 text-xs text-gray-400 bg-white bg-opacity-80">
                    <div>Duration: {formatDuration(report.duration)}</div>
                    <div>{new Date(report.startTime).toLocaleString()} - {new Date(report.endTime).toLocaleString()}</div>
                    <div className="mt-2">Report ID: <span className="font-mono">{report._id}</span></div>
                    <div className="mt-2">TechOps Platform v1.0</div>
                </div>
            </aside>
        );
    }

    // --- Main Content ---
    let mainContent = null;
    if (selectedTest === 'functionalityTest') {
        mainContent = <FunctionalityTestView result={report.results?.functionalityTest || {}} />;
    } else if (selectedTest === 'pluginUpdate') {
        mainContent = <PluginUpdateView beforeState={report.beforeStateId || {}} afterState={report.afterStateId || {}} />;
    } else if (selectedTest === 'themeUpdate') {
        mainContent = <ThemeUpdateView beforeState={report.beforeStateId || {}} afterState={report.afterStateId || {}} />;
    } else if (selectedTest === 'beforeAfterVRT') {
        mainContent = <VRTView vrtData={report.beforeAfterVRTData} result={report.results?.beforeAfterVRT} setVrtModal={setVrtModal} />;
    } else if (selectedTest === 'sitemapVRT') {
        mainContent = <SitemapVRTView result={report.results?.sitemapVRT} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col lg:flex-row">
            {/* Mobile sidebar toggle */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 bg-white border border-gray-300 rounded-full p-2 shadow-md focus:outline-none"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Open sidebar"
            >
                <svg className="h-6 w-6 text-blue-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {/* Sidebar */}
            <Sidebar />
            {/* Main content */}
            <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">
                <SummaryCards />
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
                    {mainContent}
                </div>
                {/* VRT Diff Results Section */}
                <VRTDiffResults vrtDiffResults={report.vrtDiffResults} vrtDiffSummary={report.vrtDiffSummary} />
                <IssuesView issues={report.issues} />
            </main>
            {/* VRT Modal */}
            <Modal open={vrtModal.open} onClose={() => setVrtModal({ open: false, img: null })}>
                {vrtModal.img && (
                    <img src={vrtModal.img} alt="VRT Screenshot" className="max-w-full max-h-[70vh] mx-auto rounded shadow" />
                )}
            </Modal>
        </div>
    );
} 