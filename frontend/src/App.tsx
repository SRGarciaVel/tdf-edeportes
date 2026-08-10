import { useEffect, useState } from "react";
import { checkBackendHealth } from "./lib/api";

export default function App() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackendHealth().then(setBackendOk);
  }, []);

  return (
    <main className="min-h-screen bg-tdf-dark text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-tdf-magenta">TDF e-deportes</h1>
      <p className="text-tdf-purple">
        Bootstrap del proyecto — Fase 1 en construcción.
      </p>
      <p className="text-sm text-gray-400">
        {backendOk === null && "Verificando conexión con el backend..."}
        {backendOk === true && "Backend conectado ✔"}
        {backendOk === false && "Backend no disponible"}
      </p>
    </main>
  );
}
