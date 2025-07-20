# Context Files for Task 1A: Core Type System Tests

## **📚 Essential Reading Order**

### **1. Master Plan & API Examples** (Read First)
```
docs/audit/solutions/LIVING.md:150-183        # Your specific task details
docs/audit/solutions/kitchen-sink-demo/       # Perfect API patterns
docs/audit/opinions/AUDITOR.md                # Problems we're solving
```

### **2. Current Type System** (Study These)
```
src/core/types.ts                             # Current type definitions
src/core/errors.ts                            # Error type patterns  
src/core/runtime.ts:45-120                    # Type usage in runtime
src/core/view.ts:23-56                        # Component type usage
```

### **3. Component System** (Understand Integration)
```
src/components/base.ts:1-89                   # Base component patterns
src/components/component.ts:12-45             # Component implementation
src/components/reactivity.ts:67-123           # Reactive integration
```

### **4. Plugin Architecture** (Critical for Plugin Types)
```
src/cli/plugin.ts:1-156                       # Current plugin system
plugins/auth.ts:23-78                         # Plugin implementation example
src/cli/types.ts:45-123                       # CLI type patterns
```

### **5. Service Interfaces** (Service Type Context)
```
src/services/terminal.ts:1-67                 # Terminal service interface
src/services/input.ts:89-145                  # Input service patterns
src/services/renderer.ts:23-98                # Renderer service types
src/services/storage.ts:12-56                 # Storage service interface
```

### **6. Testing Patterns** (Follow These Conventions)
```
src/testing/test-utils.ts:1-234               # Testing utilities
src/core/view.test.ts:1-89                    # Existing type test patterns
src/components/base.test.ts:45-123            # Component test examples
```

---

## **🎯 Kitchen-Sink Demo References**

### **Component Patterns** (Your API Reference)
```
kitchen-sink-demo/src/components/ProcessList.tsx:1-45    # Component interface usage
kitchen-sink-demo/src/components/ProcessStarter.tsx:23-67 # Component with Effects
kitchen-sink-demo/src/hooks/useAppState.ts:18-35         # State type patterns
```

### **Plugin Patterns** (Plugin Type Examples)
```
kitchen-sink-demo/src/plugins/kitchen-sink.tsx:1-89      # Plugin implementation
kitchen-sink-demo/src/hooks/useAppState.ts:27-45         # Plugin state integration
```

### **Service Usage** (Service Type Context)
```
kitchen-sink-demo/src/commands/process.tsx:34-67         # Service usage in commands
kitchen-sink-demo/src/components/Dashboard.tsx:45-78     # Service integration
```

---

## **🔍 Specific Lines to Study**

### **For Subtask 1A.1 (Component Types)**
```
src/core/types.ts:23-45                      # Component interface definition
src/components/base.ts:12-34                 # Component implementation
kitchen-sink-demo/src/components/ProcessStarter.tsx:15-30 # Perfect component example
```

### **For Subtask 1A.2 (Plugin Types)**
```
src/cli/plugin.ts:45-89                      # Plugin interface
src/cli/types.ts:67-123                      # Plugin type definitions
kitchen-sink-demo/src/plugins/kitchen-sink.tsx:23-45 # Plugin usage pattern
```

### **For Subtask 1A.3 (Service Types)**
```
src/services/terminal.ts:12-34               # Terminal service interface
src/services/input.ts:67-89                  # Input service patterns
src/services/impl/terminal-impl.ts:23-56     # Service implementation
```

### **For Subtask 1A.4 (Effect Integration)**
```
src/core/runtime.ts:89-123                   # Effect usage patterns
src/core/view.ts:45-67                       # Effect in components
src/reactivity/runes.ts:123-156              # Effect with reactivity
```

### **For Subtask 1A.5 (Error Types)**
```
src/core/errors.ts:1-89                      # Error type hierarchy
src/core/runtime.ts:156-189                  # Error handling patterns
src/services/impl/renderer-impl.ts:67-89     # Service error handling
```

---

## **🚨 Critical Integration Points**

### **Effect.ts Integration** (Must Understand)
```
src/core/runtime.ts:67-89                    # How Effects are used
src/core/view.ts:23-45                       # Effects in component lifecycle
src/reactivity/runes.ts:89-123               # Effects with runes
```

### **Existing Test Patterns** (Follow These)
```
src/testing/test-utils.ts:45-89              # Test utility patterns
src/core/view.test.ts:23-67                  # Type testing examples
src/testing/simple-harness.ts:89-123         # Testing harness usage
```

### **Monorepo Structure** (Future Package Locations)
```
docs/audit/solutions/LIVING.md:230-250       # Package structure plan
packages/*/                                  # Where your code will go
```

---

## **⚠️ What to Look For While Reading**

### **Type Patterns**
- How generic constraints are used (`Model extends object`)
- Effect return types (`Effect<Model, Error, Requirements>`)
- Tagged union patterns for discrimination
- Interface composition and extension

### **Testing Patterns**
- How existing tests verify type safety
- Test utility usage and conventions
- Performance considerations for type tests
- Integration test patterns

### **Architecture Decisions**
- Why certain type choices were made
- How types enable the plugin system
- Integration between components and services
- Error handling and recovery patterns

---

## **🎯 Questions to Answer While Reading**

1. **How do current component types work?** (Study base.ts)
2. **What plugin interface exists?** (Study cli/plugin.ts)
3. **How are services typed?** (Study services/*.ts)
4. **What Effect patterns are used?** (Study runtime.ts)
5. **How are errors handled?** (Study errors.ts)

---

## **📝 Take Notes On**

### **Current Type Gaps** (What's Missing)
- Incomplete generic constraints
- Missing error type discrimination
- Lack of Effect integration
- Insufficient plugin typing

### **Patterns to Follow** (What's Working)
- Successful type patterns in existing code
- Test utilities that work well
- Integration patterns between modules
- Performance considerations

### **Kitchen-Sink Patterns** (Perfect Examples)
- How components should be typed
- Plugin integration patterns
- Service usage examples
- Error handling approaches

---

**Remember**: The kitchen-sink demo shows the PERFECT API. Your types must enable exactly those patterns.