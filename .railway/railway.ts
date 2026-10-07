import {
  defineRailway,
  github,
  postgres,
  preserve,
  project,
  service,
  volume,
} from "railway/iac"

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "us-west2" })
  Postgres.networking = { privateNetworkEndpoint: "postgres" }
  const postgresVolume = volume("postgres-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: "us-west2",
    sizeMB: 5000,
  })

  // FROST relay for treasury key ceremonies and signing sessions. Private
  // network only: browsers go through the server's /frostd proxy. Sessions
  // live in memory, so only redeploy it when its own Dockerfile changes.
  const Frostd = service("frostd", {
    source: github("faust0o/zalary", {
      checkSuites: false,
      rootDirectory: "deploy/frostd",
    }),
    build: { builder: "DOCKERFILE", watchPatterns: ["/deploy/frostd/**"] },
    replicas: { "us-west2": 1 },
    networking: { privateNetworkEndpoint: "frostd" },
  })

  const ZalaryServer = service("Zalary Server", {
    source: github("faust0o/zalary", { checkSuites: false }),
    build: "cd apps/server && bun run build && cd ../web && bun run build",
    start: "cd apps/server && bun run start",
    preDeploy: "cd apps/server && bunx prisma migrate deploy",
    replicas: { "us-west2": 1 },
    domains: [{ domain: "zalary.app", port: 4000 }],
    networking: { privateNetworkEndpoint: "caring-learning" },
    env: {
      AUTH_SECRET: preserve(),
      CORS_ORIGIN: preserve(),
      DATABASE_URL: preserve(),
      PORT: preserve(),
      FROSTD_URL: "http://frostd.railway.internal:2744",
    },
  })

  return project("Zalary", {
    resources: [Postgres, ZalaryServer, Frostd, postgresVolume],
  })
})
