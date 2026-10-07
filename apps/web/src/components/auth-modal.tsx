import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/use-auth"
import { AuthForm } from "./auth-form"
import { Wordmark } from "./wordmark"

export function AuthModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const pending = useRef(false)

  useEffect(() => {
    if (!pending.current || !user) return
    pending.current = false
    onOpenChange(false)
    navigate("/dashboard")
  }, [user, navigate, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle>
            <Wordmark className="mx-auto mb-1 h-9" />
          </DialogTitle>
          <DialogDescription>Username and password</DialogDescription>
        </DialogHeader>
        <AuthForm
          idPrefix="modal"
          onAuthenticated={() => {
            pending.current = true
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
