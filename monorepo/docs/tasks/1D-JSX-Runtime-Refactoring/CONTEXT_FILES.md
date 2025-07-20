# Task 1D: JSX Runtime Refactoring - Context Files

## **📁 CRITICAL CONTEXT FILES**

### **1. Current JSX Runtime Implementation (PRIMARY SOURCE)**
**Location**: `src/jsx-runtime.ts`
**Why Critical**: This is the monolithic 1557-line file that needs to be refactored

**Key Sections**:
- Lines 1-50: Imports and debug setup
- Lines 51-200: JSXPluginRegistry class
- Lines 201-400: CLI building functions
- Lines 401-600: Component registration
- Lines 601-800: Plugin management
- Lines 801-1000: Configuration management
- Lines 1001-1200: Core JSX transforms
- Lines 1201-1400: Reactivity integration
- Lines 1401-1557: Utility functions

**What to Look For**:
- Function boundaries and dependencies
- Class methods and their responsibilities
- Import statements and external dependencies
- Type definitions and interfaces
- Error handling patterns

---

### **2. Kitchen-Sink Demo JSX Usage (TRUE NORTH)**
**Location**: `docs/audit/solutions/kitchen-sink-demo/src/`
**Why Critical**: Shows all JSX patterns we must preserve

**Key Files**:
- `index.tsx` - Main CLI structure with JSX
- `commands/` - Command components using JSX
- `components/` - UI components with JSX
- `plugins/` - Plugin components using JSX

**What to Look For**:
```typescript
// CLI patterns to preserve
<CLI name="kitchen-sink" alias="ks">
  {({ config }) => (
    <>
      <ProcessManagerPlugin as="pm" />
      <LoggerPlugin />
      <DashboardCommand config={config} />
      <Scope name="process">
        <ProcessFilesCommand />
      </Scope>
    </>
  )}
</CLI>

// Component patterns to preserve
<Command name="dashboard" schema={dashboardSchema}>
  {({ args, config }) => (
    <DashboardView config={config} args={args} />
  )}
</Command>
```

---

### **3. Core Types and Interfaces**
**Location**: `src/core/types.ts`
**Why Critical**: Defines types that JSX system must integrate with

**Key Types**:
- `View` interface
- `Component` interface
- `JSX.Element` type
- `ComponentProps` interface

**What to Look For**:
- Type constraints for JSX elements
- Interface definitions for components
- Integration points with core system
- Type safety requirements

---

### **4. Reactivity System Integration**
**Location**: `src/reactivity/runes.ts`
**Why Critical**: JSX system must integrate with Svelte 5 runes

**Key Functions**:
- `isBindableRune` function
- `isStateRune` function
- `BindableRune` type
- `StateRune` type

**What to Look For**:
- Rune detection logic
- State binding mechanisms
- Reactive props processing
- Integration with JSX props

---

### **5. Component System Integration**
**Location**: `src/components/`
**Why Critical**: JSX system must work with all components

**Key Files**:
- `component.ts` - Component base system
- `base.ts` - Component base class
- `Box.ts`, `Text.ts`, etc. - Individual components

**What to Look For**:
- Component prop patterns
- Component lifecycle integration
- JSX element creation patterns
- Component registration requirements

---

### **6. Configuration System**
**Location**: `src/config/index.ts`
**Why Critical**: JSX system uses configuration management

**Key Exports**:
- `config` object
- `templates` object
- Configuration validation
- Template management

**What to Look For**:
- Configuration structure
- Template loading patterns
- Validation mechanisms
- File system operations

---

### **7. Styling System Integration**
**Location**: `src/styling/`
**Why Critical**: JSX system must integrate with styling

**Key Files**:
- `style.ts` - Style definitions
- `color.ts` - Color management
- `render.ts` - Style rendering

**What to Look For**:
- Style prop patterns
- Color handling in JSX
- Style application mechanisms
- Styling integration points

---

## **📋 REFACTORING ANALYSIS**

### **Current JSX Runtime Structure**
```typescript
// Current monolithic structure
src/jsx-runtime.ts (1557 lines)
├── Imports and setup (50 lines)
├── JSXPluginRegistry class (150 lines)
├── CLI building functions (200 lines)
├── Component registration (200 lines)
├── Plugin management (200 lines)
├── Configuration management (200 lines)
├── Core JSX transforms (200 lines)
├── Reactivity integration (200 lines)
└── Utility functions (157 lines)
```

### **Target Refactored Structure**
```typescript
// Target modular structure
packages/jsx/src/
├── cli/
│   ├── index.ts (CLI, Command, Scope)
│   ├── config.ts (CLI configuration)
│   └── routing.ts (Command routing)
├── components/
│   ├── index.ts (Component registry)
│   ├── context.ts (Component context)
│   └── lifecycle.ts (Component lifecycle)
├── plugins/
│   ├── index.ts (Plugin registry)
│   ├── declarative.ts (Declarative plugins)
│   └── management.ts (Plugin management)
├── config/
│   ├── index.ts (Config manager)
│   ├── validation.ts (Config validation)
│   └── templates.ts (Template management)
├── runtime/
│   ├── index.ts (jsx, jsxs, Fragment)
│   ├── elements.ts (Element creation)
│   └── props.ts (Props processing)
├── reactivity/
│   ├── index.ts (Rune handling)
│   ├── binding.ts (State binding)
│   └── props.ts (Reactive props)
├── utils/
│   ├── index.ts (Utility functions)
│   ├── debug.ts (Debug logging)
│   └── fs.ts (File operations)
└── index.ts (Main exports)
```

---

## **🔗 FUNCTION MIGRATION MAP**

### **CLI Building Functions**
```typescript
// From jsx-runtime.ts to packages/jsx/src/cli/
- CLI() component → cli/index.ts
- Command() component → cli/index.ts
- Scope() component → cli/index.ts
- CLI configuration → cli/config.ts
- Command routing → cli/routing.ts
```

### **Component Registration Functions**
```typescript
// From jsx-runtime.ts to packages/jsx/src/components/
- Component registry → components/index.ts
- Component context → components/context.ts
- Component lifecycle → components/lifecycle.ts
- Component stack → components/index.ts
```

### **Plugin System Functions**
```typescript
// From jsx-runtime.ts to packages/jsx/src/plugins/
- JSXPluginRegistry class → plugins/index.ts
- Plugin configuration → plugins/management.ts
- Declarative plugins → plugins/declarative.ts
- Plugin enable/disable → plugins/management.ts
```

### **Configuration Functions**
```typescript
// From jsx-runtime.ts to packages/jsx/src/config/
- Global config manager → config/index.ts
- Configuration validation → config/validation.ts
- Template management → config/templates.ts
- Config file operations → config/index.ts
```

### **Core JSX Functions**
```typescript
// From jsx-runtime.ts to packages/jsx/src/runtime/
- jsx() function → runtime/index.ts
- jsxs() function → runtime/index.ts
- Fragment support → runtime/index.ts
- Element creation → runtime/elements.ts
- Props processing → runtime/props.ts
```

### **Reactivity Functions**
```typescript
// From jsx-runtime.ts to packages/jsx/src/reactivity/
- Rune handling → reactivity/index.ts
- State binding → reactivity/binding.ts
- Reactive props → reactivity/props.ts
- Bindable rune support → reactivity/index.ts
```

### **Utility Functions**
```typescript
// From jsx-runtime.ts to packages/jsx/src/utils/
- Debug logging → utils/debug.ts
- File operations → utils/fs.ts
- String processing → utils/index.ts
- Validation utilities → utils/index.ts
```

---

## **⚠️ CRITICAL MIGRATION NOTES**

### **Dependency Management**
1. **Preserve all imports** - ensure all external dependencies are maintained
2. **Update import paths** - change relative imports to use new module structure
3. **Maintain export compatibility** - ensure public API remains the same
4. **Handle circular dependencies** - carefully manage inter-module dependencies

### **Function Boundaries**
1. **Identify function clusters** - group related functions together
2. **Preserve function signatures** - maintain all existing function signatures
3. **Handle shared state** - carefully manage state shared between modules
4. **Maintain context** - preserve context passing between functions

### **Testing Strategy**
1. **Test each module independently** - ensure modules work in isolation
2. **Test integration** - verify modules work together correctly
3. **Test kitchen-sink demo** - ensure all patterns still work
4. **Test performance** - verify no performance regressions

### **Type Safety**
1. **Maintain type definitions** - preserve all existing type definitions
2. **Add module-specific types** - create types for new module boundaries
3. **Ensure type compatibility** - verify types work across modules
4. **Update type exports** - ensure all types are properly exported

---

## **🎯 SUCCESS VALIDATION**

### **Functionality Preservation**
- [ ] All kitchen-sink demo patterns work
- [ ] All existing tests pass
- [ ] No functionality regressions
- [ ] Performance maintained or improved

### **Module Structure**
- [ ] Clean module separation
- [ ] No circular dependencies
- [ ] Proper concern separation
- [ ] Maintainable code structure

### **API Compatibility**
- [ ] Public API unchanged
- [ ] All exports available
- [ ] Import paths work
- [ ] Type definitions intact

---

**Next Steps**: Read these files in order, then proceed with SUBTASK_SPECS.md implementation.