import { useMutation } from "@apollo/client/react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Progress } from "@workspace/ui/components/progress"
import {
  AlertCircle,
  CheckCircle,
  Key,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import { useState } from "react"
import {
  UpdateUserDocument,
  WalkthroughStatusDocument,
} from "../graphql/__generated__/graphql"
import {
  deriveViewingKeyFromSeedPhrase,
  validateSeedPhrase,
  validateViewingKey,
} from "../lib/zcash-keys"

type Step = "viewing-key" | "verifying" | "done"
type KeyInputMode = "viewing-key" | "seed-phrase"

export function ConnectWalletModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [updateUser] = useMutation(UpdateUserDocument, {
    refetchQueries: [WalkthroughStatusDocument],
  })

  const [step, setStep] = useState<Step>("viewing-key")
  const [keyInputMode, setKeyInputMode] = useState<KeyInputMode>("viewing-key")
  const [viewingKey, setViewingKey] = useState("")
  const [seedPhrase, setSeedPhrase] = useState("")
  const [birthdayHeight, setBirthdayHeight] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const progress = step === "viewing-key" ? 40 : step === "verifying" ? 75 : 100

  async function handleSubmitKey() {
    setError(null)
    setIsSubmitting(true)

    try {
      let key = viewingKey.trim()

      if (keyInputMode === "seed-phrase") {
        if (!validateSeedPhrase(seedPhrase)) {
          setError(
            "Invalid seed phrase. Please enter a valid 24-word BIP39 mnemonic."
          )
          setIsSubmitting(false)
          return
        }
        key = await deriveViewingKeyFromSeedPhrase(seedPhrase)
      }

      const isValid = await validateViewingKey(key)
      if (!isValid) {
        setError(
          "Invalid viewing key. Could not parse as a Zcash Unified Full Viewing Key."
        )
        setIsSubmitting(false)
        return
      }

      const parsedHeight = parseInt(birthdayHeight.trim(), 10)
      if (!parsedHeight || isNaN(parsedHeight)) {
        setError("Please enter a valid wallet birthday height.")
        setIsSubmitting(false)
        return
      }

      setStep("verifying")

      // Key is validated via WASM — save it along with birthday height
      await updateUser({
        variables: {
          zcashViewingKey: key,
          walletBirthdayHeight: parsedHeight,
        },
      })

      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
      setStep("viewing-key")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Don't let the dialog close while the key is being saved
  const canClose = !isSubmitting && step !== "verifying"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next || canClose) onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-lg" showCloseButton={canClose}>
        <DialogHeader>
          <DialogTitle>Connect Your Wallet</DialogTitle>
          <DialogDescription>
            Zalary only needs read access. Your funds stay in your wallet.
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="mb-2" />

        {step === "viewing-key" && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                <Key className="size-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Add Your Viewing Key</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Your viewing key lets Zalary track your balance and verify
                transactions.
              </p>
            </div>

            <div className="flex justify-center">
              <div className="inline-flex rounded-lg bg-muted p-1">
                <button
                  type="button"
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${keyInputMode === "viewing-key" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => {
                    setKeyInputMode("viewing-key")
                    setError(null)
                  }}
                >
                  Viewing Key
                </button>
                <button
                  type="button"
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${keyInputMode === "seed-phrase" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => {
                    setKeyInputMode("seed-phrase")
                    setError(null)
                  }}
                >
                  Seed Phrase
                </button>
              </div>
            </div>

            {keyInputMode === "viewing-key" ? (
              <div className="space-y-2">
                <Label htmlFor="viewing-key">
                  Unified Full Viewing Key (UFVK)
                </Label>
                <Input
                  id="viewing-key"
                  value={viewingKey}
                  onChange={(e) => setViewingKey(e.target.value)}
                  placeholder="uview1..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Starts with "uview" or "zxviews". Found in your wallet's
                  export settings.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="seed-phrase">24-Word Seed Phrase</Label>
                <textarea
                  id="seed-phrase"
                  value={seedPhrase}
                  onChange={(e) => setSeedPhrase(e.target.value)}
                  placeholder="word1 word2 word3 ... word24"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-ring/30 focus-visible:ring-2 focus-visible:outline-none"
                />
                <p className="text-xs text-muted-foreground">
                  Your seed phrase is used locally to derive the viewing key. It
                  is never sent to our servers.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="birthday-height">
                Wallet Birthday Height{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="birthday-height"
                type="number"
                value={birthdayHeight}
                onChange={(e) => setBirthdayHeight(e.target.value)}
                placeholder="e.g. 2800000"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The block height when your wallet was created. Found in your
                wallet's backup info. Speeds up initial sync.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmitKey}
              disabled={
                isSubmitting ||
                !birthdayHeight.trim() ||
                (keyInputMode === "viewing-key"
                  ? !viewingKey.trim()
                  : !seedPhrase.trim())
              }
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              {isSubmitting ? "Verifying..." : "Verify & Save"}
            </Button>
          </div>
        )}

        {step === "verifying" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="mb-4 size-12 animate-spin text-primary" />
            <h3 className="text-lg font-semibold">Verifying your key...</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Checking that your viewing key is valid and can sync with the
              Zcash network.
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="size-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">You're all set!</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Your wallet is connected. Zalary will now sync your balance.
            </p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
