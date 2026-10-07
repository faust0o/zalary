import { cn } from "@workspace/ui/lib/utils"

/** The thin labelled progress bars above each treasury setup step. */
export function Stepper({
  steps,
  current,
}: {
  steps: string[]
  current: number
}) {
  return (
    <ol className="mx-auto grid w-full max-w-md grid-cols-3 gap-1.5">
      {steps.map((label, i) => (
        <li key={label} className="space-y-2 text-center">
          <span
            className={cn(
              "block text-xs",
              i <= current ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              "block h-0.5 rounded-full transition-colors",
              i <= current ? "bg-foreground" : "bg-border"
            )}
          />
        </li>
      ))}
    </ol>
  )
}

export function StepHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="space-y-3 text-center">
      <h2 className="mx-auto max-w-md text-4xl font-medium tracking-tight text-balance">
        {title}
      </h2>
      <p className="mx-auto max-w-sm text-sm text-balance text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

/** An amber caution line, as on the setup cards. */
export function Caution({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
      <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-current text-[9px] font-bold">
        !
      </span>
      <p>{children}</p>
    </div>
  )
}
