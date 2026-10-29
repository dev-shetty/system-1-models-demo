import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LLM_LABELS, SYSTEM1_LABELS } from "@/lib/pricing";
import type { LaneKind, ModelId, System1Model } from "@/lib/types";
import { LANE_DOT } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import type { DemoConfig } from "./Demo";

type Group = { label: string; labels: Partial<Record<ModelId, string>> };

function ModelSelect({
  lane,
  label,
  value,
  groups,
  disabled,
  onChange,
}: {
  lane: LaneKind;
  label: string;
  value: ModelId;
  groups: Group[];
  disabled: ModelId;
  onChange(value: ModelId): void;
}) {
  return (
    <Select value={value} onValueChange={v => onChange(v as ModelId)}>
      <SelectTrigger className="w-auto" aria-label={label}>
        <span className={cn("size-2 shrink-0 rounded-full", LANE_DOT[lane])} aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map(group => (
          <SelectGroup key={group.label}>
            {groups.length > 1 && <SelectLabel>{group.label}</SelectLabel>}
            {(Object.entries(group.labels) as [ModelId, string][]).map(([id, name]) => (
              <SelectItem key={id} value={id} disabled={id === disabled}>
                {name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

type Props = {
  config: DemoConfig;
  onChange(patch: Partial<DemoConfig>): void;
  joiner: string;
};

export function ModelSettings({ config, onChange, joiner }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ModelSelect
        lane="system1"
        label="System 1 model"
        value={config.system1}
        groups={[{ label: "System 1", labels: SYSTEM1_LABELS }]}
        disabled={config.model}
        onChange={system1 => onChange({ system1: system1 as System1Model })}
      />
      <span className="text-sm text-muted-foreground">{joiner}</span>
      <ModelSelect
        lane="llm"
        label="Comparison model"
        value={config.model}
        groups={[
          { label: "LLMs", labels: LLM_LABELS },
          { label: "System 1", labels: SYSTEM1_LABELS },
        ]}
        disabled={config.system1}
        onChange={model => onChange({ model })}
      />
    </div>
  );
}
