import { useQuery } from "@apollo/client/react"
import { WalkthroughStatusDocument } from "../graphql/__generated__/graphql"
import { useAccountData } from "./use-account-data"

export type StepStatus = "completed" | "current" | "locked"

export interface Step {
  label: string
  description: string
  actionLabel: string
  path: string
  status: StepStatus
}

export function useWalkthrough({ poll = false } = {}) {
  const { data } = useQuery(WalkthroughStatusDocument, {
    pollInterval: poll ? 10_000 : 0,
  })
  const { status, employees, payrolls, runs } = useAccountData()

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

  const steps: (Omit<Step, "status"> & { completed: boolean })[] = [
    {
      label: "Add an employee",
      description:
        "Head to Employees and add your first team member with their Zcash wallet address.",
      actionLabel: "Go to Employees",
      path: "/employees",
      completed: employees.length > 0,
    },
    {
      label: "Create a payroll",
      description: "Set up a payroll schedule and assign employees to it.",
      actionLabel: "Go to Payrolls",
      path: "/payrolls",
      completed: payrolls.length > 0,
    },
  ]
  // Members and delegates use their owner's treasury and can't create one
  if (!me.owner) {
    steps.push({
      label: "Create your treasury",
      description:
        "Set up a multisig treasury with your team. Payroll is paid from it once enough of you approve.",
      actionLabel: "Create treasury",
      path: "/treasury",
      completed: me.hasTreasury,
    })
  }
  steps.push({
    label: "Make a payment",
    description:
      "Run a payroll and pay your whole team in one treasury transaction.",
    actionLabel: "Go to Payrolls",
    path: "/payrolls",
    completed: runs.length > 0,
  })

  // Current = first incomplete step where all previous steps are done
  const current = steps.findIndex((s) => !s.completed)
  return {
    steps: steps.map(
      ({ completed, ...step }, i): Step => ({
        ...step,
        status: completed ? "completed" : i === current ? "current" : "locked",
      })
    ),
    completedCount: steps.filter((s) => s.completed).length,
    // Until there's an employee and a payroll the walkthrough is the
    // dashboard's main content rather than a corner widget.
    onDashboard: employees.length === 0 || payrolls.length === 0,
  }
}
