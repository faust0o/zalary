#!/usr/bin/env node
// Local development on one port, the way production serves it: the server
// restarts on code changes, the web app rebuilds into apps/web/dist (which the
// server serves) on every change, GraphQL types regenerate, and open pages
// reload once a rebuild lands. Ctrl-C stops everything.
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))

const tasks = [
  {
    name: "server",
    color: 36,
    cwd: "apps/server",
    args: ["run", "dev"],
    env: { LIVE_RELOAD: "1" },
  },
  {
    name: "web",
    color: 35,
    cwd: "apps/web",
    args: ["run", "build:watch"],
  },
  {
    name: "codegen",
    color: 33,
    cwd: "apps/web",
    args: ["run", "codegen:watch"],
    // The server writes the schema on start; no need to wait for it to listen.
    env: { GRAPHQL_SCHEMA: "../server/schema.graphql" },
  },
]

const width = Math.max(...tasks.map((t) => t.name.length))
const children = []
let stopping = false

function prefix(task, line) {
  return `\x1b[${task.color}m${task.name.padEnd(width)} │\x1b[0m ${line}`
}

function pipe(task, stream, out) {
  let buffered = ""
  stream.setEncoding("utf8")
  stream.on("data", (chunk) => {
    buffered += chunk
    const lines = buffered.split(/\r?\n/)
    buffered = lines.pop() ?? ""
    for (const line of lines) out.write(prefix(task, line) + "\n")
  })
  stream.on("end", () => {
    if (buffered) out.write(prefix(task, buffered) + "\n")
  })
}

function stop(code) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM")
  }
  setTimeout(() => process.exit(code), 500).unref()
}

for (const task of tasks) {
  const child = spawn("bun", task.args, {
    cwd: `${root}${task.cwd}`,
    env: { ...process.env, FORCE_COLOR: "1", ...task.env },
    stdio: ["ignore", "pipe", "pipe"],
  })
  children.push(child)
  pipe(task, child.stdout, process.stdout)
  pipe(task, child.stderr, process.stderr)
  child.on("exit", (code, signal) => {
    if (stopping) return
    console.error(
      prefix(task, `exited (${signal ?? `code ${code}`}), stopping the rest`)
    )
    stop(code ?? 1)
  })
}

process.on("SIGINT", () => stop(0))
process.on("SIGTERM", () => stop(0))
