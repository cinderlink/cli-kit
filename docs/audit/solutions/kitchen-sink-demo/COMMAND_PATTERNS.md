# TUIX Command Patterns

This kitchen sink demo showcases multiple ways to create commands, from quick prototypes to production-ready structures.

## **Pattern 1: Quick Inline Commands** (The Fast Way)

For simple commands without complex logic:

```tsx
// Simplest - just JSX content
<Command name="version">
  <Text>Kitchen Sink Demo v1.0.0</Text>
</Command>

// With basic interactivity
<Command name="hello">
  {() => {
    const state = $state({ count: 0 })
    return <Text>Hello! Count: {state.count}</Text>
  }}
</Command>

// With args/flags inline
<Command 
  name="greet"
  args={{ name: z.string() }}
  flags={{ loud: z.boolean() }}
>
  {({ args, flags }) => (
    <Text>{flags.loud ? args.name.toUpperCase() : args.name}</Text>
  )}
</Command>
```

## **Pattern 2: Structured Commands** (The Clean Way)

For production commands with proper separation:

```
commands/
└── dashboard/
    ├── schema.ts      # Argument/flag definitions
    ├── handler.tsx    # UI rendering logic
    ├── provider.tsx   # Command wrapper (optional)
    └── index.ts      # Exports
```

### schema.ts
```tsx
export const dashboardSchema = createCommandSchema({
  args: { /* ... */ },
  flags: { 
    refresh: z.number().default(5000),
    compact: z.boolean().default(false)
  }
})
```

### handler.tsx
```tsx
export function DashboardHandler({ args, flags, config }) {
  const state = $state({ /* ... */ })
  return <DashboardView {...state} />
}
```

### index.tsx (simple version)
```tsx
export function DashboardCommand(props) {
  return (
    <Command name="dashboard" schema={dashboardSchema} {...props}>
      {DashboardHandler}
    </Command>
  )
}
```

### provider.tsx (advanced version)
```tsx
export function DashboardCommand({ 
  config,
  beforeRender,
  wrapper,
  ...props 
}) {
  return (
    <Command schema={dashboardSchema} {...props}>
      {(cmdProps) => {
        beforeRender?.()
        const content = <DashboardHandler {...cmdProps} config={config} />
        return wrapper ? wrapper({ children: content }) : content
      }}
    </Command>
  )
}
```

## **Pattern 3: Mixed Approach** (Real World)

Most apps use a mix of patterns:

```tsx
<CLI name="myapp">
  {({ config }) => (
    <>
      {/* Structured commands for complex features */}
      <DashboardCommand config={config} />
      <ProcessCommand />
      
      {/* Scoped commands */}
      <Scope name="admin">
        <UserManagementCommand />
        <ConfigCommand />
      </Scope>
      
      {/* Quick utility commands */}
      <Command name="ping">
        <Text>Pong!</Text>
      </Command>
      
      {/* Inline command with schema */}
      <Command name="echo" args={{ text: z.string() }}>
        {({ args }) => <Text>{args.text}</Text>}
      </Command>
    </>
  )}
</CLI>
```

## **Key Benefits**

### **Quick Commands**
- ✅ Fast to write
- ✅ Great for prototypes
- ✅ Minimal boilerplate
- ❌ Can get messy at scale

### **Structured Commands**
- ✅ Maintainable at scale
- ✅ Easy to test
- ✅ Clear separation of concerns
- ✅ Reusable patterns
- ❌ More files to manage

## **When to Use Each Pattern**

1. **Use Quick Inline** when:
   - Command is very simple (< 20 lines)
   - No complex state management
   - Prototype or utility command

2. **Use Structured** when:
   - Command has complex logic
   - Multiple team members working on it
   - Needs comprehensive testing
   - Part of core functionality

3. **Use Mixed** when:
   - Building a real application
   - Different commands have different complexity
   - Want best of both worlds

## **Advanced Features**

### **Schema Extension**
```tsx
const baseSchema = createCommandSchema({ /* ... */ })
const extendedSchema = extendCommandSchema(baseSchema, {
  flags: { advanced: z.boolean() }
})
```

### **Command Composition**
```tsx
<Command name="deploy" schema={deploySchema}>
  {(props) => (
    <>
      <PreflightChecks {...props} />
      <DeploymentProgress {...props} />
      <PostDeployHooks {...props} />
    </>
  )}
</Command>
```

### **Plugin Integration**
```tsx
<ProcessManagerPlugin
  processWrapper={({ children, process }) => (
    <CustomProcessLayout process={process}>
      {children}
    </CustomProcessLayout>
  )}
/>
```

## **Best Practices**

1. **Start simple** - Use inline commands first
2. **Refactor when needed** - Move to structured when complexity grows
3. **Use runes** - Leverage $state, $derived, $effect for reactivity
4. **Type everything** - Zod schemas ensure type safety
5. **Single purpose** - Each file should do one thing well
6. **Document patterns** - Help your team understand the structure