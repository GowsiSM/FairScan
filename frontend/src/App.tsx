import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import Report from "./pages/Report";
import type { AnalysisResult } from "./lib/types";

/** Wrapper that redirects unauthenticated users to the landing page */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          height: "100vh",
          fontFamily: "var(--font-body)",
          color: "var(--ink-faint)",
        }}
      >
        <span className="spinner" style={{ width: 28, height: 28 }} />
        <span style={{ fontSize: 14 }}>Signing you in…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}


function AppContent() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const navigate = useNavigate();

  const handleResult = (r: AnalysisResult) => {
    setResult(r);
    navigate("/report");
  };

  /** Called when user clicks an item in the History sidebar */
  const handleSelectHistory = (r: AnalysisResult) => {
    setResult(r);
    navigate("/report");
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<Landing onStart={() => navigate("/home")} onSelectHistory={handleSelectHistory} />}
      />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <Upload
              onResult={handleResult}
              onBack={() => navigate("/")}
            />
          </RequireAuth>
        }
      />
      <Route
        path="/report"
        element={
          <RequireAuth>
            {result ? (
              <Report
                result={result}
                onReset={() => navigate("/home")}
                onSelectHistory={handleSelectHistory}
              />
            ) : (
              <Navigate to="/home" replace />
            )}
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="app">
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
