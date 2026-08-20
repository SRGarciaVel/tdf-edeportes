import { useEffect, useMemo, useState } from "react";
import EventFormModal from "../components/EventFormModal";
import Layout from "../components/Layout";
import MonthCalendar from "../components/MonthCalendar";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { createEvent, deleteEvent, listEvents, updateEvent } from "../lib/api";
import { dateKey, eventDateKeys } from "../lib/calendar";
import { useAuth } from "../lib/auth";
import type { EventFormValues, EventItem } from "../lib/types";

const TYPE_LABEL: Record<string, string> = {
  torneo: "Torneo",
  stream: "Stream",
  reunion: "Reunión",
  otro: "Otro",
};

export default function CalendarioPage() {
  const { token, user } = useAuth();
  const isStaff = Boolean(user?.is_staff);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedKey, setSelectedKey] = useState<string | null>(dateKey(today));

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      // con token de staff, el backend ya devuelve también los eventos
      // staff-only; sin token o sin ser staff, solo los públicos
      const data = await listEvents(token);
      setEvents(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Error al cargar eventos",
      );
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
            .filter(
              (e) =>
                selectedKey !== null &&
                eventDateKeys(e.start_at, e.end_at).includes(selectedKey),
            )
            .sort((a, b) => a.start_at.localeCompare(b.start_at))
        : [],
    [events, selectedKey],
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
    if (!isStaff) return;
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
    if (
      !window.confirm(`¿Borrar "${editingEvent.title}"? No se puede deshacer.`)
    ) {
      return;
    }
    await deleteEvent(token, editingEvent.id);
    setModalOpen(false);
    await refresh();
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <SectionLabel index="03">Itinerario</SectionLabel>
          <h1 className="text-3xl font-bold">Calendario</h1>
        </div>
        {isStaff && (
          <button
            onClick={openCreateModal}
            className="bg-tdf-purple hover:bg-tdf-magenta transition-colors font-mono text-sm uppercase px-4 py-2"
          >
            + Nuevo evento
          </button>
        )}
      </div>

      {loadError && <p className="text-red-400 text-sm mb-4">{loadError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <MonthCalendar
          year={year}
          month={month}
          events={events}
          selectedKey={selectedKey}
          onSelectDate={setSelectedKey}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
        />

        <div className="lg:sticky lg:top-20">
          <h2 className="font-mono text-sm text-tdf-muted mb-3">
            {selectedKey}
          </h2>
          {loading && (
            <ul className="flex flex-col gap-2">
              {[0, 1].map((i) => (
                <li
                  key={i}
                  className="hud-frame bg-tdf-charcoal px-4 py-3 flex flex-col gap-2"
                >
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </li>
              ))}
            </ul>
          )}
          {selectedDayEvents.length === 0 && !loading && (
            <p className="text-sm text-tdf-muted font-body">
              Sin eventos {isStaff ? "" : "públicos "}este día.
            </p>
          )}
          {!loading && (
            <ul className="flex flex-col gap-2">
              {selectedDayEvents.map((event) => (
                <li key={event.id}>
                  {isStaff ? (
                    <button
                      onClick={() => openEditModal(event)}
                      className="hud-frame bg-tdf-charcoal hover:border-tdf-magenta w-full text-left px-4 py-3 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="font-mono text-xs text-tdf-muted">
                          {TYPE_LABEL[event.type]} ·{" "}
                          {new Date(event.start_at).toLocaleTimeString(
                            "es-CL",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                          {event.visibility === "publico" && " · Público"}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="hud-frame bg-tdf-charcoal px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="font-mono text-xs text-tdf-muted">
                          {TYPE_LABEL[event.type]} ·{" "}
                          {new Date(event.start_at).toLocaleTimeString(
                            "es-CL",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                      {event.external_url && (
                        <a
                          href={event.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-tdf-purple hover:text-tdf-magenta underline"
                        >
                          Ver bracket →
                        </a>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
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
    </Layout>
  );
}
