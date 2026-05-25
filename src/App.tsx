import { FormEvent, useMemo, useState } from "react";

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

function calculateScore(answers: Answers) {
  return QUESTIONS.reduce((total, question) => {
    const selectedOptionIndex = answers[question.id];
    return total + (question.options[selectedOptionIndex]?.score ?? 0);
  }, 0);
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

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === QUESTIONS.length;
  const score = useMemo(() => calculateScore(answers), [answers]);
  const scoreInterpretation = getScoreInterpretation(score);

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
            Answer each question, then submit to see your score. This version
            does not save answers.
          </p>
          <p className="mt-3 rounded-md border border-[#d6cec2] bg-[#fffdf9] px-3 py-2 text-sm leading-6 text-[#5b554f]">
            Each answer scores 0 to 3. Questions 1, 2, and 4 score left to
            right; questions 3 and 5 through 10 score right to left.
          </p>
        </section>

        {submitted && (
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
              Out of 30. {scoreInterpretation.description} This result is only
              shown on this device and is not stored.
            </p>
          </section>
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
