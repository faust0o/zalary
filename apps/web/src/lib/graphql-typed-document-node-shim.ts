// Shim for @graphql-typed-document-node/core
// This package is types-only (main: "") which Vite can't resolve.
// The generated codegen output imports TypedDocumentNode at the value level,
// but it's only used as a type and gets erased. We export a dummy value.
export const TypedDocumentNode = {}
