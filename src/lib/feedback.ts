export const FEEDBACK_OPEN_EVENT = "eventloom:open-feedback";

export function requestFeedbackDialog(target: Pick<Window, "dispatchEvent"> = window) {
  target.dispatchEvent(new Event(FEEDBACK_OPEN_EVENT));
}
