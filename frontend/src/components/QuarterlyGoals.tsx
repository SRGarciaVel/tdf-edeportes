import type { GoalStatus, QuarterlyGoal } from "../lib/types";

const STATUS_LABEL: Record<GoalStatus, string> = {
  en_progreso: "En progreso",
  cumplido: "Cumplido",
  descartado: "Descartado",
};

const STATUS_COLOR: Record<GoalStatus, string> = {
  en_progreso: "text-tdf-purple",
  cumplido: "text-green-400",
  descartado: "text-gray-500",
};

export default function QuarterlyGoals({ goals }: { goals: QuarterlyGoal[] }) {
  if (goals.length === 0) {
    return <p className="text-sm text-gray-600">Sin objetivos cargados todavía.</p>;
  }

  const byQuarter = new Map<number, QuarterlyGoal[]>();
  for (const goal of goals) {
    const list = byQuarter.get(goal.quarter) ?? [];
    list.push(goal);
    byQuarter.set(goal.quarter, list);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((q) => (
        <div key={q} className="border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-tdf-magenta mb-3">Q{q}</h3>
          <ul className="flex flex-col gap-3">
            {(byQuarter.get(q) ?? []).map((goal) => (
              <li key={goal.id}>
                <p className="text-sm font-medium">{goal.title}</p>
                {goal.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>
                )}
                <span className={`text-xs ${STATUS_COLOR[goal.status]}`}>
                  {STATUS_LABEL[goal.status]}
                </span>
              </li>
            ))}
            {(byQuarter.get(q) ?? []).length === 0 && (
              <li className="text-xs text-gray-700">—</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
