import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginButton from "./components/LoginButton";
import { AuthProvider } from "./lib/auth";
import AuthCallbackPage from "./pages/AuthCallbackPage";

function HomePage() {
  return (
    <main className="min-h-screen bg-tdf-dark text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-tdf-magenta">TDF e-deportes</h1>
      <p className="text-tdf-purple">Dashboard interno — Fase 1</p>
      <LoginButton />
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
