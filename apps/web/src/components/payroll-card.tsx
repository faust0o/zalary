import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import {
  AlertTriangle,
  Calendar,
  Check,
  Pencil,
  Users,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

function formatDueDate(date: Date): string {
  const now = new Date()
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays <= 0) return "today"
  if (diffDays === 1) return "in 1 day"
  return `in ${diffDays} days`
}

export function PayrollCard({
  payrollId,
  name,
  totalUsd,
  employeeCount,
  dueDate,
  completed,
  onClick,
}: {
  payrollId: string
  name: string
  totalUsd: number
  employeeCount: number
  dueDate: Date
  completed: boolean
  onClick?: () => void
}) {
  const navigate = useNavigate()
  const diffDays = Math.ceil(
    (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const urgent = !completed && diffDays < 7

  return (
    <Card
      className={`py-0 ${completed ? "opacity-75" : "transition-border cursor-pointer hover:border-black"}`}
      onClick={completed ? undefined : onClick}
    >
      <CardContent className="flex h-full flex-col justify-between p-0">
        <div className="px-5 pt-5">
          <p className="text-3xl font-light">{name}</p>
          <p
            className={`mt-2 flex items-center gap-1.5 text-sm ${
              completed
                ? "text-green-600"
                : urgent
                  ? "font-medium text-primary"
                  : "text-muted-foreground"
            }`}
          >
            {completed ? (
              <Check className="size-3.5" />
            ) : urgent ? (
              <AlertTriangle className="size-3.5" />
            ) : (
              <Calendar className="size-3.5" />
            )}
            {completed ? `Due again ${formatDueDate(dueDate)}` : `Due ${formatDueDate(dueDate)}`}
          </p>
        </div>
        <div className="mt-6 flex items-center justify-between border-t text-sm text-muted-foreground">
          <span className="flex-1 text-center">${totalUsd.toLocaleString()}</span>
          <Separator orientation="vertical" className="h-8" />
          <span className="flex-1 flex justify-center items-center gap-1">
            {employeeCount} <Users className="size-3.5" />
          </span>
          <Separator orientation="vertical" className="h-8" />
          <button
            className="hover:bg-muted flex-1 flex justify-center items-center h-full p-0 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/payrolls/${payrollId}`)
            }}
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
