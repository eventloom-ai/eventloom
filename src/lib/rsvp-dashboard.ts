export type RsvpGuest = {
  name: string;
};

export type RsvpAnswer = {
  field_key: string;
  value: string;
};

export type CreatorRsvpSubmission = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  is_attending: boolean;
  party_size: number;
  status: string;
  created_at: string;
  rsvp_guests: RsvpGuest[];
  rsvp_answers: RsvpAnswer[];
};

export type RsvpSummary = {
  responses: number;
  attending: number;
  declined: number;
  expectedGuests: number;
};

export function summarizeRsvps(submissions: CreatorRsvpSubmission[]): RsvpSummary {
  return submissions.reduce<RsvpSummary>(
    (summary, submission) => ({
      responses: summary.responses + 1,
      attending: summary.attending + (submission.is_attending ? 1 : 0),
      declined: summary.declined + (submission.is_attending ? 0 : 1),
      expectedGuests: summary.expectedGuests + (submission.is_attending ? submission.party_size : 0),
    }),
    { responses: 0, attending: 0, declined: 0, expectedGuests: 0 },
  );
}

export function searchableRsvpText(submission: CreatorRsvpSubmission) {
  return [
    submission.first_name,
    submission.last_name,
    submission.email,
    submission.phone,
    ...submission.rsvp_guests.map((guest) => guest.name),
    ...submission.rsvp_answers.flatMap((answer) => [answer.field_key, answer.value]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}
