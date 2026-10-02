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
          <img
            src="/zalary-logo.svg"
            alt="Zalary"
            className="mx-auto mb-2 h-12"
          />
          <DialogTitle className="text-2xl font-bold">Zalary</DialogTitle>
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
