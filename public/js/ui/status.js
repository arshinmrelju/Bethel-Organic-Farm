/** Small shared helper for friendly, accessible status messages. */
export function setStatusMessage(element, message, tone = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
}
