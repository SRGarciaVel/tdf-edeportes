import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginButton from "./components/LoginButton";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./lib/auth";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import DashboardPage from "./pages/DashboardPage";

function HomePage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-tdf-dark text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-tdf-magenta">TDF e-deportes</h1>
      <p className="text-tdf-purple">Dashboard interno — Fase 1</p>
      <LoginButton />
      {user?.is_staff && (
        <a
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-white underline"
        >
          Ir al itinerario del club
        </a>
      )}
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
