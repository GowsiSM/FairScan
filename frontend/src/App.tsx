import { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import Report from "./pages/Report";
import type { AnalysisResult } from "./lib/types";

function AppContent() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/" element={<Landing onStart={() => navigate("/home")} />} />
      <Route 
        path="/home" 
        element={
          <Upload
            onResult={(r) => {
              setResult(r);
              navigate("/report");
            }}
            onBack={() => navigate("/")}
          />
        } 
      />
      <Route 
        path="/report" 
        element={
          result ? (
            <Report result={result} onReset={() => navigate("/home")} />
          ) : (
            <Navigate to="/home" replace />
          )
        } 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="app">
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </div>
  );
}
