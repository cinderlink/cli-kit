# Exemplar JSX CLI Fix

## The Issue

The JSX transform treats uppercase elements as component references that must be imported, while lowercase elements are intrinsic and don't need imports.

Working intrinsic elements (no import needed):
- `<vstack>`, `<hstack>`, `<text>`, `<panel>`, etc.

Component elements that MUST be imported:
- `<CLI>`, `<Plugin>`, `<Command>`, `<Flag>`, `<Arg>`, `<Help>`, `<Example>`

## The Fix

Add this import statement after the `jsxImportSource` pragma:

```tsx
/** @jsxImportSource tuix */
import { jsx, CLI, Plugin, Command, Flag, Arg, Help, Example } from 'tuix/jsx';
```

## Complete Working Example

```tsx
#!/usr/bin/env bun
/** @jsxImportSource tuix */

// REQUIRED: Import all uppercase CLI components
import { jsx, CLI, Plugin, Command, Flag, Arg, Help, Example } from 'tuix/jsx';
import { ProcessManagerPlugin } from 'tuix/process-manager';
import { authPlugin } from '$lib/cli/index.js';

function ExemplarCLI() {
  return (
    <CLI name="exemplar" alias="ex" description="Exemplar development toolkit" version="1.0.0">
      {/* Use ProcessManager plugin as dev */}
      <Plugin from={ProcessManagerPlugin} name="dev" />
      
      {/* Authentication */}
      {authPlugin}
      
      {/* Define a plugin inline */}
      <Plugin name="ai" description="AI assistant and model management">
        <Command
          name="ask"
          description="Ask AI assistant a question"
          handler={(ctx) => (
            <vstack>
              <text color="blue">🤖 AI Assistant</text>
              <text>{ctx.args.question}</text>
            </vstack>
          )}
        >
          <Arg name="question" description="Question to ask" required />
          <Flag name="model" description="Model to use" />
        </Command>
      </Plugin>
    </CLI>
  );
}

jsx(ExemplarCLI);
```

## Why This Happens

The JSX specification treats element names differently based on case:

1. **Lowercase elements** are intrinsic elements (like HTML tags)
   - The JSX runtime handles these directly
   - No import needed

2. **Uppercase elements** are component references
   - Must be in scope (imported)
   - The JSX transform expects these to be variables

This is the same behavior as React - `<div>` doesn't need an import but `<MyComponent>` does.

## Alternative: Use a Namespace Import

If you want to avoid listing all components:

```tsx
/** @jsxImportSource tuix */
import { jsx } from 'tuix/jsx';
import * as JSX from 'tuix/jsx';

// Then use JSX.CLI, JSX.Plugin, etc.
function ExemplarCLI() {
  return (
    <JSX.CLI name="exemplar">
      <JSX.Plugin name="ai">
        <JSX.Command name="ask">
          <JSX.Arg name="question" />
        </JSX.Command>
      </JSX.Plugin>
    </JSX.CLI>
  );
}
```

But the explicit imports are cleaner and more idiomatic.