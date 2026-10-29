"use client";

import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { TaskDef } from "@/lib/tasks";

type Props = {
  task: TaskDef;
  onSend(input: Record<string, unknown>): void;
};

export function LiveInputDialog({ task, onSend }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(task.liveTemplate);
  const input = task.liveInput(text);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MessageSquarePlus /> Live input
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Send a live input</DialogTitle>
          <DialogDescription>Put the title or subject on the first line and the body below it.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          aria-label="Live input"
          className="min-h-32 resize-y text-base"
        />
        {!input && <p className="text-sm text-destructive">Add a body on the second line.</p>}
        <DialogFooter>
          <Button
            disabled={!input}
            onClick={() => {
              if (!input) return;
              onSend(input);
              setOpen(false);
            }}
          >
            Send to both models
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
