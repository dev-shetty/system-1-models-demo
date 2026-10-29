import items from "@/data/support.json";
import type { Item } from "../types";
import { splitFirstLine, type TaskDef } from "./types";

type Message = { subject: string; body: string; userType: string };

export const support: TaskDef = {
  id: "support",
  title: "Support routing",
  subtitle: "Which team gets this message, and is it urgent?",
  context:
    "You route support messages for a careers and salary website. Users are free users, premium subscribers (paid coaching and data), or employers (job posts and recruiting products).",
  mainField: "team",
  fields: [
    {
      id: "team",
      kind: "choice",
      question: "Which team must handle `message`?",
      labels: {
        data: "Salary, level, company or job title data that is wrong, missing, or must be changed or removed.",
        account: "Login, sign-up, email, password, profile settings, or deleting an account.",
        billing: "Payments, invoices, refunds, subscriptions, or charges for any paid product.",
        employer: "Job posts, recruiting products, employer pages, or candidate outreach for employers.",
        other: "Anything else: press, partnerships, general feedback, or unclear requests.",
      },
    },
    {
      id: "requestType",
      kind: "choice",
      question: "What kind of request is `message`?",
      labels: {
        bug: "Something on the website or app is broken or behaves wrongly.",
        question: "The user asks how something works or asks for information.",
        data_correction: "The user asks to correct, add, or remove specific data.",
        refund: "The user asks for money back.",
        feature_request: "The user asks for a new feature or a change to how a feature works.",
        other: "None of the above.",
      },
    },
    {
      id: "urgent",
      kind: "noul",
      question:
        "Does the user in `message` say that they are blocked right now, or that money is at risk now?",
    },
  ],
  items: items as Item[],
  liveTemplate:
    "Charged twice for coaching\nI booked one negotiation session but my card shows two charges of $499. Please fix this today.",
  liveInput(text) {
    const [subject, body] = splitFirstLine(text);
    if (!body) return null;
    return { message: { subject, body, userType: "premium" } };
  },
  summary(input) {
    const m = input.message as Message;
    return { title: `${m.userType} · ${m.subject}`, body: m.body };
  },
  decision(answer) {
    const team = String(answer.fields.team?.value ?? "?");
    if (answer.fields.urgent?.value === true) return { label: `Urgent → ${team}`, tone: "flag" };
    return { label: `→ ${team}`, tone: "info" };
  },
};
