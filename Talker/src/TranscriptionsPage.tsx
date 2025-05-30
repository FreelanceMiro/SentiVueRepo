import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

type Transcription = {
  id: string;
  transcription: string;
  topic: string;
  sentiment: string | null;
  confidence: number | null;
  created_at: string;
};

export default function App() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [sentimentSummary, setSentimentSummary] = useState<{
    sentiment: string;
    proportion: number;
  } | null>(null);

  useEffect(() => {
    async function fetchTranscriptions() {
      const { data, error } = await supabase
        .from("Transcriptions")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching transcriptions:", error);
        setTranscriptions([]);
        setSentimentSummary(null);
      } else {
        const transcriptions = data || [];
        setTranscriptions(transcriptions);

        // Calculate sentiment proportions
        const sentimentCounts: Record<string, number> = {};
        transcriptions.forEach((t) => {
          const s = t.sentiment || "Unknown";
          sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
        });

        const total = transcriptions.length;
        if (total > 0) {
          let maxSentiment = "";
          let maxCount = 0;
          Object.entries(sentimentCounts).forEach(([sentiment, count]) => {
            if (count > maxCount) {
              maxCount = count;
              maxSentiment = sentiment;
            }
          });

          setSentimentSummary({
            sentiment: maxSentiment,
            proportion: maxCount / total,
          });
        } else {
          setSentimentSummary(null);
        }
      }
    }

    fetchTranscriptions();

    const subscription = supabase
      .channel("public:Transcriptions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Transcriptions" },
        (payload: { new: Transcription }) => {
          setTranscriptions((prev) => {
            const updated = [...prev, payload.new];

            // Update sentiment summary live
            const sentimentCounts: Record<string, number> = {};
            updated.forEach((t) => {
              const s = t.sentiment || "Unknown";
              sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
            });

            const total = updated.length;
            if (total > 0) {
              let maxSentiment = "";
              let maxCount = 0;
              Object.entries(sentimentCounts).forEach(([sentiment, count]) => {
                if (count > maxCount) {
                  maxCount = count;
                  maxSentiment = sentiment;
                }
              });

              setSentimentSummary({
                sentiment: maxSentiment,
                proportion: maxCount / total,
              });
            } else {
              setSentimentSummary(null);
            }

            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Helper: sentiment color (same as your blocks)
  const sentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "happy":
        return "bg-green-600";
      case "sad":
        return "bg-blue-600";
      case "angry":
        return "bg-red-600";
      case "neutral":
        return "bg-gray-600";
      default:
        return "bg-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-zinc-800 shadow-2xl rounded-2xl p-8 border border-zinc-700">

        <h1 className="text-4xl font-extrabold text-center text-purple-400 mb-8 tracking-tight">
          Live Transcriptions
        </h1>

        {/* Sentiment summary at top */}
        {sentimentSummary && (
          <div
            className={`${sentimentColor(
              sentimentSummary.sentiment
            )} rounded-md p-3 mb-6 text-center text-white font-semibold`}
          >
            Most prevalent sentiment:{" "}
            <span className="uppercase">{sentimentSummary.sentiment}</span>{" "}
            ({(sentimentSummary.proportion * 100).toFixed(1)}%)
          </div>
        )}

        {transcriptions.length === 0 ? (
          <p className="text-zinc-400 text-center">No transcriptions yet.</p>
        ) : (
          <ul className="space-y-5">
            {transcriptions.map(
              ({ id, topic, transcription, created_at, sentiment, confidence }) => (
                <li
                  key={id}
                  className="bg-zinc-700 border border-zinc-600 rounded-xl p-5 transition hover:shadow-lg"
                >
                  <p className="text-purple-300 font-semibold mb-2 uppercase tracking-wide">
                    Topic: <span className="text-zinc-100">{topic?.trim() || "General"}</span>
                  </p>
                  <p className="text-lg font-medium text-zinc-100">{transcription}</p>

                  {/* Sentiment + confidence */}
                  {sentiment && confidence !== null && (
                    <p
                      className={`${sentimentColor(sentiment)} inline-block rounded px-2 py-1 mt-3 text-white font-semibold`}
                    >
                      Sentiment: {sentiment} — Confidence: {(confidence * 100).toFixed(1)}%
                    </p>
                  )}

                  <small className="text-zinc-400 block mt-3 text-sm">
                    {new Date(created_at).toLocaleString()}
                  </small>
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
