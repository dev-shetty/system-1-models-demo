import items from "@/data/moderation.json";
import type { Item } from "../types";
import { splitFirstLine, type TaskDef } from "./types";

type Post = { title: string; body: string; channel: string };

const TOXIC_AT = 0.7;

export const moderation: TaskDef = {
  id: "moderation",
  title: "Community moderation",
  subtitle: "Is this post fine, off-topic, spam, or toxic?",
  context:
    "You moderate posts in the community of a careers and salary website for tech workers.",
  mainField: "category",
  fields: [
    {
      id: "category",
      kind: "choice",
      question:
        "Which category best describes `post`, given the channel it was posted in (`post.channel`)?",
      labels: {
        fine: "On-topic discussion for the channel: questions, experiences, advice or opinions, including blunt but respectful disagreement.",
        off_topic:
          "A genuine post that does not fit this channel or a careers community, and is not advertising or abuse.",
        spam: "Unsolicited advertising, referral or account selling, paid services, crypto or course promotion, or promotional links.",
        toxic: "Insults, harassment, slurs, threats, or attacks on a person or a group.",
      },
    },
    {
      id: "toxic",
      kind: "noul",
      question: "Is `post` insulting, hateful or harassing towards a person or a group?",
      whenTrue: "Insults, slurs, threats, demeaning stereotypes, or personal attacks.",
      whenFalse: "Neutral, friendly, critical but respectful, or light banter.",
    },
  ],
  items: items as Item[],
  liveTemplate: "Is a 15% raise normal when you switch teams internally?\nMy manager offered 8% and says that is the max.",
  liveInput(text) {
    const [title, body] = splitFirstLine(text);
    if (!body) return null;
    return { post: { channel: "career-advice", title, body } };
  },
  summary(input) {
    const post = input.post as Post;
    return { title: `#${post.channel} · ${post.title}`, body: post.body };
  },
  decision(answer) {
    const toxicProb = answer.fields.toxic?.prob ?? 0;
    if (toxicProb >= TOXIC_AT) return { label: "Hidden · toxic", tone: "hide" };
    switch (answer.fields.category?.value) {
      case "fine":
        return { label: "Shown", tone: "show" };
      case "off_topic":
        return { label: "Flagged · off-topic", tone: "flag" };
      case "spam":
        return { label: "Hidden · spam", tone: "hide" };
      case "toxic":
        return { label: "Hidden · toxic", tone: "hide" };
      default:
        return { label: "Unknown", tone: "info" };
    }
  },
};
