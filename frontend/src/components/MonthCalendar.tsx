import { getMonthGrid, MONTH_NAMES, WEEKDAY_NAMES, dateKey } from "../lib/calendar";
import type { EventItem } from "../lib/types";

const TYPE_DOT_COLOR: Record<string, string> = {
  torneo: "bg-tdf-magenta",
  stream: "bg-tdf-purple",
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
    const key = dateKey(new Date(event.start_at));
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  return (
    <div className="border border-white/10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          onClick={onPrevMonth}
          className="text-gray-400 hover:text-white px-2"
          aria-label="Mes anterior"
        >
          ←
        </button>
        <h2 className="font-semibold text-white">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={onNextMonth}
          className="text-gray-400 hover:text-white px-2"
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-gray-500 border-b border-white/10">
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
              className={`aspect-square border-b border-r border-white/5 p-1.5 text-left flex flex-col gap-1 transition-colors ${
                cell.isCurrentMonth ? "text-white" : "text-gray-600"
              } ${isSelected ? "bg-tdf-purple/30" : "hover:bg-white/5"}`}
            >
              <span
                className={`text-xs ${isToday ? "font-bold text-tdf-magenta" : ""}`}
              >
                {cell.date.getDate()}
              </span>
              <div className="flex flex-wrap gap-0.5">
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
