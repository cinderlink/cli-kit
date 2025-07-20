# TUIX JSX Command Registration Issue

## 🐛 Bug Identified

The JSX command registration system has a fundamental issue with parent-child relationships. Because JSX processes elements from the inside out (children before parents), nested commands are processed before their parent commands exist on the stack. This results in:

1. All commands having `parent: null`
2. Commands being flattened instead of maintaining hierarchy
3. Subcommands like `dev start` becoming top-level commands like `start`

## 🔍 Current Behavior

When you run `bun ex help`, you see:
```
exemplar:start        Start background workers
start                 Start background workers
exemplar:stop         Stop development environment
stop                  Stop development environment
exemplar:dev          Development environment management
dev                   Development environment management
```

Instead of the expected:
```
dev                   Development environment management
  start               Start development environment
  stop                Stop development environment
ai                    AI assistant and model management
  ask                 Ask AI assistant a question
```

## 📝 Root Cause

JSX processes this structure:
```jsx
<Command name="dev">
  <Command name="start" handler={...} />
</Command>
```

In this order:
1. Process `<Command name="start">` - parent is null (dev doesn't exist yet)
2. Process `<Command name="dev">` - too late to establish parent relationship

## 🔧 Possible Solutions

1. **Two-pass processing**: Collect all commands first, then build hierarchy based on JSX nesting
2. **Explicit parent tracking**: Track JSX element nesting depth during processing
3. **Alternative syntax**: Use a different pattern that doesn't rely on JSX nesting

## 🚨 Current Status

The fix attempted to track parent commands, but it doesn't work because of JSX's processing order. A more fundamental change to how commands are processed is needed.