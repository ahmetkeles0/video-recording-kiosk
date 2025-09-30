import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import TabletInterface from './components/TabletInterface';
import PhoneInterface from './components/PhoneInterface';
import VideoWatch from './components/VideoWatch';
import SimpleVideoWatch from './components/SimpleVideoWatch';

function App() {
  useDeviceDetection();

  return (
    <Router>
      <div className="container">
        <Routes>
          {/* Tablet interface - for kiosk control */}
          <Route path="/" element={<TabletInterface />} />
          
          {/* Phone interface - for recording */}
          <Route path="/record" element={<PhoneInterface />} />
          
          {/* Video watch page - for QR code results */}
          <Route path="/watch" element={<SimpleVideoWatch />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
