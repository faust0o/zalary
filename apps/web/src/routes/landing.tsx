import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { ArrowRight, Calendar, Moon, Pencil, Sun, Users } from "lucide-react"

import { Navigate, useNavigate } from "react-router-dom"
import { useTheme } from "../components/theme-provider"
import { useAuth } from "../hooks/use-auth"

export function LandingPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <img
          src="/zalary-logo.svg"
          alt="Zalary"
          className="size-24 animate-pulse"
        />
      </div>
    )
  }

  if (user) return <Navigate to="/dashboard" replace />

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-neutral-100 text-foreground dark:to-neutral-900">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border/50 bg-background/85 px-6 backdrop-blur-xl md:px-12">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/zalary-logo.svg" alt="Zalary" className="size-8" />
          <span className="text-lg font-medium tracking-wide">Zalary</span>
        </a>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => navigate("/login")}>
            Sign in
          </Button>
          <Button size="lg" onClick={() => navigate("/login")}>
            Launch App
            <ArrowRight className="ml-1 size-5" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-24 pb-20 md:px-12">
        {/* Grid background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border) / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.15) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 75% 65% at 50% 10%, black 20%, transparent 100%)",
          }}
        />
        {/* Glow */}
        <div className="pointer-events-none absolute top-[15%] left-1/2 size-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(244,183,40,0.07)_0%,transparent_68%)]" />

        <div className="relative mx-auto grid w-full max-w-[1100px] items-center gap-16 md:grid-cols-2 md:gap-20">
          {/* Left */}
          <div>
            <h1 className="mb-6 text-5xl leading-[1.06] tracking-tight md:text-6xl lg:text-7xl">
              <span className="block font-serif font-bold text-[6rem]">
                Private Payroll.
              </span>
              <em className="font-thin text-6xl text-muted-foreground not-italic">
                Connect nothing.
              </em>
              <br />
              <span className="font-medium text-6xl">Document everything.</span>
            </h1>
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate("/login")}
                className="shadow-[0_0_36px_rgba(244,183,40,0.18)]"
              >
                Start paying privately
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                See how it works
              </Button>
            </div>
          </div>

          {/* Right — dashboard mockup */}
          <div className="relative">
            <Card className="overflow-hidden pt-0 shadow-2xl">
              <div className="flex items-center gap-1.5 border-b bg-card px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-yellow-400" />
                <span className="size-2.5 rounded-full bg-green-400" />
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  zalary.app / dashboard
                </span>
              </div>
              <div className="space-y-4 p-5">
                <h3 className="text-2xl font-light tracking-tight">
                  Dashboard
                </h3>
                {/* Chart card */}
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">
                      Payouts over time
                    </span>
                    <div className="inline-flex rounded-md bg-muted p-0.5">
                      {["30d", "6m", "All"].map((r) => (
                        <span
                          key={r}
                          className={`rounded px-2 py-0.5 text-[9px] font-medium ${r === "All" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <svg
                    viewBox="0 0 300 80"
                    className="h-16 w-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="mockFillMonthly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="mockFillAccum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary-dark)" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="var(--primary-dark)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <polygon fill="url(#mockFillAccum)" points="0,65 50,52 100,40 150,30 200,22 250,15 300,8 300,80 0,80" />
                    <polyline fill="none" stroke="var(--primary-dark)" strokeWidth="1.5" points="0,65 50,52 100,40 150,30 200,22 250,15 300,8" />
                    <polygon fill="url(#mockFillMonthly)" points="0,70 50,60 100,65 150,55 200,58 250,50 300,45 300,80 0,80" />
                    <polyline fill="none" stroke="var(--color-primary)" strokeWidth="1.5" points="0,70 50,60 100,65 150,55 200,58 250,50 300,45" />
                  </svg>
                </div>

                {/* Payrolls section */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">
                      Payrolls
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      View All →
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        name: "Core Team",
                        due: "in 3 days",
                        usd: 24500,
                        employees: 8,
                        urgent: true,
                      },
                      {
                        name: "Contractors",
                        due: "in 12 days",
                        usd: 8200,
                        employees: 3,
                        urgent: false,
                      },
                    ].map((p) => (
                      <div key={p.name} className="rounded-lg border">
                        <div className="px-3 pt-3">
                          <p className="text-lg font-light">{p.name}</p>
                          <p
                            className={`mt-1 flex items-center gap-1 text-[10px] ${p.urgent ? "font-medium text-primary" : "text-muted-foreground"}`}
                          >
                            <Calendar className="size-2.5" />
                            Due {p.due}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center border-t text-[10px] text-muted-foreground">
                          <span className="flex-1 py-1.5 text-center">
                            ${p.usd.toLocaleString()}
                          </span>
                          <Separator orientation="vertical" className="h-5" />
                          <span className="flex flex-1 items-center justify-center gap-1 py-1.5">
                            {p.employees} <Users className="size-2.5" />
                          </span>
                          <Separator orientation="vertical" className="h-5" />
                          <span className="flex flex-1 items-center justify-center py-1.5">
                            <Pencil className="size-2.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            {/* Fade overlay */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-xl bg-gradient-to-t from-background to-transparent" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-28 md:px-12">
          <div className="mb-4 text-xs font-bold tracking-widest text-primary uppercase">
            How it works
          </div>
          <div className="mb-16 max-w-xl">
            <h2 className="mb-5 font-serif text-4xl font-light tracking-tight md:text-6xl">
              Three steps, then it runs itself.
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Add recipients once, set your schedule, and Zalary handles the
              rest — privately and automatically every cycle.
            </p>
          </div>

          <div className="grid overflow-hidden rounded-xl border md:grid-cols-3">
            {[
              {
                num: "01",
                title: "Add your recipients",
                body: "Enter your team's wallet addresses. They don't connect a wallet, create an account, or sign anything. You paste an address and they receive payment.",
              },
              {
                num: "02",
                title: "Set amounts and a schedule",
                body: "Set an amount and a cadence: weekly, bi-weekly, or monthly. Zalary executes at the optimal time based on network conditions.",
              },
              {
                num: "03",
                title: "Pay and let it document itself",
                body: "Payments settle through Zcash's shielded pool. Amounts and addresses stay hidden. Zalary generates a private record for your books.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="relative border-r bg-card p-10 last:border-r-0"
              >
                <div className="mb-4 text-6xl font-black tracking-tighter text-muted-foreground/10">
                  {step.num}
                </div>
                <h3 className="mb-3 text-lg font-light tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t px-6 py-28 text-center md:px-12">
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-[700px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse,rgba(244,183,40,0.05)_0%,transparent_68%)]" />
        <div className="relative mx-auto max-w-xl">
          <div className="mb-5 text-xs font-bold tracking-widest text-primary uppercase">
            Get started
          </div>
          <h2 className="mb-5 text-4xl font-serif font-medium tracking-tight md:text-7xl">
            Private payroll,
            <br />
            <em className="text-4xl font-thin text-muted-foreground not-italic">
              running in minutes.
            </em>
          </h2>
          <p className="mb-10 text-base leading-relaxed text-muted-foreground">
            You set things up once. Your team receives payments privately. Every
            transaction is documented automatically — no spreadsheets, no manual
            effort, no exposure.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate("/login")}
              className="shadow-[0_0_48px_rgba(244,183,40,0.2)]"
            >
              Launch Zalary
            </Button>
          </div>
          <p className="mt-7 text-xs text-muted-foreground">
            No credit card. No wallet connection required to get started.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t bg-background px-6 py-6 md:px-12">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Zalary &copy; {new Date().getFullYear()}
        </div>
        <div className="flex gap-6 text-xs text-muted-foreground">
          <a href="/login" className="transition-colors hover:text-foreground">
            Sign in
          </a>
        </div>
      </footer>
    </div>
  )
}
