import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { FormEvent, useMemo, useState } from "react";
import { api } from "../convex/_generated/api";

type EpdsOption = {
  label: string;
  score: number;
};

type EpdsQuestion = {
  id: number;
  text: string;
  options: EpdsOption[];
};

const QUESTIONS: EpdsQuestion[] = [
  {
    id: 1,
    text: "I have been able to laugh and see the funny side of things.",
    options: [
      { label: "Yes, all the time", score: 0 },
      { label: "Yes, most of the time", score: 1 },
      { label: "No, not very often", score: 2 },
      { label: "No, never", score: 3 },
    ],
  },
  {
    id: 2,
    text: "I have looked forward with enjoyment to things.",
    options: [
      { label: "As much as I always could", score: 0 },
      { label: "Not quite so much now", score: 1 },
      { label: "Definitely not so much now", score: 2 },
      { label: "Not at all", score: 3 },
    ],
  },
  {
    id: 3,
    text: "I have blamed myself unnecessarily when things went wrong.",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, some of the time", score: 2 },
      { label: "Not very often", score: 1 },
      { label: "No, never", score: 0 },
    ],
  },
  {
    id: 4,
    text: "I have been anxious or worried for no good reason.",
    options: [
      { label: "Not, not at all", score: 0 },
      { label: "Hardly ever", score: 1 },
      { label: "Yes, sometimes", score: 2 },
      { label: "Yes, very often", score: 3 },
    ],
  },
  {
    id: 5,
    text: "I have felt scared or panicky for no good reason.",
    options: [
      { label: "Yes, quite a lot", score: 3 },
      { label: "Yes, sometimes", score: 2 },
      { label: "No, not much", score: 1 },
      { label: "No, not at all", score: 0 },
    ],
  },
  {
    id: 6,
    text: "Things have been getting on top of me.",
    options: [
      {
        label: "Yes, most of the time I haven't been able to cope at all",
        score: 3,
      },
      {
        label: "Yes, sometimes I haven't been coping as well as usual",
        score: 2,
      },
      {
        label: "No, most of the time I have coped quite well",
        score: 1,
      },
      {
        label: "No, I have been coping as well as ever",
        score: 0,
      },
    ],
  },
  {
    id: 7,
    text: "I have been so unhappy that I have difficulty sleeping.",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, sometimes", score: 2 },
      { label: "Not very often", score: 1 },
      { label: "No, not at all", score: 0 },
    ],
  },
  {
    id: 8,
    text: "I have felt sad or miserable.",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, quite often", score: 2 },
      { label: "Not very often", score: 1 },
      { label: "No, not at all", score: 0 },
    ],
  },
  {
    id: 9,
    text: "I have been so unhappy that I have been crying.",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, quite often", score: 2 },
      { label: "Only occasionally", score: 1 },
      { label: "No, never", score: 0 },
    ],
  },
  {
    id: 10,
    text: "The thought of harming myself has occurred to me.",
    options: [
      { label: "Yes, quite often", score: 3 },
      { label: "Sometimes", score: 2 },
      { label: "Hardly ever", score: 1 },
      { label: "Never", score: 0 },
    ],
  },
];

type Answers = Record<number, number>;
type ReminderCadence = "none" | "weekly" | "monthly";

function calculateScore(answers: Answers) {
  return QUESTIONS.reduce((total, question) => {
    const selectedOptionIndex = answers[question.id];
    return total + (question.options[selectedOptionIndex]?.score ?? 0);
  }, 0);
}

function answersToArray(answers: Answers) {
  return QUESTIONS.map((question) => answers[question.id] ?? -1);
}

function getScoreInterpretation(score: number) {
  if (score >= 20) {
    return {
      label: "More serious signal",
      description:
        "A score of 20 or more is described as signaling a more serious depression concern.",
    };
  }

  if (score >= 10) {
    return {
      label: "Mild-depression signal",
      description:
        "Doctors typically use a cutoff of 10 or 12 as a signal of mild depression.",
    };
  }

  return {
    label: "Below common cutoff",
    description:
      "This total is below the common 10 to 12 cutoff described for mild depression screening.",
  };
}

export default function App() {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [reminderCadence, setReminderCadence] =
    useState<ReminderCadence | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedResultSignature, setSavedResultSignature] = useState<
    string | null
  >(null);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const saveResult = useMutation(api.epds.saveResult);
  const recentResults = useQuery(api.epds.listMyResults);
  const reminderPreference = useQuery(api.epds.getReminderPreference);

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === QUESTIONS.length;
  const score = useMemo(() => calculateScore(answers), [answers]);
  const scoreInterpretation = getScoreInterpretation(score);
  const answerValues = useMemo(() => answersToArray(answers), [answers]);
  const currentResultSignature = `${score}:${answerValues.join(",")}`;
  const isResultSaved = savedResultSignature === currentResultSignature;
  const selectedReminderCadence =
    reminderCadence ?? reminderPreference?.cadence ?? "weekly";

  async function handleSaveResult() {
    if (!isComplete || !isAuthenticated || isSavingResult) {
      return;
    }

    setIsSavingResult(true);
    setSaveError(null);

    try {
      await saveResult({
        answers: answerValues,
        reminderCadence: selectedReminderCadence,
        score,
      });
      setSavedResultSignature(currentResultSignature);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save this result.",
      );
    } finally {
      setIsSavingResult(false);
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
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#765f45]">
            In the past 7 days
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            Edinburgh Postnatal Depression Scale
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#5b554f]">
            Answer each question, then submit to see your score. You can use the
            form before logging in.
          </p>
          <p className="mt-3 rounded-md border border-[#d6cec2] bg-[#fffdf9] px-3 py-2 text-sm leading-6 text-[#5b554f]">
            Each answer scores 0 to 3. Questions 1, 2, and 4 score left to
            right; questions 3 and 5 through 10 score right to left.
          </p>
        </section>

        {submitted && (
          <div className="flex flex-col gap-4">
            <section
              aria-live="polite"
              className="rounded-lg border border-[#244736] bg-[#315d47] px-4 py-5 text-white shadow-sm sm:px-6"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#d8ead5]">
                Score
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                <p className="text-5xl font-bold">{score}</p>
                <p className="pb-1 text-lg font-semibold text-[#eef6ec]">
                  {scoreInterpretation.label}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#eef6ec]">
                Out of 30. {scoreInterpretation.description}
              </p>
            </section>

            {isLoading ? (
              <section className="rounded-lg border border-[#d6cec2] bg-white px-4 py-5 shadow-sm sm:px-6">
                <p className="text-sm leading-6 text-[#5b554f]">
                  Checking sign-in status...
                </p>
              </section>
            ) : isAuthenticated ? (
              <ResultStoragePanel
                isResultSaved={isResultSaved}
                isSavingResult={isSavingResult}
                recentResults={recentResults}
                reminderCadence={selectedReminderCadence}
                saveError={saveError}
                onReminderCadenceChange={setReminderCadence}
                onSaveResult={() => void handleSaveResult()}
              />
            ) : (
              <AuthPrompt />
            )}
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
                setSaveError(null);
              }}
            />
          ))}

          <div className="pb-4 pt-2">
            <button
              className="min-h-14 w-full rounded-md bg-[#315d47] px-5 py-3 text-base font-bold text-white shadow-sm transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#b9b1a8] disabled:text-[#5b554f] sm:w-auto"
              disabled={!isComplete}
              type="submit"
            >
              {isComplete
                ? "Show score"
                : `Answer ${QUESTIONS.length - answeredCount} more`}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function ResultStoragePanel({
  isResultSaved,
  isSavingResult,
  recentResults,
  reminderCadence,
  saveError,
  onReminderCadenceChange,
  onSaveResult,
}: {
  isResultSaved: boolean;
  isSavingResult: boolean;
  recentResults:
    | Array<{ _id: string; _creationTime: number; score: number }>
    | undefined;
  reminderCadence: ReminderCadence;
  saveError: string | null;
  onReminderCadenceChange: (cadence: ReminderCadence) => void;
  onSaveResult: () => void;
}) {
  const { signOut } = useAuthActions();

  return (
    <section className="rounded-lg border border-[#d6cec2] bg-white px-4 py-5 shadow-sm sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#765f45]">
            Save privately
          </p>
          <h2 className="mt-1 text-xl font-bold leading-7">
            Store this result and set reminders
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

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-[#3b3631]">
          Reminder cadence
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" },
            { label: "No reminders", value: "none" },
          ].map((option) => (
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
                onChange={() =>
                  onReminderCadenceChange(option.value as ReminderCadence)
                }
                type="radio"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="min-h-12 rounded-md bg-[#315d47] px-5 py-3 text-base font-bold text-white shadow-sm transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#b9b1a8] disabled:text-[#5b554f]"
          disabled={isResultSaved || isSavingResult}
          onClick={onSaveResult}
          type="button"
        >
          {isResultSaved
            ? "Result saved"
            : isSavingResult
              ? "Saving..."
              : "Save result"}
        </button>
        {saveError !== null && (
          <p className="text-sm font-semibold text-[#8a3324]">{saveError}</p>
        )}
      </div>

      {recentResults !== undefined && recentResults.length > 0 && (
        <div className="mt-5 border-t border-[#e5ddd2] pt-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#765f45]">
            Recent scores
          </h3>
          <ol className="mt-2 flex flex-col gap-2">
            {recentResults.map((result) => (
              <li
                className="flex items-center justify-between gap-3 rounded-md bg-[#fbfaf8] px-3 py-2 text-sm text-[#3b3631]"
                key={result._id}
              >
                <span>{new Date(result._creationTime).toLocaleString()}</span>
                <span className="font-bold">{result.score}/30</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function AuthPrompt() {
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
      setAuthError(
        error instanceof Error ? error.message : "Could not sign in.",
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  return (
    <section className="rounded-lg border border-[#d6cec2] bg-white px-4 py-5 shadow-sm sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#765f45]">
        Optional
      </p>
      <h2 className="mt-1 text-xl font-bold leading-7">
        Log in to save this result and set reminders
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#5b554f]">
        Your answers stay on this device unless you choose to sign in.
      </p>

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
            ? "Working..."
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
        <span className="mr-1">{question.id}.</span>
        {" "}
        {question.text}
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
