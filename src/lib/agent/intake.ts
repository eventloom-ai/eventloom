export type IntakeAnswerKey = "eventName" | "dateAndTime" | "dateTiming" | "venueType" | "venue" | "mensHall" | "womensHall" | "languages";

export type IntakeAnswers = Partial<Record<IntakeAnswerKey, string>>;

export type IntakeQuestion = {
  id: IntakeAnswerKey;
  label: string;
  hint: string;
  placeholder: string;
  input?: "text" | "date" | "select";
  options?: string[];
};

const baseQuestions: IntakeQuestion[] = [
  { id: "eventName", label: "What should we call the event?", hint: "Names or a title, if you want one shown.", placeholder: "For example: Amina & Kareem" },
  { id: "dateAndTime", label: "What date is it?", hint: "Pick a date now, or leave it for later.", placeholder: "", input: "date" },
  { id: "dateTiming", label: "What time should guests expect?", hint: "Choose a broad time window if the exact time is not ready.", placeholder: "", input: "select", options: ["Time to be announced", "Morning", "Afternoon", "Evening", "All day"] },
  { id: "venueType", label: "What kind of venue is it?", hint: "This helps us choose the right language and layout.", placeholder: "", input: "select", options: ["Banquet hall", "Hotel or ballroom", "Restaurant", "Outdoor venue", "Private home", "Place of worship", "Other"] },
  { id: "venue", label: "Where is it happening?", hint: "Search by venue name or city—no full address required.", placeholder: "Search a venue or city" },
];

export function intakeQuestionsForBrief(prompt: string): IntakeQuestion[] {
  const questions = [...baseQuestions];
  const isBilingual = /\bbilingual\b|\barabic\b|\benglish\b/i.test(prompt);
  const hasSeparateHalls = /(?:separate|different)\s+(?:men'?s|women'?s|male|female).{0,50}(?:hall|reception)|(?:men'?s|women'?s).{0,50}(?:separate|different).{0,50}(?:hall|reception)/i.test(prompt);

  if (hasSeparateHalls) {
    questions.push(
      { id: "mensHall", label: "What should guests know about the men's hall?", hint: "A hall name, entrance, time, or any instructions.", placeholder: "For example: Grand Hall, entrance A" },
      { id: "womensHall", label: "What should guests know about the women's hall?", hint: "A hall name, entrance, time, or any instructions.", placeholder: "For example: Garden Hall, entrance B" },
    );
  }

  if (isBilingual) {
    questions.push({ id: "languages", label: "Which languages should the site use?", hint: "Choose the language pairing for the page.", placeholder: "", input: "select", options: ["English and Arabic", "English only", "Arabic only", "English and French", "Other languages"] });
  }

  return questions;
}

export function enrichBriefWithIntake(prompt: string, answers: IntakeAnswers) {
  const details: Array<[string, string | undefined]> = [
    ["Event name", answers.eventName],
    ["Event date", answers.dateAndTime],
    ["Expected time", answers.dateTiming],
    ["Venue type", answers.venueType],
    ["Venue", answers.venue],
    ["Men's hall details", answers.mensHall],
    ["Women's hall details", answers.womensHall],
    ["Language preference", answers.languages],
  ];
  const suppliedDetails = details.filter(([, value]) => value?.trim());

  if (!suppliedDetails.length) return prompt.trim();

  return `${prompt.trim()}\n\nDetails confirmed by the customer:\n${suppliedDetails.map(([label, value]) => `- ${label}: ${value?.trim()}`).join("\n")}`;
}
