import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TranscribePage } from './pages/TranscribePage';
import { EnhancePage } from './pages/EnhancePage';
import ArchivePage from './pages/ArchivePage';
import { TranscriptPage } from './pages/TranscriptPage';
import { TopBar } from './components/layout/TopBar';
import { Footer } from './components/layout/Footer';
import { ConfirmProvider } from './components/ui/Dialog';

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ConfirmProvider>
        <div className="min-h-screen flex flex-col bg-surface">
          <TopBar />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<TranscribePage />} />
              <Route path="/enhance" element={<EnhancePage />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/jobs/:jobId" element={<TranscriptPage />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </ConfirmProvider>
    </Router>
  );
}

export default App;
