import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TASK_ORDER, TASKS } from "@/lib/tasks";
import type { ViewId } from "@/lib/types";
import type { DemoConfig } from "./Demo";

const VIEWS: { id: ViewId; label: string }[] = [
  ...TASK_ORDER.map(id => ({ id, label: TASKS[id].title })),
  { id: "cascade", label: "Cascade" },
];

type Props = {
  config: DemoConfig;
  onChange(patch: Partial<DemoConfig>): void;
};

export function AppHeader({ config, onChange }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex min-h-14 max-w-[1440px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-2 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex gap-0.5" aria-hidden>
            <span className="size-2 rounded-full bg-system1" />
            <span className="size-2 rounded-full bg-llm" />
          </span>
          AI that does not talk
        </div>
        <Tabs
          value={config.view}
          onValueChange={view => onChange({ view: view as ViewId })}
          className="order-last -mx-1 w-full overflow-x-auto overflow-y-hidden px-1 pb-2 [scrollbar-width:none] lg:order-none lg:mx-0 lg:w-auto lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          <TabsList variant="line">
            {VIEWS.map(v => (
              <TabsTrigger key={v.id} value={v.id} className="px-2.5">
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </header>
  );
}
