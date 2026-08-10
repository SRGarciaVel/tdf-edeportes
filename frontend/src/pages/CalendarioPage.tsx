import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import MonthCalendar from "../components/MonthCalendar";
import SectionLabel from "../components/SectionLabel";
import { listEvents } from "../lib/api";
import { dateKey } from "../lib/calendar";
import type { EventItem } from "../lib/types";

const TYPE_LABEL: Record<string, string> = {
  torneo: "Torneo",
  stream: "Stream",
  reunion: "Reunión",
  otro: "Otro",
};

export default function CalendarioPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedKey, setSelectedKey] = useState<string | null>(dateKey(today));

  useEffect(() => {
    listEvents(null).then(setEvents).catch(() => setEvents([]));
  }, []);

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

  return (
    <Layout>
      <SectionLabel index="03">Itinerario</SectionLabel>
      <h1 className="text-3xl font-bold mb-6">Calendario</h1>

      <MonthCalendar
        year={year}
        month={month}
        events={events}
        selectedKey={selectedKey}
        onSelectDate={setSelectedKey}
        onPrevMonth={goToPrevMonth}
        onNextMonth={goToNextMonth}
      />

      <div className="mt-6">
        <h2 className="font-mono text-sm text-gray-400 mb-3">{selectedKey}</h2>
        {selectedDayEvents.length === 0 && (
          <p className="text-sm text-gray-600">Sin eventos públicos este día.</p>
        )}
        <ul className="flex flex-col gap-2">
          {selectedDayEvents.map((event) => (
            <li
              key={event.id}
              className="hud-frame bg-tdf-charcoal px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="font-mono text-xs text-gray-500">
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
                  className="font-mono text-xs text-tdf-purple hover:text-tdf-magenta underline"
                >
                  Ver bracket →
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
