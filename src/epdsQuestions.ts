export type EpdsOption = {
  readonly label: string;
  readonly score: number;
};

export type EpdsQuestion = {
  readonly id: number;
  readonly text: string;
  readonly options: readonly EpdsOption[];
};

/**
 * Validated EPDS wording and score mapping.
 *
 * Primary source: NSW Health, "Maternal and child health: supporting families
 * early", Appendix 4A questionnaire and Appendix 4B scoring guide, PDF pages
 * 52–53:
 * https://www1.health.nsw.gov.au/pds/ActivePDSDocuments/PD2010_017.pdf
 *
 * Corroborating form: NHS-hosted EPDS form citing Cox, Holden, and Sagovsky
 * (1987):
 * https://www.hackneyandcityhealthvisiting.nhs.uk/content/uploads/New-Edinburgh-Postnatal-Depression-Scale.pdf
 *
 * Do not edit this copy as ordinary product text. The wording, response order,
 * and score assigned to each response are part of the validated instrument.
 */
export const QUESTIONS = [
  {
    id: 1,
    text: "I have been able to laugh and see the funny side of things:",
    options: [
      { label: "As much as I always could", score: 0 },
      { label: "Not quite so much now", score: 1 },
      { label: "Definitely not so much now", score: 2 },
      { label: "Not at all", score: 3 },
    ],
  },
  {
    id: 2,
    text: "I have looked forward with enjoyment to things:",
    options: [
      { label: "As much as I ever did", score: 0 },
      { label: "Rather less than I used to", score: 1 },
      { label: "Definitely less than I used to", score: 2 },
      { label: "Hardly at all", score: 3 },
    ],
  },
  {
    id: 3,
    text: "I have blamed myself unnecessarily when things went wrong:",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, some of the time", score: 2 },
      { label: "Not very often", score: 1 },
      { label: "No, never", score: 0 },
    ],
  },
  {
    id: 4,
    text: "I have been anxious or worried for no good reason:",
    options: [
      { label: "No, not at all", score: 0 },
      { label: "Hardly ever", score: 1 },
      { label: "Yes, sometimes", score: 2 },
      { label: "Yes, very often", score: 3 },
    ],
  },
  {
    id: 5,
    text: "I have felt scared or panicky for no very good reason:",
    options: [
      { label: "Yes, quite a lot", score: 3 },
      { label: "Yes, sometimes", score: 2 },
      { label: "No, not much", score: 1 },
      { label: "No, not at all", score: 0 },
    ],
  },
  {
    id: 6,
    text: "Things have been getting on top of me:",
    options: [
      {
        label: "Yes, most of the time I haven’t been able to cope at all",
        score: 3,
      },
      {
        label: "Yes, sometimes I haven’t been coping as well as usual",
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
    text: "I have been so unhappy that I have had difficulty sleeping:",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, sometimes", score: 2 },
      { label: "Not very often", score: 1 },
      { label: "No, not at all", score: 0 },
    ],
  },
  {
    id: 8,
    text: "I have felt sad or miserable:",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, quite often", score: 2 },
      { label: "Not very often", score: 1 },
      { label: "No, not at all", score: 0 },
    ],
  },
  {
    id: 9,
    text: "I have been so unhappy that I have been crying:",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, quite often", score: 2 },
      { label: "Only occasionally", score: 1 },
      { label: "No, never", score: 0 },
    ],
  },
  {
    id: 10,
    text: "The thought of harming myself has occurred to me:",
    options: [
      { label: "Yes, quite often", score: 3 },
      { label: "Sometimes", score: 2 },
      { label: "Hardly ever", score: 1 },
      { label: "Never", score: 0 },
    ],
  },
] as const satisfies readonly EpdsQuestion[];
