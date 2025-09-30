import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Recorder from './pages/Recorder';
import UploadResult from './pages/UploadResult';
import WatchVideo from './pages/WatchVideo';

function App() {
  return (
    <Router>
      <div className="container">
        <Routes>
          <Route path="/" element={<Recorder />} />
          <Route path="/result" element={<UploadResult />} />
          <Route path="/watch" element={<WatchVideo />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
