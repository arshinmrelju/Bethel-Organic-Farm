// Local-only booking journey prototype. No customer information leaves this page.
import { formatFarmDate, initializeI18n, translate } from "./i18n.js";
const i18n = initializeI18n();
const form = document.querySelector("#booking-form");
const steps = [...document.querySelectorAll(".booking-step")];
const stepItems = [...document.querySelectorAll(".booking-stepper li")];
const progress = document.querySelector(".progress-track");
const progressFill = document.querySelector(".progress-track span");
let currentStep = 0;

const today = new Date();
const localToday = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
const dateInput = form.elements.date;
dateInput.min = localToday;
const query = new URLSearchParams(window.location.search);
const typeFromQuery = { stay: "Stay", "day-visit": "Day visit", camping: "Camping", experiences: "Experiences" }[query.get("type")];
if (typeFromQuery) {
  const choice = [...form.querySelectorAll('[name="visitType"]')].find((item) => item.value === typeFromQuery);
  if (choice) choice.checked = true;
}
if (query.get("food") === "1") form.elements.food.checked = true;

const setInvalid = (field, invalid) => {
  if (invalid) field.setAttribute("aria-invalid", "true");
  else field.removeAttribute("aria-invalid");
};

const selectedValues = (name) => [...form.querySelectorAll(`[name="${name}"]:checked`)].map((item) => item.value);
const displayDate = (value) => {
  if (!value) return "Select a date";
  const date = new Date(`${value}T12:00:00+05:30`);
  return formatFarmDate(date, i18n.language);
};

const translatedVisitType = (value) => ({ Stay: translate("visit.stay", i18n.language), "Day visit": translate("visit.day", i18n.language), Camping: translate("visit.camping", i18n.language), Experiences: translate("visit.activities", i18n.language) })[value] ?? value;
const translatedExperiences = (values) => values.map((value) => {
  const keys = { "Trekking & nature walks": "activity.walks", "Farm tours": "activity.tour", "Riverside picnic": "activity.picnic", "Outdoor BBQ": "activity.bbq", "Bonfire evening": "activity.bonfire", "Kids activities": "activity.kids", "Photography experience": "activity.photo", Camping: "activity.camping" };
  return translate(keys[value] ?? value, i18n.language);
});

function formState() {
  return {
    type: translatedVisitType(form.elements.visitType.value) || translate("booking.chooseVisit", i18n.language),
    date: form.elements.date.value,
    adults: Math.max(1, Number(form.elements.adults.value) || 1),
    children: Math.max(0, Number(form.elements.children.value) || 0),
    experiences: selectedValues("experiences"),
    food: form.elements.food.checked,
    name: form.elements.guestName.value.trim(),
    email: form.elements.guestEmail.value.trim(),
    phone: form.elements.guestPhone.value.trim(),
    notes: form.elements.notes.value.trim(),
  };
}

function updateSummary() {
  const data = formState();
  const guestLabel = `${data.adults} ${translate(data.adults === 1 ? "guest.adult" : "guest.adults", i18n.language)}${data.children ? `, ${data.children} ${translate(data.children === 1 ? "guest.child" : "guest.children", i18n.language)}` : ""}`;
  const expLabel = data.experiences.length ? translatedExperiences(data.experiences).join(", ") : translate("booking.noExperiences", i18n.language);
  const setText = (selector, value) => document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  setText('[data-aside="type"]', data.type);
  setText('[data-aside="date"]', data.date ? displayDate(data.date) : translate("booking.selectDate", i18n.language));
  setText('[data-aside="guests"]', guestLabel);
  setText('[data-aside="experiences"]', expLabel);
}

function updateReview() {
  const data = formState();
  const guests = `${data.adults} ${translate(data.adults === 1 ? "guest.adult" : "guest.adults", i18n.language)}${data.children ? `, ${data.children} ${translate(data.children === 1 ? "guest.child" : "guest.children", i18n.language)}` : ""}`;
  const contact = [data.email, data.phone].filter(Boolean).join(" · ") || "Contact details not connected";
  const experiences = data.experiences.length ? translatedExperiences(data.experiences).join("\n") : translate("booking.noExperiences", i18n.language);
  const setText = (selector, value) => document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  setText('[data-summary="type"]', translatedVisitType(form.elements.visitType.value) || translate("booking.chooseVisit", i18n.language));
  setText('[data-summary="date"]', displayDate(data.date));
  setText('[data-summary="guests"]', guests);
  setText('[data-summary="experiences"]', experiences);
  setText('[data-summary="food"]', data.food ? translate("booking.food", i18n.language) : translate("booking.notRequested", i18n.language));
  setText('[data-summary="name"]', data.name || "Guest details");
  setText('[data-summary="contact"]', contact);
}

function showStep(index) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== currentStep; });
  stepItems.forEach((item, itemIndex) => {
    if (itemIndex === currentStep) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
    if (itemIndex < currentStep) item.dataset.complete = "true";
    else delete item.dataset.complete;
  });
  const percent = ((currentStep + 1) / steps.length) * 100;
  progress.setAttribute("aria-valuenow", String(currentStep + 1));
  progressFill.style.width = `${percent}%`;
  if (currentStep === 3) updateReview();
  const heading = steps[currentStep].querySelector("h2");
  heading?.setAttribute("tabindex", "-1");
  heading?.focus();
}

function validateVisit() {
  let valid = true;
  const typeChosen = Boolean(form.querySelector('[name="visitType"]:checked'));
  const typeError = document.querySelector('[data-error="visitType"]');
  typeError.textContent = typeChosen ? "" : "Choose a visit type to continue.";
  if (!typeChosen) valid = false;

  const requiredFields = [dateInput, form.elements.adults, form.elements.children];
  requiredFields.forEach((field) => {
    const numberInvalid = field.type === "number" && (field.value === "" || Number(field.value) < Number(field.min));
    const dateInvalid = field.type === "date" && (!field.value || field.value < localToday);
    const invalid = numberInvalid || dateInvalid;
    setInvalid(field, invalid);
    if (invalid) valid = false;
  });
  if (!valid) {
    const firstInvalid = !typeChosen ? form.querySelector('[name="visitType"]') : steps[currentStep].querySelector('[aria-invalid="true"]');
    firstInvalid?.focus();
  }
  return valid;
}

function validateGuest() {
  const name = form.elements.guestName;
  const email = form.elements.guestEmail;
  const phone = form.elements.guestPhone;
  const error = document.querySelector('[data-error="guestDetails"]');
  const nameValid = name.value.trim().length >= 2;
  const emailValid = email.value.trim() === "" || email.checkValidity();
  const phoneDigits = phone.value.replace(/\D/g, "");
  const phoneValid = phone.value.trim() === "" || (phoneDigits.length >= 7 && phoneDigits.length <= 15);
  const hasContact = Boolean(email.value.trim() || phone.value.trim());
  setInvalid(name, !nameValid);
  setInvalid(email, !emailValid);
  setInvalid(phone, !phoneValid);
  if (!nameValid) error.textContent = "Enter your name so the farm can identify the enquiry.";
  else if (!emailValid) error.textContent = "Check the email address format.";
  else if (!phoneValid) error.textContent = "Check the phone number. Include the country code if helpful.";
  else if (!hasContact) error.textContent = "Add an email address or phone number for a reply.";
  else error.textContent = "";
  const valid = nameValid && emailValid && phoneValid && hasContact;
  if (!valid) (nameValid ? (!emailValid ? email : (!phoneValid ? phone : email)) : name).focus();
  return valid;
}

form.addEventListener("click", (event) => {
  const next = event.target.closest("[data-next]");
  const previous = event.target.closest("[data-prev]");
  const edit = event.target.closest("[data-edit-details]");
  if (next) {
    if (currentStep === 0 && !validateVisit()) return;
    if (currentStep === 2 && !validateGuest()) return;
    showStep(currentStep + 1);
  }
  if (previous) showStep(currentStep - 1);
  if (edit) showStep(2);
});

form.addEventListener("input", (event) => {
  setInvalid(event.target, false);
  const error = document.querySelector(`[data-error="${event.target.name}"]`);
  if (error) error.textContent = "";
  updateSummary();
});
form.addEventListener("change", updateSummary);
form.addEventListener("submit", (event) => event.preventDefault());

document.querySelector("[data-finish]").addEventListener("click", () => {
  document.querySelector(".preview-finish").hidden = false;
});

document.addEventListener("bethel:localechange", () => {
  updateSummary();
  if (currentStep === 3) updateReview();
});

updateSummary();
