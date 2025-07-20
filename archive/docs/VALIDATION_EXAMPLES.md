# TUIX Validation Examples

This guide shows how to use the new Zod validation system in TUIX for type-safe applications.

## Basic Validation

### Using Predefined Schemas

```typescript
import { 
  KeyEventSchema, 
  MouseEventSchema, 
  StyleSchema,
  parseKeyEvent,
  validateMouseEvent 
} from "tuix/validation"

// Parse and validate a key event
const rawInput = { key: "a", ctrl: false, alt: false, shift: false, meta: false }
try {
  const keyEvent = parseKeyEvent(rawInput)
  console.log("Valid key event:", keyEvent)
} catch (error) {
  console.error("Invalid key event:", error.message)
}

// Validate a mouse event
const mouseData = { type: "press", x: 10, y: 5, button: "left", ctrl: false }
if (validateMouseEvent(mouseData)) {
  // mouseData is now typed as MouseEvent
  console.log(`Mouse ${mouseData.type} at ${mouseData.x}, ${mouseData.y}`)
}
```

### Custom Component Validation

```typescript
import { z } from "zod"
import { StyleSchema, ComponentSchema } from "tuix/validation"

// Define your component's prop schema
const ButtonPropsSchema = z.object({
  label: z.string().min(1),
  onClick: z.function().optional(),
  disabled: z.boolean().default(false),
  variant: z.enum(["primary", "secondary", "danger"]).default("primary"),
  style: StyleSchema.optional()
})

type ButtonProps = z.infer<typeof ButtonPropsSchema>

// Validate props at runtime
function createButton(props: unknown): ButtonProps {
  return ButtonPropsSchema.parse(props)
}

// Usage
const button = createButton({
  label: "Click me",
  variant: "primary",
  style: { color: "white", background: "blue" }
})
```

## CLI Configuration Validation

```typescript
import { CLIConfigSchema, parseCLIConfig } from "tuix/validation"

// Define a CLI configuration
const cliConfig = {
  name: "my-cli",
  version: "1.0.0",
  description: "My awesome CLI",
  commands: {
    hello: {
      description: "Say hello",
      handler: (args) => `Hello, ${args.name}!`
    }
  }
}

// Validate the configuration
try {
  const validConfig = parseCLIConfig(cliConfig)
  console.log("CLI config is valid!")
} catch (error) {
  console.error("Invalid CLI config:", error.issues)
}
```

## Component State Validation

```typescript
import { z } from "zod"
import { Component } from "tuix"

// Define your model schema
const TodoModelSchema = z.object({
  todos: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean()
  })),
  filter: z.enum(["all", "active", "completed"]),
  newTodoText: z.string()
})

type TodoModel = z.infer<typeof TodoModelSchema>

// Define message schema
const TodoMsgSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("AddTodo"), text: z.string() }),
  z.object({ type: z.literal("ToggleTodo"), id: z.string() }),
  z.object({ type: z.literal("SetFilter"), filter: z.enum(["all", "active", "completed"]) })
])

type TodoMsg = z.infer<typeof TodoMsgSchema>

// Create a validated component
const TodoApp: Component<TodoModel, TodoMsg> = {
  init: Effect.succeed([
    TodoModelSchema.parse({
      todos: [],
      filter: "all",
      newTodoText: ""
    }),
    []
  ]),
  
  update: (msg, model) => {
    // Validate message
    const validMsg = TodoMsgSchema.parse(msg)
    
    // Update model based on message
    switch (validMsg.type) {
      case "AddTodo":
        const newModel = {
          ...model,
          todos: [...model.todos, {
            id: crypto.randomUUID(),
            text: validMsg.text,
            completed: false
          }],
          newTodoText: ""
        }
        return Effect.succeed([TodoModelSchema.parse(newModel), []])
        
      // ... other cases
    }
  },
  
  view: (model) => {
    // Model is guaranteed to be valid
    return renderTodoList(model)
  }
}
```

## Form Validation

```typescript
import { z } from "zod"
import { TextInput, Button, Panel } from "tuix"

// Define form schema
const UserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  age: z.number().int().min(18, "Must be 18 or older").max(120),
  bio: z.string().max(500, "Bio too long").optional()
})

type UserForm = z.infer<typeof UserFormSchema>

// Form component with validation
const UserFormComponent = {
  view: (model: { form: Partial<UserForm>, errors: Record<string, string> }) => (
    <Panel title="User Registration">
      <TextInput
        label="Name"
        value={model.form.name || ""}
        error={model.errors.name}
        onChange={(name) => ({ type: "UpdateField", field: "name", value: name })}
      />
      
      <TextInput
        label="Email"
        value={model.form.email || ""}
        error={model.errors.email}
        onChange={(email) => ({ type: "UpdateField", field: "email", value: email })}
      />
      
      <Button
        label="Submit"
        disabled={Object.keys(model.errors).length > 0}
        onClick={() => ({ type: "Submit" })}
      />
    </Panel>
  ),
  
  update: (msg, model) => {
    switch (msg.type) {
      case "UpdateField":
        const newForm = { ...model.form, [msg.field]: msg.value }
        
        // Validate the form
        const result = UserFormSchema.safeParse(newForm)
        const errors = result.success ? {} : result.error.formErrors.fieldErrors
        
        return Effect.succeed([{ form: newForm, errors }, []])
        
      case "Submit":
        // Final validation before submission
        const submitResult = UserFormSchema.safeParse(model.form)
        if (submitResult.success) {
          // Submit the valid data
          return Effect.succeed([model, [submitUser(submitResult.data)]])
        } else {
          // Show validation errors
          return Effect.succeed([
            { ...model, errors: submitResult.error.formErrors.fieldErrors },
            []
          ])
        }
    }
  }
}
```

## Process Configuration Validation

```typescript
import { ProcessConfigSchema, parseProcessConfig } from "tuix/validation"

// Define a process configuration
const processConfig = {
  name: "web-server",
  command: "bun",
  args: ["run", "server.ts"],
  cwd: "/path/to/project",
  env: { NODE_ENV: "production", PORT: "3000" },
  autoRestart: true,
  maxRestarts: 5,
  restartDelay: 1000
}

// Validate the configuration
try {
  const validConfig = parseProcessConfig(processConfig)
  console.log("Process config is valid:", validConfig)
} catch (error) {
  console.error("Invalid process config:", error.issues)
}
```

## Advanced Validation Patterns

### Custom Validators

```typescript
import { z } from "zod"

// Custom validation for color values
const ColorSchema = z.string().refine(
  (color) => {
    // Validate hex colors
    if (color.startsWith("#")) {
      return /^#[0-9A-Fa-f]{6}$/.test(color)
    }
    // Validate named colors
    const namedColors = ["red", "green", "blue", "yellow", "cyan", "magenta", "white", "black"]
    return namedColors.includes(color)
  },
  { message: "Invalid color format" }
)

// Custom validation for key combinations
const KeyBindingSchema = z.string().refine(
  (binding) => {
    const parts = binding.split("+")
    const modifiers = ["ctrl", "alt", "shift", "meta"]
    const keys = [...modifiers, "enter", "escape", "space", "tab"]
    
    return parts.every(part => keys.includes(part.toLowerCase()))
  },
  { message: "Invalid key binding format" }
)
```

### Conditional Validation

```typescript
const ComponentConfigSchema = z.object({
  type: z.enum(["button", "input", "panel"]),
  props: z.unknown()
}).refine((data) => {
  // Validate props based on component type
  switch (data.type) {
    case "button":
      return ButtonPropsSchema.safeParse(data.props).success
    case "input":
      return InputPropsSchema.safeParse(data.props).success
    case "panel":
      return PanelPropsSchema.safeParse(data.props).success
    default:
      return false
  }
}, { message: "Props don't match component type" })
```

### Async Validation

```typescript
const UserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email()
}).refine(async (data) => {
  // Check if username is available
  const isAvailable = await checkUsernameAvailability(data.username)
  return isAvailable
}, { message: "Username is already taken" })

// Use with async validation
async function validateUser(userData: unknown) {
  try {
    const validUser = await UserSchema.parseAsync(userData)
    return { success: true, data: validUser }
  } catch (error) {
    return { success: false, errors: error.issues }
  }
}
```

## Error Handling

### Graceful Error Handling

```typescript
import { z } from "zod"

function safeParseWithFallback<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fallback: T
): T {
  const result = schema.safeParse(data)
  if (result.success) {
    return result.data
  } else {
    console.warn("Validation failed, using fallback:", result.error.issues)
    return fallback
  }
}

// Usage
const config = safeParseWithFallback(
  ConfigSchema,
  userInput,
  defaultConfig
)
```

### User-Friendly Error Messages

```typescript
function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map(issue => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ")
}

try {
  const data = MySchema.parse(input)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Validation error:", formatValidationError(error))
  } else {
    console.error("Unexpected error:", error)
  }
}
```

## Best Practices

1. **Validate at Boundaries**: Always validate data at API boundaries
2. **Use Safe Parse**: Prefer `safeParse()` for better error handling  
3. **Provide Defaults**: Use `.default()` for optional fields
4. **Custom Messages**: Provide clear error messages for users
5. **Performance**: Cache schemas and avoid re-parsing in hot paths

## Type Utilities

Use the provided type utilities for safer code:

```typescript
import { 
  isPlainObject, 
  isString, 
  isNumber, 
  hasProperty,
  safeJsonParse
} from "tuix/type-utils"

function processUnknownData(data: unknown) {
  if (isPlainObject(data)) {
    if (hasProperty(data, "name") && isString(data.name)) {
      console.log("Name:", data.name)
    }
    
    if (hasProperty(data, "age") && isNumber(data.age)) {
      console.log("Age:", data.age)
    }
  }
}
```

---

*For more examples, see the [examples](../examples/) directory and [Component Best Practices](./COMPONENT_BEST_PRACTICES.md).*