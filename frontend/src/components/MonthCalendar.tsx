import { getMonthGrid, MONTH_NAMES, WEEKDAY_NAMES, dateKey, eventDateKeys } from "../lib/calendar";
import type { EventItem } from "../lib/types";

const TYPE_DOT_COLOR: Record<string, string> = {
  torneo: "bg-tdf-magenta shadow-[0_0_6px_1px_rgba(196,20,122,0.8)]",
  stream: "bg-tdf-purple shadow-[0_0_6px_1px_rgba(91,42,134,0.8)]",
  reunion: "bg-gray-400",
  otro: "bg-gray-600",
};

interface Props {
  year: number;
  month: number; // 0-indexado
  events: EventItem[];
  selectedKey: string | null;
  onSelectDate: (key: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function MonthCalendar({
  year,
  month,
  events,
  selectedKey,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const grid = getMonthGrid(year, month);
  const todayKey = dateKey(new Date());

  const eventsByDay = new Map<string, EventItem[]>();
  for (const event of events) {
    for (const key of eventDateKeys(event.start_at, event.end_at)) {
      const list = eventsByDay.get(key) ?? [];
      list.push(event);
      eventsByDay.set(key, list);
    }
  }

  return (
    <div className="hud-frame bg-tdf-charcoal">
      <div className="flex items-center justify-between px-4 py-3 border-b border-tdf-line">
        <button
          onClick={onPrevMonth}
          className="font-mono text-gray-400 hover:text-tdf-magenta transition-colors px-2"
          aria-label="Mes anterior"
        >
          ←
        </button>
        <h2 className="font-display font-bold uppercase tracking-wide text-white">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={onNextMonth}
          className="font-mono text-gray-400 hover:text-tdf-magenta transition-colors px-2"
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 text-center font-mono text-xs uppercase text-gray-500 border-b border-tdf-line">
        {WEEKDAY_NAMES.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {grid.map((cell) => {
          const dayEvents = eventsByDay.get(cell.key) ?? [];
          const isSelected = cell.key === selectedKey;
          const isToday = cell.key === todayKey;

          return (
            <button
              key={cell.key}
              onClick={() => onSelectDate(cell.key)}
              className={`aspect-square border-b border-r border-tdf-line/60 p-1.5 text-left flex flex-col gap-1 transition-colors relative ${
                cell.isCurrentMonth ? "text-white" : "text-gray-700"
              } ${isSelected ? "" : "hover:bg-white/5"}`}
            >
              {isSelected && <span className="spray-mark absolute inset-0" aria-hidden />}
              <span
                className={`relative z-10 font-mono text-xs ${
                  isToday ? "font-bold text-tdf-magenta" : ""
                }`}
              >
                {cell.date.getDate()}
              </span>
              <div className="relative z-10 flex flex-wrap gap-1">
                {dayEvents.slice(0, 4).map((e) => (
                  <span
                    key={e.id}
                    className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT_COLOR[e.type] ?? "bg-gray-500"}`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
