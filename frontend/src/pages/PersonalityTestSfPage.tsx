import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import { getCharacterImage } from "../lib/characterImages";
import {
  getSfPersonalityQuestions,
  getSfPersonalityStats,
  resolveSfCharacter,
  resolveSfEra,
  resolveSfFamily,
  resolveSfSubfamily,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import type {
  SFQuestion,
  SFQuestionsResponse,
  SFStatsResponse,
} from "../lib/types";

const FAMILY_LABELS: Record<string, string> = {
  disciplinados: "Los Disciplinados en Paz",
  atormentados: "Los Atormentados",
  protectores: "Los Protectores Modernos",
  ambiciosos: "Los Ambiciosos Calculadores",
  libres_cercanos: "Los Libres: Los Cercanos",
  libres_solitarios: "Los Libres: Los Solitarios",
};

const FAMILY_DESCRIPTIONS: Record<string, string> = {
  disciplinados:
    "Ya hiciste las paces con tu pasado. Tu fuerza viene de la calma, no de la furia.",
  atormentados:
    "Cargas con algo que todavía no resolviste del todo, y eso te empuja a seguir peleando.",
  protectores:
    "No peleas solo por ti. Tu gente es la razón real detrás de cada decisión.",
  ambiciosos:
    "El poder y el control pesan más que cualquier otra cosa en tu forma de ver el mundo.",
  libres_cercanos:
    "Vives a tu manera, sin mucha jerarquía, pero siempre con tu gente cerca.",
  libres_solitarios:
    "Vives a tu manera, sin mucha jerarquía, y prefieres manejarte por tu cuenta.",
};

type Step = "nivel1" | "nivel1_5" | "nivel2" | "era" | "resultado";

/** Test de personalidad de Street Fighter (Alpha → SF6) — sistema de
 * matching por vectores de 5 rasgos, armado y validado en una sesión
 * de diseño completa (13-09-2026, ver documento consolidado del
 * proyecto). Flujo en 3 niveles: familia (siempre) → subfamilia (solo
 * si caes en "Los Libres", que se divide en Cercanos/Solitarios) →
 * personaje dentro de esa familia/subfamilia → era (solo si el
 * personaje es uno de los 5 con arco documentado: Ryu, Ken, Chun-Li,
 * Sagat, Karin).
 *
 * A propósito no muestra artwork de los personajes de Capcom — mismo
 * criterio que ya se aplicó en /tierlist (SPECS.md §16): el sitio no
 * reproduce el roster de Capcom como contenido propio, solo el
 * nombre del resultado. */
export default function PersonalityTestSfPage() {
  const { token } = useAuth();

  const [questions, setQuestions] = useState<SFQuestionsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("nivel1");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [nivel1Answers, setNivel1Answers] = useState<number[]>([]);
  const [familyKey, setFamilyKey] = useState<string | null>(null);
  const [nivel2Answers, setNivel2Answers] = useState<number[]>([]);
  const [character, setCharacter] = useState<string | null>(null);
  const [eraAnswers, setEraAnswers] = useState<number[]>([]);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [stats, setStats] = useState<SFStatsResponse | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    getSfPersonalityQuestions()
      .then(setQuestions)
      .catch((e) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (step === "resultado") {
      getSfPersonalityStats()
        .then(setStats)
        .catch(() => {
          // las estadísticas son un extra, no bloquean ver el resultado
        });
    }
  }, [step]);

  // se resetea cada vez que cambia el resultado -- si no, repetir el
  // test y sacar un personaje CON imagen después de uno SIN imagen
  // arrastraría el estado de error viejo y la escondería sin motivo
  useEffect(() => {
    setImageFailed(false);
  }, [finalResult]);

  function restart() {
    setStep("nivel1");
    setQuestionIndex(0);
    setNivel1Answers([]);
    setFamilyKey(null);
    setNivel2Answers([]);
    setCharacter(null);
    setEraAnswers([]);
    setFinalResult(null);
    setSubmitError(null);
  }

  async function handleShare() {
    if (!finalResult) return;
    const texto = `Saqué a ${finalResult} en el test de personalidad de TDF e-deportes. Descubrí el tuyo:`;
    const url = window.location.origin + "/test-personalidad";

    // Web Share API primero (funciona mejor en mobile, abre el menú
    // nativo de compartir) -- si no está disponible, se copia el
    // texto al portapapeles como respaldo
    if (navigator.share) {
      try {
        await navigator.share({ text: texto, url });
        return;
      } catch {
        // el usuario cerró el selector de compartir sin elegir nada
        // -- no es un error real, no hace falta mostrar nada
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${texto} ${url}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      // clipboard tampoco disponible -- caso raro, se deja pasar
      // en silencio en vez de mostrar un error que no ayuda en nada
    }
  }

  async function handleNivel1Answer(idx: number) {
    if (!questions) return;
    const answers = [...nivel1Answers, idx];
    setNivel1Answers(answers);

    if (answers.length < questions.nivel1.length) {
      setQuestionIndex(answers.length);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await resolveSfFamily(answers);
      if (res.needs_subfamily_split) {
        setFamilyKey("libres");
        setStep("nivel1_5");
      } else {
        setFamilyKey(res.family);
        setStep("nivel2");
      }
      setQuestionIndex(0);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNivel15Answer(idx: number) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await resolveSfSubfamily(idx);
      setFamilyKey(res.subfamily);
      setStep("nivel2");
      setQuestionIndex(0);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNivel2Answer(idx: number) {
    if (!questions || !familyKey) return;
    const preguntasNivel2 = questions.nivel2_por_familia[familyKey] ?? [];
    const answers = [...nivel2Answers, idx];
    setNivel2Answers(answers);

    if (answers.length < preguntasNivel2.length) {
      setQuestionIndex(answers.length);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await resolveSfCharacter(token, familyKey, answers);
      if (res.needs_era) {
        setCharacter(res.character);
        setStep("era");
        setQuestionIndex(0);
      } else {
        setFinalResult(res.final_result);
        setStep("resultado");
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEraAnswer(idx: number) {
    if (!questions || !character) return;
    const eraQuestions =
      character === "Ken" ? [questions.era_ken] : questions.era_generica;
    const answers = [...eraAnswers, idx];
    setEraAnswers(answers);

    if (answers.length < eraQuestions.length) {
      setQuestionIndex(answers.length);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await resolveSfEra(token, character, answers);
      setFinalResult(res.final_result);
      setStep("resultado");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16">
          <SectionLabel index="01">Test de personalidad</SectionLabel>
          <p className="text-tdf-muted">
            No se pudo cargar el test ahora mismo. Probá recargando la página.
          </p>
        </div>
      </Layout>
    );
  }

  if (!questions) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col gap-4">
          <SectionLabel index="01">Test de personalidad</SectionLabel>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Layout>
    );
  }

  let currentQuestion: SFQuestion | null = null;
  let onAnswer: ((idx: number) => void) | null = null;
  let progressLabel = "";

  if (step === "nivel1") {
    currentQuestion = questions.nivel1[questionIndex];
    onAnswer = handleNivel1Answer;
    progressLabel = `Pregunta ${questionIndex + 1} de ${questions.nivel1.length}`;
  } else if (step === "nivel1_5") {
    currentQuestion = questions.nivel1_5;
    onAnswer = handleNivel15Answer;
    progressLabel = "Una pregunta más";
  } else if (step === "nivel2" && familyKey) {
    const tanda = questions.nivel2_por_familia[familyKey] ?? [];
    currentQuestion = tanda[questionIndex];
    onAnswer = handleNivel2Answer;
    progressLabel = `Pregunta ${questionIndex + 1} de ${tanda.length}`;
  } else if (step === "era" && character) {
    const tanda =
      character === "Ken" ? [questions.era_ken] : questions.era_generica;
    currentQuestion = tanda[questionIndex];
    onAnswer = handleEraAnswer;
    progressLabel =
      tanda.length > 1
        ? `Última pregunta (${questionIndex + 1}/${tanda.length})`
        : "Última pregunta";
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <SectionLabel index="01">Test de personalidad SF</SectionLabel>
        <div className="flex items-start justify-between gap-4 mb-8">
          <h1 className="font-display font-bold uppercase text-3xl">
            ¿Qué personaje eres según tu forma de pelear la vida?
          </h1>
          <Link
            to="/test-personalidad/ranking"
            className="shrink-0 font-mono text-[11px] uppercase text-tdf-purple hover:text-tdf-magenta transition-colors whitespace-nowrap"
          >
            Ver ranking →
          </Link>
        </div>

        {submitError && (
          <p className="font-mono text-xs text-tdf-magenta mb-4">
            {submitError}
          </p>
        )}

        <AnimatePresence mode="wait">
          {step !== "resultado" && currentQuestion && onAnswer && (
            <motion.div
              key={`${step}-${questionIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="hud-frame bg-tdf-charcoal border border-tdf-line p-6"
            >
              <p className="font-mono text-[10px] uppercase text-tdf-muted mb-4">
                {progressLabel}
              </p>
              <h2 className="font-display text-xl mb-6">
                {currentQuestion.texto}
              </h2>
              <div className="flex flex-col gap-3">
                {currentQuestion.opciones.map((opcion, i) => (
                  <button
                    key={i}
                    disabled={submitting}
                    onClick={() => onAnswer?.(i)}
                    className="text-left px-4 py-3 border border-tdf-line hover:border-tdf-magenta hover:bg-tdf-magenta/10 transition-colors disabled:opacity-50 font-body text-sm"
                  >
                    {opcion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "resultado" && finalResult && (
            <motion.div
              key="resultado"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="hud-frame bg-tdf-charcoal border border-tdf-magenta p-8 text-center"
            >
              <p className="font-mono text-xs uppercase text-tdf-muted mb-2">
                Tu resultado
              </p>
              {!imageFailed && getCharacterImage(finalResult) && (
                <img
                  src={getCharacterImage(finalResult) ?? undefined}
                  alt={finalResult}
                  onError={() => setImageFailed(true)}
                  className="w-32 h-32 object-cover mx-auto mb-4 border-2 border-tdf-magenta"
                />
              )}
              <p className="font-display font-bold uppercase text-4xl bg-clip-text text-transparent bg-gradient-to-r from-tdf-magenta to-tdf-purple mb-2">
                {finalResult}
              </p>
              {familyKey && FAMILY_LABELS[familyKey] && (
                <p className="font-mono text-[11px] uppercase text-tdf-muted mb-2">
                  {FAMILY_LABELS[familyKey]}
                </p>
              )}
              {familyKey && FAMILY_DESCRIPTIONS[familyKey] && (
                <p className="font-body text-sm text-tdf-muted max-w-sm mx-auto mb-4">
                  {FAMILY_DESCRIPTIONS[familyKey]}
                </p>
              )}

              {stats && stats.total_results > 0 && (
                <p className="font-mono text-xs text-tdf-muted mb-6">
                  {stats.by_character.find(
                    (s) => s.character_name === finalResult,
                  )?.percentage ?? 0}
                  % de la comunidad de TDF sacó este mismo resultado
                </p>
              )}

              {!token && (
                <p className="font-mono text-[11px] text-tdf-muted mb-6">
                  Iniciá sesión para que tu resultado quede guardado y
                  contribuya a las estadísticas de la comunidad.
                </p>
              )}

              <div className="flex flex-wrap justify-center gap-3 mb-4">
                <button
                  onClick={restart}
                  className="bg-tdf-magenta hover:bg-tdf-purple transition-colors px-4 py-2 font-mono text-xs uppercase text-white"
                >
                  Repetir el test
                </button>
                <button
                  onClick={handleShare}
                  className="border border-tdf-line hover:border-tdf-magenta transition-colors px-4 py-2 font-mono text-xs uppercase text-tdf-muted hover:text-white"
                >
                  {shareCopied ? "¡Copiado!" : "Compartir"}
                </button>
              </div>

              <Link
                to="/test-personalidad/ranking"
                className="font-mono text-[11px] uppercase text-tdf-purple hover:text-tdf-magenta transition-colors"
              >
                Ver el ranking de la comunidad →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
