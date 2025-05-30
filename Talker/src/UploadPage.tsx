import { useState, ChangeEvent, FormEvent } from "react";

const TRANSCRIBE_URL = import.meta.env.VITE_TRANSCRIBE_URL || "/transcribe";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ transcription_text: string; topic: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  }

async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  if (!file) {
    setError("Please select an audio file.");
    return;
  }
  setError(null);
  setLoading(true);
  setResult(null);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(TRANSCRIBE_URL, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      // Successful response — parse JSON safely
      try {
        const data = await response.json();
        setResult(data);
      } catch {
        setError("Failed to parse server response.");
      }
    } else {
      // Error response — try to parse JSON error message
      let errorData = null;
      try {
        errorData = await response.json();
      } catch {
        // ignore JSON parse errors here
      }
      setError(errorData?.error || `Error ${response.status}: ${response.statusText}`);
    }
  } catch {
    setError("Network error or server is unreachable.");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-800 rounded-2xl p-8 border border-zinc-700 shadow-lg">
        <h1 className="text-3xl font-extrabold mb-6 text-purple-400 text-center">
          Upload Audio for Transcription
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            accept="audio/*"
            id="file-upload"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="block cursor-pointer w-full text-center bg-purple-600 hover:bg-purple-700 transition rounded py-2 font-semibold"
          >
            {file ? file.name : "Choose Audio File"}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 transition rounded py-2 font-semibold"
          >
            {loading ? "Uploading..." : "Upload & Transcribe"}
          </button>
        </form>

        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}

        {result && (
          <div className="mt-6 bg-zinc-700 p-4 rounded-lg">
            <p className="font-semibold text-purple-300 uppercase">Topic:</p>
            <p className="mb-4 text-zinc-100">{result.topic || "General"}</p>
            <p className="font-semibold text-purple-300 uppercase">Transcription:</p>
            <p className="text-zinc-100">{result.transcription_text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
