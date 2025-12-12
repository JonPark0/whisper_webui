import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { TranscribePage } from './pages/TranscribePage';
import { EnhancePage } from './pages/EnhancePage';
import ArchivePage from './pages/ArchivePage';

const Navigation = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <h1 className="ml-3 text-xl font-bold text-gray-900">Whisper WebUI</h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Transcribe
            </Link>
            <Link
              to="/enhance"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/enhance')
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Enhance
            </Link>
            <Link
              to="/archive"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/archive')
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Archive
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <main className="py-6">
          <Routes>
            <Route path="/" element={<TranscribePage />} />
            <Route path="/enhance" element={<EnhancePage />} />
            <Route path="/archive" element={<ArchivePage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <p className="text-center text-sm text-gray-500">
              Powered by OpenAI Whisper & Google Gemini
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
