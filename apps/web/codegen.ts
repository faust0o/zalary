import type { CodegenConfig } from "@graphql-codegen/cli"

const config: CodegenConfig = {
  schema:
    process.env.GRAPHQL_SCHEMA ||
    process.env.GRAPHQL_URL ||
    "http://localhost:4000/graphql",
  documents: ["src/**/*.graphql"],
  generates: {
    "src/graphql/__generated__/": {
      preset: "client",
      presetConfig: {
        gqlTagName: "gql",
      },
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        defaultScalarType: "unknown",
      },
    },
  },
  ignoreNoDocuments: true,
}

export default config
