# JSX Nested Commands Issue

## Problem

JSX processes elements from the inside out, which means:
- Child commands are processed before parent commands
- When a child command is created, its parent isn't on the stack yet
- This results in all commands having `parent: null`

## Example

```jsx
<Command name="nested">
  <Command name="sub1" handler={...} />  // Processed first, parent is null
</Command>  // Processed second
```

## Current Workaround

The exemplar team's approach actually works around this by putting the handler as a separate child:

```jsx
<Command name="dev" description="Development environment management">
  <Command name="start" description="Start development environment">
    <Command handler={async (ctx) => { /* ... */ }} />
  </Command>
</Command>
```

This creates the hierarchy:
1. Handler command (no name) - processed first
2. "start" command - processed second, becomes parent of handler
3. "dev" command - processed third, becomes parent of "start"

## Proper Fix Options

1. **Track parent in JSX processing**: Need to modify how Command elements are processed to maintain parent context
2. **Use explicit parent prop**: `<Command name="sub1" parent="nested" />`
3. **Two-pass processing**: Collect all commands first, then build hierarchy based on JSX structure

## Current Status

The current fix makes all named commands top-level, which works for the exemplar use case but doesn't support true nested commands yet.