import { useState } from "react";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import Report from "./pages/Report";
import type { AnalysisResult } from "./lib/types";

export type Page = "landing" | "upload" | "report";

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  return (
    <div className="app">
      {page === "landing" && <Landing onStart={() => setPage("upload")} />}
      {page === "upload" && (
        <Upload
          onResult={(r) => {
            setResult(r);
            setPage("report");
          }}
          onBack={() => setPage("landing")}
        />
      )}
      {page === "report" && result && (
        <Report result={result} onReset={() => setPage("upload")} />
      )}
    </div>
  );
}
