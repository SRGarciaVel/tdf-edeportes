import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeTwitchCode } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // React StrictMode monta los efectos dos veces en dev — sin este guard,
  // el segundo intento reusa un `code` ya consumido y Twitch lo rechaza
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setError("Faltan parámetros de Twitch en la URL");
      return;
    }

    exchangeTwitchCode(code, state)
      .then(({ access_token, user }) => {
        login(access_token, user);
        navigate("/", { replace: true });
      })
      .catch((err: Error) => setError(err.message));
  }, [searchParams, login, navigate]);

  return (
    <main className="min-h-screen bg-tdf-dark text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
      {error ? (
        <>
          <p className="text-tdf-magenta font-semibold">
            No se pudo completar el login
          </p>
          <p className="text-sm text-gray-400">{error}</p>
          <a href="/" className="text-tdf-purple underline text-sm">
            Volver al inicio
          </a>
        </>
      ) : (
        <p className="text-gray-400">Completando login con Twitch...</p>
      )}
    </main>
  );
}
