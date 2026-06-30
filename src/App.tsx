import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { EpdsQuestion, QUESTIONS } from "./epdsQuestions";

type Answers = Record<number, number>;
type ReminderCadence = "biweekly" | "weekly" | "monthly";
const REMINDER_CADENCE_OPTIONS: Array<{
  label: string;
  value: ReminderCadence;
}> = [
  { label: "Every week", value: "weekly" },
  { label: "Every 2 weeks", value: "biweekly" },
  { label: "Every month", value: "monthly" },
];
const REMINDER_CADENCE_LABELS: Record<ReminderCadence, string> = {
  biweekly: "Every 2 weeks",
  weekly: "Weekly",
  monthly: "Monthly",
};

function ordinal(day: number): string {
  const remainderTen = day % 10;
  const remainderHundred = day % 100;
  if (remainderTen === 1 && remainderHundred !== 11) return `${day}st`;
  if (remainderTen === 2 && remainderHundred !== 12) return `${day}nd`;
  if (remainderTen === 3 && remainderHundred !== 13) return `${day}rd`;
  return `${day}th`;
}

function describeReminderCadence(
  cadence: ReminderCadence,
  nextReminderAt: number | null | undefined,
): string {
  if (nextReminderAt === null || nextReminderAt === undefined) {
    return REMINDER_CADENCE_LABELS[cadence];
  }

  const date = new Date(nextReminderAt);

  if (cadence === "monthly") {
    return `Monthly on the ${ordinal(date.getDate())}`;
  }

  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });

  if (cadence === "biweekly") {
    return `Every 2 weeks on ${weekday}s`;
  }

  return `Weekly on ${weekday}s`;
}
type SavedResult = {
  _id: Id<"epdsResults">;
  _creationTime: number;
  score: number;
};

const SCORE_CHART = {
  height: 240,
  left: 36,
  right: 14,
  top: 16,
  bottom: 42,
  width: 640,
} as const;

function formatChartDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function calculateScore(answers: Answers) {
  return QUESTIONS.reduce((total, question) => {
    const selectedOptionIndex = answers[question.id];
    return total + (question.options[selectedOptionIndex]?.score ?? 0);
  }, 0);
}

function answersToArray(answers: Answers) {
  return QUESTIONS.map((question) => answers[question.id] ?? -1);
}

function getAuthErrorMessage(error: unknown, authMode: "signIn" | "signUp") {
  const defaultSignInMessage =
    "We couldn't sign you in. Check your email and password, then try again.";
  const invalidCredentialsMessage =
    "We couldn't sign you in with that email and password.";

  if (!(error instanceof Error)) {
    return authMode === "signIn"
      ? defaultSignInMessage
      : "We couldn't create your account. Check your details and try again.";
  }

  if (
    authMode === "signIn" &&
    (error.message.includes("Invalid credentials") ||
      error.message.includes("InvalidAccountId") ||
      error.message.includes("InvalidSecret"))
  ) {
    return invalidCredentialsMessage;
  }

  return authMode === "signIn"
    ? defaultSignInMessage
    : "We couldn't create your account. Check your details and try again.";
}

function getScoreInterpretation(score: number) {
  if (score >= 13) {
    return {
      label: "Please talk to a healthcare professional",
      description:
        "Your answers suggest you may need more support. Contact your doctor, midwife, or public health nurse soon.",
    };
  }

  if (score >= 10) {
    return {
      label: "Consider checking in with someone",
      description:
        "Your answers suggest you've been having a difficult time. Talk to your doctor, midwife, or public health nurse, and consider checking in again in 2 to 4 weeks.",
    };
  }

  return {
    label: "No extra support suggested right now",
    description:
      "If something doesn't feel right, you can still talk to your doctor, midwife, or public health nurse.",
  };
}

export default function App() {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [reminderCadence, setReminderCadence] =
    useState<ReminderCadence | null>(null);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [savedResultSignature, setSavedResultSignature] = useState<
    string | null
  >(null);
  const pendingSaveSignatureRef = useRef<string | null>(null);
  const [isDeletingResult, setIsDeletingResult] =
    useState<Id<"epdsResults"> | null>(null);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [isCancellingReminder, setIsCancellingReminder] = useState(false);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const saveResult = useMutation(api.epds.saveResult);
  const deleteResult = useMutation(api.epds.deleteResult);
  const setReminderPreference = useMutation(api.epds.setReminderPreference);
  const deleteReminderPreference = useMutation(
    api.epds.deleteReminderPreference,
  );
  const recentResults = useQuery(api.epds.listMyResults);
  const reminderPreference = useQuery(api.epds.getReminderPreference);

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === QUESTIONS.length;
  const score = useMemo(() => calculateScore(answers), [answers]);
  const scoreInterpretation = getScoreInterpretation(score);
  const selfHarmScore =
    QUESTIONS.find((question) => question.id === 10)?.options[answers[10]]
      ?.score ?? 0;
  const answerValues = useMemo(() => answersToArray(answers), [answers]);
  const currentResultSignature = `${score}:${answerValues.join(",")}`;
  const activeReminderCadence =
    reminderPreference?.cadence === "biweekly" ||
    reminderPreference?.cadence === "weekly" ||
    reminderPreference?.cadence === "monthly"
      ? reminderPreference.cadence
      : null;
  const selectedReminderCadence =
    reminderCadence ?? activeReminderCadence ?? "weekly";

  const saveCurrentResult = useCallback(async () => {
    if (
      !isComplete ||
      !isAuthenticated ||
      savedResultSignature === currentResultSignature ||
      pendingSaveSignatureRef.current === currentResultSignature
    ) {
      return;
    }

    const signatureToSave = currentResultSignature;
    pendingSaveSignatureRef.current = signatureToSave;

    try {
      await saveResult({
        answers: answerValues,
        score,
      });
      setSavedResultSignature(signatureToSave);
    } catch (error) {
      console.error("Could not save this result.", error);
    } finally {
      if (pendingSaveSignatureRef.current === signatureToSave) {
        pendingSaveSignatureRef.current = null;
      }
    }
  }, [
    answerValues,
    currentResultSignature,
    isAuthenticated,
    isComplete,
    saveResult,
    savedResultSignature,
    score,
  ]);

  useEffect(() => {
    if (!submitted || isLoading) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      void saveCurrentResult();
    }, 0);

    return () => window.clearTimeout(saveTimer);
  }, [isLoading, saveCurrentResult, submitted]);

  async function handleDeleteResult(resultId: Id<"epdsResults">) {
    if (
      isDeletingResult !== null ||
      !window.confirm("Delete this result? This cannot be undone.")
    ) {
      return;
    }

    setIsDeletingResult(resultId);
    setDeleteError(null);

    try {
      await deleteResult({ resultId });
    } catch {
      setDeleteError("We couldn't delete this result. Please try again.");
    } finally {
      setIsDeletingResult(null);
    }
  }

  async function handleSaveReminder() {
    if (!isAuthenticated || isSavingReminder) {
      return;
    }

    setIsSavingReminder(true);
    setReminderError(null);

    try {
      await setReminderPreference({ cadence: selectedReminderCadence });
    } catch {
      setReminderError("We couldn't save your reminder. Please try again.");
    } finally {
      setIsSavingReminder(false);
    }
  }

  async function handleCancelReminder() {
    if (isCancellingReminder || !window.confirm("Turn off email reminders?")) {
      return;
    }

    setIsCancellingReminder(true);
    setReminderError(null);

    try {
      await deleteReminderPreference({});
      setReminderCadence(null);
    } catch {
      setReminderError("We couldn't turn off reminders. Please try again.");
    } finally {
      setIsCancellingReminder(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isComplete) {
      setSubmitted(false);
      return;
    }

    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-[#f7f3ed] text-[#23201d]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <section className="rounded-lg border border-[#d6cec2] bg-white px-4 py-5 shadow-sm sm:px-6">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            How have you been feeling?
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#5b554f]">
            Take a moment to check in with how you've felt over the past 7 days.
            This check-in is based on the Edinburgh Postnatal Depression Scale
            (EPDS).
          </p>
          {!isLoading && !isAuthenticated && !submitted && (
            <button
              className="mt-4 min-h-10 rounded-md border border-[#d6cec2] px-3 py-2 text-sm font-semibold text-[#3b3631] transition active:scale-[0.99]"
              onClick={() => setShowAuthPanel((current) => !current)}
              type="button"
            >
              {showAuthPanel ? "Close sign-in" : "Sign in"}
            </button>
          )}
        </section>

        {!isLoading && !isAuthenticated && showAuthPanel && !submitted && (
          <AuthPrompt
            description="Sign in to see your past check-ins and manage email reminders."
            title="Your account"
          />
        )}

        {!isLoading && isAuthenticated && (
          <AccountPanel
            activeReminderCadence={activeReminderCadence}
            activeReminderNextAt={reminderPreference?.nextReminderAt ?? null}
            deleteError={deleteError}
            isCancellingReminder={isCancellingReminder}
            isDeletingResult={isDeletingResult}
            isSavingReminder={isSavingReminder}
            recentResults={recentResults}
            reminderCadence={selectedReminderCadence}
            reminderError={reminderError}
            onCancelReminder={() => void handleCancelReminder()}
            onDeleteResult={(resultId) => void handleDeleteResult(resultId)}
            onReminderCadenceChange={setReminderCadence}
            onSaveReminder={() => void handleSaveReminder()}
          />
        )}

        {submitted && (
          <div className="flex flex-col gap-4">
            <section
              aria-live="polite"
              className="rounded-lg border border-[#244736] bg-[#315d47] px-4 py-5 text-white shadow-sm sm:px-6"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#d8ead5]">
                Your result
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-8">
                {scoreInterpretation.label}
              </h2>
              <p className="mt-2 text-base leading-7 text-[#eef6ec]">
                {scoreInterpretation.description}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#d8ead5]">
                Your score is {score} out of 30. This check-in cannot diagnose
                depression.
              </p>
            </section>

            {selfHarmScore > 0 && <ImmediateSupport />}

            {isLoading ? (
              <section className="rounded-lg border border-[#d6cec2] bg-white px-4 py-5 shadow-sm sm:px-6">
                <p className="text-sm leading-6 text-[#5b554f]">
                  Checking sign-in status...
                </p>
              </section>
            ) : !isAuthenticated ? (
              <AuthPrompt
                description="Your result hasn't been saved. Sign in or create an account to keep it and compare future check-ins."
                title="Save this result"
              />
            ) : null}
          </div>
        )}

        <form
          aria-labelledby="questionnaire-timeframe"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <div className="px-1 pt-1">
            <h2
              className="text-xl font-bold leading-7 text-[#23201d]"
              id="questionnaire-timeframe"
            >
              In the past 7 days:
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#5b554f]">
              Please check the answer that comes closest to how you have felt,
              not just how you feel today.
            </p>
          </div>

          {QUESTIONS.map((question) => (
            <QuestionField
              key={question.id}
              answer={answers[question.id]}
              question={question}
              onChange={(optionIndex) => {
                setAnswers((currentAnswers) => ({
                  ...currentAnswers,
                  [question.id]: optionIndex,
                }));
                setSubmitted(false);
              }}
            />
          ))}

          <div className="pb-4 pt-2">
            <p
              aria-live="polite"
              className="mb-2 text-sm font-semibold text-[#5b554f]"
            >
              {answeredCount} of {QUESTIONS.length} answered
            </p>
            <button
              className="min-h-14 w-full rounded-md bg-[#315d47] px-5 py-3 text-base font-bold text-white shadow-sm transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#b9b1a8] disabled:text-[#5b554f] sm:w-auto"
              disabled={!isComplete}
              type="submit"
            >
              See my result
            </button>
          </div>
        </form>

        <footer className="px-1 pb-4 text-xs leading-5 text-[#6f6861]">
          <p>
            Edinburgh Postnatal Depression Scale (EPDS). Source: Cox, J.L.,
            Holden, J.M., and Sagovsky, R. (1987). “Detection of postnatal
            depression: Development of the 10-item Edinburgh Postnatal
            Depression Scale.” British Journal of Psychiatry, 150, 782–786.
          </p>
        </footer>
      </div>
    </main>
  );
}

function ImmediateSupport() {
  return (
    <section
      className="rounded-lg border-2 border-[#8a3324] bg-[#fff7f4] px-4 py-5 text-[#3f1e18] shadow-sm sm:px-6"
      role="alert"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#8a3324]">
        Support is available
      </p>
      <h2 className="mt-1 text-2xl font-bold leading-8">
        Please reach out now
      </h2>
      <p className="mt-2 text-base leading-7">
        You said you've had thoughts of harming yourself. Tell someone you trust
        and contact a healthcare professional today.
      </p>
      <p className="mt-3 text-base leading-7">
        If you might act on these thoughts or you're in immediate danger, call{" "}
        <a className="font-bold underline" href="tel:113">
          113
        </a>{" "}
        now. If it cannot wait for your doctor, call{" "}
        <a className="font-bold underline" href="tel:116117">
          116 117
        </a>
        . You can also call Mental Helse on{" "}
        <a className="font-bold underline" href="tel:116123">
          116 123
        </a>{" "}
        to talk to someone.
      </p>
      <p className="mt-3 text-sm leading-6 text-[#6b3127]">
        These numbers are for Norway. If you're elsewhere, call your local
        emergency number.
      </p>
    </section>
  );
}

function ScoreChart({ results }: { results: SavedResult[] }) {
  const titleId = useId();
  const descriptionId = useId();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(SCORE_CHART.width);
  const chronologicalResults = [...results].sort(
    (first, second) => first._creationTime - second._creationTime,
  );
  const plotWidth = chartWidth - SCORE_CHART.left - SCORE_CHART.right;
  const plotHeight = SCORE_CHART.height - SCORE_CHART.top - SCORE_CHART.bottom;
  const xForIndex = (index: number) =>
    chronologicalResults.length === 1
      ? SCORE_CHART.left + plotWidth / 2
      : SCORE_CHART.left +
        (index / (chronologicalResults.length - 1)) * plotWidth;
  const yForScore = (score: number) =>
    SCORE_CHART.top +
    ((30 - Math.max(0, Math.min(30, score))) / 30) * plotHeight;
  const points = chronologicalResults
    .map((result, index) => `${xForIndex(index)},${yForScore(result.score)}`)
    .join(" ");
  const firstResult = chronologicalResults[0];
  const lastResult = chronologicalResults[chronologicalResults.length - 1];
  const dateLabelY = SCORE_CHART.height - 13;
  const yTicks = [30, 20, 10, 0];

  useEffect(() => {
    const container = chartContainerRef.current;
    if (container === null) {
      return;
    }

    const updateChartWidth = () => {
      setChartWidth(Math.max(280, container.clientWidth));
    };
    const resizeObserver = new ResizeObserver(updateChartWidth);

    updateChartWidth();
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <figure className="mt-3 rounded-md border border-[#e5ddd2] bg-[#fbfaf8] p-3">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-bold text-[#23201d]">Score over time</span>
        <span className="text-xs text-[#6f6861]">
          {results.length} {results.length === 1 ? "check-in" : "check-ins"}
        </span>
      </figcaption>
      <div ref={chartContainerRef}>
        <svg
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="mt-2 block h-auto w-full"
          role="img"
          viewBox={`0 0 ${chartWidth} ${SCORE_CHART.height}`}
        >
          <title id={titleId}>EPDS scores over time</title>
          <desc id={descriptionId}>
            Scores from zero to thirty, ordered from oldest to newest.
          </desc>

          {yTicks.map((tick) => {
            const y = yForScore(tick);

            return (
              <g key={tick}>
                <line
                  stroke={tick === 0 ? "#b8afa4" : "#ded7ce"}
                  strokeWidth="1"
                  x1={SCORE_CHART.left}
                  x2={chartWidth - SCORE_CHART.right}
                  y1={y}
                  y2={y}
                />
                <text
                  fill="#6f6861"
                  fontSize="12"
                  textAnchor="end"
                  x={SCORE_CHART.left - 8}
                  y={y + 4}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {chronologicalResults.length > 1 && (
            <polyline
              fill="none"
              points={points}
              stroke="#315d47"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          )}

          {chronologicalResults.map((result, index) => (
            <circle
              cx={xForIndex(index)}
              cy={yForScore(result.score)}
              fill="#ffffff"
              key={result._id}
              r="5"
              stroke="#315d47"
              strokeWidth="3"
            >
              <title>
                {new Date(result._creationTime).toLocaleString()}:{" "}
                {result.score} out of 30
              </title>
            </circle>
          ))}

          {firstResult !== undefined && (
            <text
              fill="#6f6861"
              fontSize="12"
              textAnchor={
                chronologicalResults.length === 1 ? "middle" : "start"
              }
              x={xForIndex(0)}
              y={dateLabelY}
            >
              {formatChartDate(firstResult._creationTime)}
            </text>
          )}
          {lastResult !== undefined && chronologicalResults.length > 1 && (
            <text
              fill="#6f6861"
              fontSize="12"
              textAnchor="end"
              x={xForIndex(chronologicalResults.length - 1)}
              y={dateLabelY}
            >
              {formatChartDate(lastResult._creationTime)}
            </text>
          )}
        </svg>
      </div>
    </figure>
  );
}

function AccountPanel({
  activeReminderCadence,
  activeReminderNextAt,
  deleteError,
  isCancellingReminder,
  isDeletingResult,
  isSavingReminder,
  recentResults,
  reminderCadence,
  reminderError,
  onCancelReminder,
  onDeleteResult,
  onReminderCadenceChange,
  onSaveReminder,
}: {
  activeReminderCadence: ReminderCadence | null;
  activeReminderNextAt: number | null;
  deleteError: string | null;
  isCancellingReminder: boolean;
  isDeletingResult: Id<"epdsResults"> | null;
  isSavingReminder: boolean;
  recentResults: SavedResult[] | undefined;
  reminderCadence: ReminderCadence;
  reminderError: string | null;
  onCancelReminder: () => void;
  onDeleteResult: (resultId: Id<"epdsResults">) => void;
  onReminderCadenceChange: (cadence: ReminderCadence) => void;
  onSaveReminder: () => void;
}) {
  const { signOut } = useAuthActions();
  const hasResults = recentResults !== undefined && recentResults.length > 0;

  return (
    <section className="rounded-lg border border-[#d6cec2] bg-white px-4 py-5 shadow-sm sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold leading-7">
            Past check-ins and reminders
          </h2>
        </div>
        <button
          className="min-h-10 rounded-md border border-[#d6cec2] px-3 py-2 text-sm font-semibold text-[#3b3631] transition active:scale-[0.99]"
          onClick={() => void signOut()}
          type="button"
        >
          Sign out
        </button>
      </div>

      <div className="mt-5 grid gap-5">
        <div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-base font-bold text-[#23201d]">
              Email reminders
            </h3>
            <p className="text-sm text-[#5b554f]">
              {activeReminderCadence === null
                ? "Email reminders are off."
                : describeReminderCadence(
                    activeReminderCadence,
                    activeReminderNextAt,
                  )}
            </p>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#5b554f]">
            Get an email when it's time to check in again.
          </p>
          <fieldset className="mt-3">
            <legend className="sr-only">How often should we email you?</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {REMINDER_CADENCE_OPTIONS.map((option) => (
                <label
                  className={`flex min-h-12 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-semibold transition ${
                    reminderCadence === option.value
                      ? "border-[#315d47] bg-[#e8f0e5] text-[#1d3228]"
                      : "border-[#d6cec2] bg-[#fbfaf8] text-[#3b3631]"
                  }`}
                  key={option.value}
                >
                  <input
                    checked={reminderCadence === option.value}
                    className="sr-only"
                    name="reminderCadence"
                    onChange={() => onReminderCadenceChange(option.value)}
                    type="radio"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              className="min-h-11 rounded-md bg-[#315d47] px-4 py-2 text-sm font-bold text-white shadow-sm transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#b9b1a8] disabled:text-[#5b554f]"
              disabled={isSavingReminder}
              onClick={onSaveReminder}
              type="button"
            >
              {isSavingReminder
                ? "Saving..."
                : activeReminderCadence === null
                  ? "Turn on reminders"
                  : "Update reminders"}
            </button>
            <button
              className="min-h-11 rounded-md border border-[#d6cec2] px-4 py-2 text-sm font-semibold text-[#3b3631] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:text-[#8d867f]"
              disabled={activeReminderCadence === null || isCancellingReminder}
              onClick={onCancelReminder}
              type="button"
            >
              {isCancellingReminder ? "Turning off..." : "Turn off reminders"}
            </button>
            {reminderError !== null && (
              <p className="text-sm font-semibold text-[#8a3324]">
                {reminderError}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-[#e5ddd2] pt-4">
          <h3 className="text-base font-bold text-[#23201d]">Past check-ins</h3>
          {recentResults === undefined ? (
            <p className="mt-2 text-sm leading-6 text-[#5b554f]">
              Loading your check-ins...
            </p>
          ) : hasResults ? (
            <>
              <ScoreChart results={recentResults} />
              <ol className="mt-3 flex flex-col gap-2">
                {recentResults.map((result) => (
                  <li
                    className="flex flex-col gap-2 rounded-md bg-[#fbfaf8] px-3 py-2 text-sm text-[#3b3631] sm:flex-row sm:items-center sm:justify-between"
                    key={result._id}
                  >
                    <span>
                      {new Date(result._creationTime).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{result.score}/30</span>
                      <button
                        className="min-h-9 rounded-md border border-[#d6cec2] px-3 py-1 text-sm font-semibold text-[#7a2e22] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:text-[#8d867f]"
                        disabled={isDeletingResult === result._id}
                        onClick={() => onDeleteResult(result._id)}
                        type="button"
                      >
                        {isDeletingResult === result._id
                          ? "Deleting..."
                          : "Delete result"}
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#5b554f]">
              Your past check-ins will appear here.
            </p>
          )}
          {deleteError !== null && (
            <p className="mt-2 text-sm font-semibold text-[#8a3324]">
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function AuthPrompt({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  const { signIn } = useAuthActions();
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      await signIn("password", {
        email,
        flow: authMode,
        password,
      });
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, authMode));
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  return (
    <section className="rounded-lg border border-[#d6cec2] bg-white px-4 py-5 shadow-sm sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#765f45]">
        Optional
      </p>
      <h2 className="mt-1 text-xl font-bold leading-7">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5b554f]">{description}</p>

      <div className="mt-4 grid grid-cols-2 rounded-md border border-[#d6cec2] bg-[#fbfaf8] p-1">
        {[
          { label: "Sign in", value: "signIn" },
          { label: "Create account", value: "signUp" },
        ].map((option) => (
          <button
            className={`min-h-10 rounded px-3 py-2 text-sm font-semibold transition ${
              authMode === option.value
                ? "bg-white text-[#23201d] shadow-sm"
                : "text-[#5b554f]"
            }`}
            key={option.value}
            onClick={() => {
              setAuthMode(option.value as "signIn" | "signUp");
              setAuthError(null);
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => void handleAuthSubmit(event)}
      >
        <label className="grid gap-1 text-sm font-semibold text-[#3b3631]">
          Email
          <input
            autoComplete="email"
            className="min-h-12 rounded-md border border-[#d6cec2] bg-[#fffdf9] px-3 py-2 text-base font-normal text-[#23201d]"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[#3b3631]">
          Password
          <input
            autoComplete={
              authMode === "signIn" ? "current-password" : "new-password"
            }
            className="min-h-12 rounded-md border border-[#d6cec2] bg-[#fffdf9] px-3 py-2 text-base font-normal text-[#23201d]"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {authMode === "signUp" && (
            <span className="font-normal text-[#5b554f]">
              Use at least 8 characters.
            </span>
          )}
        </label>

        {authError !== null && (
          <p className="text-sm font-semibold text-[#8a3324]">{authError}</p>
        )}

        <button
          className="min-h-12 rounded-md bg-[#315d47] px-5 py-3 text-base font-bold text-white shadow-sm transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#b9b1a8] disabled:text-[#5b554f]"
          disabled={isSubmittingAuth}
          type="submit"
        >
          {isSubmittingAuth
            ? authMode === "signIn"
              ? "Signing in..."
              : "Creating account..."
            : authMode === "signIn"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
    </section>
  );
}

function QuestionField({
  answer,
  question,
  onChange,
}: {
  answer?: number;
  question: EpdsQuestion;
  onChange: (optionIndex: number) => void;
}) {
  const headingId = `question-${question.id}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-lg border border-[#d6cec2] bg-white shadow-sm"
    >
      <h2
        className="border-b border-[#e5ddd2] bg-[#fffdf9] px-4 py-3 text-base font-bold leading-6 text-[#23201d] sm:px-5"
        id={headingId}
      >
        <span className="mr-1">{question.id}.</span> {question.text}
      </h2>
      <div
        aria-labelledby={headingId}
        className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5"
        role="radiogroup"
      >
        {question.options.map((option, optionIndex) => {
          const inputId = `question-${question.id}-option-${optionIndex}`;
          const isSelected = answer === optionIndex;

          return (
            <label
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-base leading-6 transition ${
                isSelected
                  ? "border-[#315d47] bg-[#e8f0e5] text-[#1d3228]"
                  : "border-[#d6cec2] bg-[#fbfaf8] text-[#3b3631]"
              }`}
              htmlFor={inputId}
              key={option.label}
            >
              <input
                checked={isSelected}
                className="h-5 w-5 shrink-0 accent-[#315d47]"
                id={inputId}
                name={`question-${question.id}`}
                onChange={() => onChange(optionIndex)}
                type="radio"
                value={optionIndex}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
