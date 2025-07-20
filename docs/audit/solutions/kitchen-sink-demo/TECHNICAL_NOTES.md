# Technical Notes: JSX Patterns Without a Compiler

## The Challenge

Without a Svelte-style compiler, we cannot implement:
- `let:` directives (e.g., `<CLI let:config>`)
- `{#if}` / `{:else}` blocks (we'd use `<If>` components instead)
- True Svelte 5 snippets with `{#snippet}` syntax

## Solutions for TUIX Without a Compiler

### 1. Render Props Pattern (Current Approach)
```tsx
<CLI name="app">
  {(config) => (
    <AppContent config={config} />
  )}
</CLI>

<Command name="process">
  {(args, flags) => (
    <>
      <Arg name="files" />
      {/* Use args and flags here */}
    </>
  )}
</Command>
```

**Pros**: Works with standard JSX, type-safe, familiar React pattern
**Cons**: More verbose, nested functions can get complex

### 2. Component State Hooks
```tsx
function MyCommand() {
  const { args, flags } = useCommandContext()
  const config = useCliConfig()
  
  return <>{/* Use args, flags, config */}</>
}
```

**Pros**: Clean component code, testable
**Cons**: Requires context providers, less declarative

### 3. Props-Based Approach
```tsx
<CLI name="app" configRenderer={(config) => <AppContent config={config} />} />
```

**Pros**: Explicit data flow
**Cons**: Less intuitive API

## Recommendation

For now, we should:
1. **Use render props** for components that need to expose data (`<CLI>`, `<Command>`, `<Stream>`, `<Transform>`)
2. **Use regular components** for display components (`<Box>`, `<Text>`, `<Button>`)
3. **Use hooks** for accessing plugin functionality (`useProcessManager()`, `useLogger()`)
4. **Document clearly** that TUIX currently requires standard JSX patterns

## Future Compiler Considerations

If TUIX implements a compiler later:
- We could support `let:` directives for cleaner syntax
- True Svelte-style snippets and conditional blocks
- Compile-time optimizations for terminal rendering
- Better static analysis and type inference

For now, the render props pattern provides a good balance of functionality and standard JSX compatibility.