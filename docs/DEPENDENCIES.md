# Framework Dependencies

## Effect.ts
- API: Effect.gen for async flows, catchAll for errors.
- Caveats: Ensure never types for errors, use pipe for chaining.

## Bun
- API: Bun.file() over fs, bun test.
- Caveats: Node compat issues in tests.

## Zod
- API: z.object for schemas.
- Caveats: Use safeParse for validation.
// Add more...