import { useEffect, useMemo, useState } from "react";
import EventFormModal from "../components/EventFormModal";
import MonthCalendar from "../components/MonthCalendar";
import {
  createEvent,
  deleteEvent,
  listEvents,
  updateEvent,
} from "../lib/api";
import { dateKey } from "../lib/calendar";
import { useAuth } from "../lib/auth";
import type { EventFormValues, EventItem } from "../lib/types";

const TYPE_LABEL: Record<string, string> = {
  torneo: "Torneo",
  stream: "Stream",
  reunion: "Reunión",
  otro: "Otro",
};

export default function DashboardPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(dateKey(today));

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listEvents(token);
      setEvents(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Error al cargar eventos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function openCreateModal() {
    setEditingEvent(null);
    setModalOpen(true);
  }

  function openEditModal(event: EventItem) {
    setEditingEvent(event);
    setModalOpen(true);
  }

  async function handleSubmit(values: EventFormValues) {
    if (!token) return;
    if (editingEvent) {
      await updateEvent(token, editingEvent.id, values);
    } else {
      await createEvent(token, values);
    }
    setModalOpen(false);
    await refresh();
  }

  async function handleDelete() {
    if (!token || !editingEvent) return;
    if (!window.confirm(`¿Borrar "${editingEvent.title}"? No se puede deshacer.`)) {
      return;
    }
    await deleteEvent(token, editingEvent.id);
    setModalOpen(false);
    await refresh();
  }

  return (
    <main className="min-h-screen bg-tdf-dark text-white px-6 py-8 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tdf-magenta">Itinerario del club</h1>
          <a href="/" className="text-sm text-gray-500 hover:text-white">
            ← Volver
          </a>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-tdf-purple hover:bg-tdf-magenta transition-colors text-sm font-semibold px-4 py-2"
        >
          + Nuevo evento
        </button>
      </div>

      {loadError && <p className="text-red-400 text-sm">{loadError}</p>}

      <MonthCalendar
        year={year}
        month={month}
        events={events}
        selectedKey={selectedKey}
        onSelectDate={setSelectedKey}
        onPrevMonth={goToPrevMonth}
        onNextMonth={goToNextMonth}
      />

      <div>
        <h2 className="text-sm text-gray-400 mb-2">
          {selectedKey ?? "Elegí un día"} {loading && "— cargando..."}
        </h2>
        {selectedDayEvents.length === 0 && !loading && (
          <p className="text-sm text-gray-600">Sin eventos este día.</p>
        )}
        <ul className="flex flex-col gap-2">
          {selectedDayEvents.map((event) => (
            <li key={event.id}>
              <button
                onClick={() => openEditModal(event)}
                className="w-full text-left border border-white/10 hover:border-tdf-purple px-4 py-3 flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-gray-500">
                    {TYPE_LABEL[event.type]} ·{" "}
                    {new Date(event.start_at).toLocaleTimeString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {event.visibility === "publico" && " · Público"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {modalOpen && (
        <EventFormModal
          initialDate={selectedKey}
          editingEvent={editingEvent}
          onSubmit={handleSubmit}
          onDelete={editingEvent ? handleDelete : undefined}
          onClose={() => setModalOpen(false)}
        />
      )}
    </main>
  );
}
