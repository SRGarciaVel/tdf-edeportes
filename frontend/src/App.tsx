import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginButton from "./components/LoginButton";
import MonthCalendar from "./components/MonthCalendar";
import ProtectedRoute from "./components/ProtectedRoute";
import QuarterlyGoals from "./components/QuarterlyGoals";
import { listEvents, listGoals } from "./lib/api";
import { dateKey } from "./lib/calendar";
import { AuthProvider, useAuth } from "./lib/auth";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import DashboardPage from "./pages/DashboardPage";
import type { EventItem, QuarterlyGoal as QuarterlyGoalType } from "./lib/types";

const TYPE_LABEL: Record<string, string> = {
  torneo: "Torneo",
  stream: "Stream",
  reunion: "Reunión",
  otro: "Otro",
};

function HomePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [goals, setGoals] = useState<QuarterlyGoalType[]>([]);

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(dateKey(today));
  const [calYear, setCalYear] = useState(today.getFullYear());

  useEffect(() => {
    // vista pública: sin token, el backend ya filtra solo lo visible=publico
    listEvents(null).then(setEvents).catch(() => setEvents([]));
    listGoals(calYear).then(setGoals).catch(() => setGoals([]));
  }, [calYear]);

  const selectedDayEvents = useMemo(
    () =>
      selectedKey
        ? events
            .filter((e) => dateKey(new Date(e.start_at)) === selectedKey)
            .sort((a, b) => a.start_at.localeCompare(b.start_at))
        : [],
    [events, selectedKey]
  );

  function goToPrevMonth() {
    if (month === 0) {
      setMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <main className="min-h-screen bg-tdf-dark text-white px-6 py-8 max-w-4xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-tdf-magenta">TDF e-deportes</h1>
          <p className="text-tdf-purple text-sm">Fighting games — SF6 · Third Strike · Alpha 2</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LoginButton />
          {user?.is_staff && (
            <a href="/dashboard" className="text-sm text-gray-400 hover:text-white underline">
              Ir al itinerario del club
            </a>
          )}
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Próximos eventos</h2>
        <MonthCalendar
          year={calYear}
          month={month}
          events={events}
          selectedKey={selectedKey}
          onSelectDate={setSelectedKey}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
        />
        <div className="mt-4">
          <h3 className="text-sm text-gray-400 mb-2">{selectedKey}</h3>
          {selectedDayEvents.length === 0 && (
            <p className="text-sm text-gray-600">Sin eventos públicos este día.</p>
          )}
          <ul className="flex flex-col gap-2">
            {selectedDayEvents.map((event) => (
              <li
                key={event.id}
                className="border border-white/10 px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-gray-500">
                    {TYPE_LABEL[event.type]} ·{" "}
                    {new Date(event.start_at).toLocaleTimeString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {event.external_url && (
                  <a
                    href={event.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-tdf-purple hover:text-tdf-magenta underline"
                  >
                    Ver bracket →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Objetivos {calYear}</h2>
        <QuarterlyGoals goals={goals} />
      </section>
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
