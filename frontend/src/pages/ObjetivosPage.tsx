import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import QuarterlyGoals from "../components/QuarterlyGoals";
import SectionLabel from "../components/SectionLabel";
import { listGoals } from "../lib/api";
import type { QuarterlyGoal as QuarterlyGoalType } from "../lib/types";

export default function ObjetivosPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [goals, setGoals] = useState<QuarterlyGoalType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listGoals(year)
      .then(setGoals)
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <Layout>
      <SectionLabel index="06">Hoja de ruta pública</SectionLabel>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Objetivos {year}</h1>
        <div className="flex gap-2 font-mono text-xs">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="border border-tdf-line hover:border-tdf-magenta px-3 py-1"
          >
            ← {year - 1}
          </button>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="border border-tdf-line hover:border-tdf-magenta px-3 py-1"
          >
            {year + 1} →
          </button>
        </div>
      </div>

      <QuarterlyGoals goals={goals} loading={loading} />
    </Layout>
  );
}
