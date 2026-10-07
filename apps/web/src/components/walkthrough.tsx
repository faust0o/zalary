import { useQuery } from "@apollo/client/react"
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
import { useNavigate } from "react-router-dom"
import { WalkthroughStatusDocument } from "../graphql/__generated__/graphql"
import { useAccountData } from "../hooks/use-account-data"

const STORAGE_KEY = "zalary-walkthrough-collapsed"

interface Step {
  label: string
  description: string
  actionLabel: string
  completed: boolean
  onAction: () => void
}

function getStepStatus(
  index: number,
  steps: Step[],
): "completed" | "current" | "locked" {
  if (steps[index].completed) return "completed"
  // Current = first incomplete step where all previous steps are done
  const allPreviousDone = steps.slice(0, index).every((s) => s.completed)
  if (allPreviousDone) return "current"
  return "locked"
}

export function Walkthrough({
  onCreateTreasury,
}: {
  onCreateTreasury: () => void
}) {
  const { data } = useQuery(WalkthroughStatusDocument, {
    pollInterval: 10_000,
  })
  const { status, employees, payrolls, runs } = useAccountData()
  const navigate = useNavigate()
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

  if (!data?.me || status !== "ready") return null
  const me = data.me
  // Only the owner can create the treasury, so it doesn't hold up anyone
  // else's walkthrough.
  const needsTreasury = !me.owner && !me.hasTreasury
  if (
    employees.length > 0 &&
    payrolls.length > 0 &&
    runs.length > 0 &&
    !needsTreasury
  ) {
    return null
  }

  const steps: Step[] = [
    {
      label: "Add an employee",
      description:
        "Head to Employees and add your first team member with their Zcash wallet address.",
      actionLabel: "Go to Employees",
      completed: employees.length > 0,
      onAction: () => navigate("/employees"),
    },
    {
      label: "Create a payroll",
      description: "Set up a payroll schedule and assign employees to it.",
      actionLabel: "Go to Payrolls",
      completed: payrolls.length > 0,
      onAction: () => navigate("/payrolls"),
    },
  ]
  // Members and delegates use their owner's treasury and can't create one
  if (!me.owner) {
    steps.push({
      label: "Create your treasury",
      description:
        "Set up a multisig treasury with your team. Payroll is paid from it once enough of you approve.",
      actionLabel: "Create treasury",
      completed: me.hasTreasury,
      onAction: onCreateTreasury,
    })
  }
  steps.push({
    label: "Make a payment",
    description:
      "Run a payroll and pay your whole team in one treasury transaction.",
    actionLabel: "Go to Payrolls",
    completed: runs.length > 0,
    onAction: () => navigate("/payrolls"),
  })
  const completedCount = steps.filter((s) => s.completed).length

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
          {/* Progress bar */}
          <div className="bg-muted mt-3 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </CardHeader>

        {!collapsed && (
          <CardContent className="p-4 pt-3">
            <ol className="space-y-3">
              {steps.map((step, i) => {
                const status = getStepStatus(i, steps)
                return (
                  <li
                    key={i}
                    className={`flex gap-3 ${status === "locked" ? "opacity-40" : ""}`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {status === "completed" ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      ) : status === "current" ? (
                        <div className="border-primary flex h-5 w-5 items-center justify-center rounded-full border-2">
                          <Circle className="fill-primary text-primary h-2 w-2" />
                        </div>
                      ) : (
                        <div className="border-muted-foreground/30 flex h-5 w-5 items-center justify-center rounded-full border-2">
                          <Lock className="text-muted-foreground/50 h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${status === "completed" ? "text-emerald-600 line-through dark:text-emerald-400" : ""}`}
                      >
                        {step.label}
                      </p>
                      {status === "current" && (
                        <div className="mt-1">
                          <p className="text-muted-foreground text-xs">
                            {step.description}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-7 text-xs"
                            onClick={step.onAction}
                          >
                            {step.actionLabel}
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
