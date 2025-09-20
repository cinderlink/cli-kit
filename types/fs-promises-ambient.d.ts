// Test-friendly ambient overrides for fs/promises so bun:test mocks can reassign
// Overloaded function types are difficult to reassign in tests; keep these loose.
declare module "fs/promises" {
  export const readdir: any
  export const readFile: any
  export const stat: any
  export const access: any
}

