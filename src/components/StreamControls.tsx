import { Pause, Play, RotateCcw } from "lucide-react";
import type { StreamStatus } from "@/hooks/useStream";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskDef } from "@/lib/tasks";
import { LiveInputDialog } from "./LiveInputDialog";

const SPEEDS = [1, 2, 5];

type Props = {
  task: TaskDef;
  status: StreamStatus;
  sent: number;
  itemsPerSecond: number;
  onStart(): void;
  onPause(): void;
  onReset(): void;
  onSpeedChange(itemsPerSecond: number): void;
  onSendLive(input: Record<string, unknown>): void;
};

export function StreamControls(props: Props) {
  const { task, status, sent, itemsPerSecond } = props;
  const total = task.items.length;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="mr-auto flex min-w-56 flex-1 items-center gap-3">
        <Progress value={(sent / total) * 100} className="h-1 max-w-64" />
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {sent} of {total} items sent
        </span>
      </div>
      <Select value={String(itemsPerSecond)} onValueChange={v => props.onSpeedChange(Number(v))}>
        <SelectTrigger className="w-[104px]" aria-label="Stream speed">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SPEEDS.map(s => (
            <SelectItem key={s} value={String(s)}>
              {s} item{s > 1 ? "s" : ""}/s
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <LiveInputDialog task={task} onSend={props.onSendLive} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={props.onReset} aria-label="Reset">
            <RotateCcw />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Clear the results and start again</TooltipContent>
      </Tooltip>
      {status === "running" ? (
        <Button onClick={props.onPause} className="w-28">
          <Pause /> Pause
        </Button>
      ) : (
        <Button onClick={props.onStart} disabled={status === "done"} className="w-28">
          <Play /> {status === "paused" ? "Resume" : "Start"}
        </Button>
      )}
    </div>
  );
}
