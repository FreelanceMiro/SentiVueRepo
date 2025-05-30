import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import TranscriptionsPage from "./TranscriptionsPage"; // rename your existing transcription list component or keep in App.tsx
import UploadPage from "./UploadPage";

export default function App() {
  return (
    <BrowserRouter>
      <nav className="bg-zinc-800 p-4 flex justify-center space-x-8 text-zinc-100 text-lg font-semibold">
        <Link to="/" className="hover:text-purple-400">Transcriptions</Link>
        <Link to="/upload" className="hover:text-purple-400">Upload Audio</Link>
      </nav>

      <Routes>
        <Route path="/" element={<TranscriptionsPage />} />
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
    </BrowserRouter>
  );
}
