import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

interface Props {
  onHistory?: () => void;
  onSave?: () => void;
  saveState?: "idle" | "saving" | "saved";
  onReset?: () => void;
  reportMeta?: {
    domain: string;
    isReadOnly: boolean;
  };
}

export default function Navbar({
  onHistory,
  onSave,
  saveState = "idle",
  onReset,
  reportMeta,
}: Props) {
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      {/* ── Main navbar: brand + auth only ── */}
      <header className="navbar">
        <button
          className="navbar-brand"
          onClick={() => navigate(location.pathname === "/" ? "/" : "/home")}
        >
          <img src="/weight.svg" className="navbar-icon" alt="" />
          <span className="navbar-logo">fairscan</span>
        </button>

        <div className="navbar-right">
          {user ? (
            <div className="navbar-user">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt=""
                  className="navbar-avatar"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="navbar-name">
                {user.displayName?.split(" ")[0]}
              </span>
              <button className="navbar-sign-out" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : (
            <button className="navbar-sign-in" onClick={signInWithGoogle}>
              <GoogleIcon />
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* ── Floating action bar — only on report pages ── */}
      {reportMeta && (
        <div className="floating-bar">
          <div className="floating-bar-inner">
            {/* Left: back + context */}
            <div className="fb-left">
              {onReset && (
                <button
                  className="fb-btn fb-back"
                  onClick={onReset}
                  title="New scan"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  <span>New scan</span>
                </button>
              )}
              <span className="fb-divider" />
              <span className="fb-domain">{reportMeta.domain}</span>
              {reportMeta.isReadOnly && (
                <span className="fb-archived-pill">Archived</span>
              )}
              {!reportMeta.isReadOnly && (
                <span
                  className="fb-privacy-pill"
                  data-tooltip="The dataset uploaded is not stored anywhere. Only the analysis report will be stored when the user clicks save."
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                  Data not stored
                </span>
              )}
            </div>

            {/* Right: history + save */}
            <div className="fb-right">
              {onHistory && (
                <button
                  className="fb-btn fb-icon-btn"
                  onClick={onHistory}
                  title="Scan history"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>History</span>
                </button>
              )}
              {onSave && (
                <button
                  className={`fb-btn fb-save-btn ${saveState}`}
                  onClick={onSave}
                  disabled={saveState === "saving" || saveState === "saved"}
                  title="Save report"
                >
                  {saveState === "saving" && (
                    <span className="spinner dark small" />
                  )}
                  {saveState === "saved" && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {saveState === "idle" && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  )}
                  <span>
                    {saveState === "saving"
                      ? "Saving…"
                      : saveState === "saved"
                        ? "Saved!"
                        : "Save"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.07 24.07 0 0 0 0 21.56l7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
