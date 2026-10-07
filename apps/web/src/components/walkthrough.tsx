import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Lock,
  Rocket,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  type Step,
  type StepStatus,
  useWalkthrough,
} from "../hooks/use-walkthrough"

const STORAGE_KEY = "zalary-walkthrough-collapsed"

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "completed") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-3 w-3" />
      </div>
    )
  }
  if (status === "current") {
    return (
      <div className="border-primary flex h-5 w-5 items-center justify-center rounded-full border-2">
        <Circle className="fill-primary text-primary h-2 w-2" />
      </div>
    )
  }
  return (
    <div className="border-muted-foreground/30 flex h-5 w-5 items-center justify-center rounded-full border-2">
      <Lock className="text-muted-foreground/50 h-2.5 w-2.5" />
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="bg-muted mt-3 h-1.5 w-full overflow-hidden rounded-full">
      <div
        className="bg-primary h-full rounded-full transition-all duration-500"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  )
}

/** Shown on the dashboard until there's an employee and a payroll. */
export function WalkthroughCard({
  steps,
  completedCount,
}: {
  steps: Step[]
  completedCount: number
}) {
  const navigate = useNavigate()

  return (
    <Card className="w-full max-w-[60ch]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="text-primary h-4 w-4" />
            <CardTitle className="text-sm font-semibold">
              Getting Started
            </CardTitle>
          </div>
          <span className="text-muted-foreground text-xs">
            {completedCount}/{steps.length}
          </span>
        </div>
        <ProgressBar value={completedCount / steps.length} />
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <StepIcon status={step.status} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${step.status === "completed" ? "text-emerald-600 line-through dark:text-emerald-400" : step.status === "locked" ? "text-muted-foreground" : ""}`}
                >
                  {step.label}
                </p>
                {step.status !== "completed" && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {step.description}
                  </p>
                )}
              </div>
              {step.status !== "completed" && (
                <Button
                  size="sm"
                  variant={step.status === "current" ? "default" : "outline"}
                  className="flex-shrink-0 self-center"
                  onClick={() => navigate(step.path)}
                >
                  {step.actionLabel}
                </Button>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

export function Walkthrough() {
  const walkthrough = useWalkthrough({ poll: true })
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true"
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed])

  if (!walkthrough) return null
  // The dashboard shows it as a card instead
  if (walkthrough.onDashboard && pathname === "/dashboard") return null
  const { steps, completedCount } = walkthrough

  return (
    <div className="fixed right-4 bottom-4 z-50 w-80">
      <Card className="shadow-lg border-border/50 bg-background pt-0">
        <CardHeader
          className="cursor-pointer select-none p-4 pb-0"
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="text-primary h-4 w-4" />
              <CardTitle className="text-sm font-semibold">
                Getting Started
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {completedCount}/{steps.length}
              </span>
              {collapsed ? (
                <ChevronUp className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              )}
            </div>
          </div>
          <ProgressBar value={completedCount / steps.length} />
        </CardHeader>

        {!collapsed && (
          <CardContent className="p-4 pt-3">
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <li
                  key={i}
                  className={`flex gap-3 ${step.status === "locked" ? "opacity-40" : ""}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <StepIcon status={step.status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${step.status === "completed" ? "text-emerald-600 line-through dark:text-emerald-400" : ""}`}
                    >
                      {step.label}
                    </p>
                    {step.status === "current" && (
                      <div className="mt-1">
                        <p className="text-muted-foreground text-xs">
                          {step.description}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 text-xs"
                          onClick={() => navigate(step.path)}
                        >
                          {step.actionLabel}
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
