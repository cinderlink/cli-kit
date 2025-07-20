# Task 1D: JSX Runtime Refactoring - Questions

## **❓ DEVELOPER QUESTIONS**

### **Template for New Questions**
```
**Q[Number]**: [Your question]
**Context**: [Specific files/code you're asking about]
**Impact**: [What this affects in your implementation]
**Status**: [waiting_for_response/answered]
```

---

## **📋 SAMPLE QUESTIONS** (Remove these when you add real questions)

### **Q1**: Module boundary decisions
**Context**: `src/jsx-runtime.ts` lines 200-400 - CLI building functions
**Impact**: Should CLI configuration be in separate module or part of CLI module?
**Status**: `answered`

**Claude Response**: Keep CLI configuration in the CLI module (`cli/config.ts`) as it's tightly coupled with CLI functionality. This maintains cohesion while allowing for focused testing.

---

### **Q2**: Shared state handling
**Context**: `src/jsx-runtime.ts` JSXPluginRegistry class
**Impact**: How to handle shared state between modules after refactoring?
**Status**: `answered`

**Claude Response**: Create a shared registry that can be imported by modules needing plugin access. Use dependency injection pattern to pass registry instances rather than global state.

---

## **🔄 ACTIVE QUESTIONS** (Developer adds questions here)

### **Q1**: Self-contained implementation vs dependency on src/ codebase
**Context**: I'm creating packages/jsx/src/ modules but avoiding imports from src/ (like src/core/view, src/styling). I've created packages/jsx/src/runtime/view-factory.ts as a self-contained implementation.
**Impact**: This creates a clean separation but means I'm duplicating some view creation logic. Should I continue with self-contained approach or is it okay to import from src/ for core types and utilities?
**Status**: `waiting_for_response`

**Claude Response**: [Response will be added here]

### **Q2**: Plugin system integration approach
**Context**: The original jsx-runtime.ts has a large JSXPluginRegistry class that manages declarative plugins and CLI commands. I'm creating packages/jsx/src/plugins/ but haven't fully integrated with CLI module yet.
**Impact**: Need to decide how the plugin system integrates with the CLI components and whether to make it fully functional or stub it for now.
**Status**: `waiting_for_response`

**Claude Response**: [Response will be added here]

### **Q3**: Kitchen-sink demo compatibility approach
**Context**: The kitchen-sink demo expects specific APIs from jsx-runtime.ts. Should I focus on making packages/jsx/src/ fully compatible first, or create a compatibility layer?
**Impact**: Affects testing strategy and how quickly we can validate the refactoring.
**Status**: `waiting_for_response`

**Claude Response**: [Response will be added here]

---

## **✅ RESOLVED QUESTIONS**

### **Q[Number]**: [Resolved question]
**Context**: [Context]
**Impact**: [Impact]
**Status**: `answered`

**Claude Response**: [Response]
**Resolution**: [How you applied the answer]

---

## **📚 QUICK REFERENCE**

### **Module Structure Template**
```
packages/jsx/src/[module]/
├── index.ts (main exports)
├── types.ts (module-specific types)
├── [feature].ts (feature implementations)
└── __tests__/
    └── [feature].test.ts
```

### **Function Migration Strategy**
1. **Identify function clusters** - group related functions
2. **Extract dependencies** - identify imports needed
3. **Preserve signatures** - maintain all function signatures
4. **Update imports** - change import paths
5. **Test module** - verify functionality

### **Import Pattern Updates**
```typescript
// Before (monolithic)
import { jsx, jsxs, CLI, Command } from './jsx-runtime'

// After (modular)
import { jsx, jsxs } from './runtime'
import { CLI, Command } from './cli'
```

### **Testing Strategy**
```typescript
// Module testing
describe('CLI Module', () => {
  it('should create CLI component', () => {
    // Test CLI component creation
  })
})

// Integration testing
describe('JSX Integration', () => {
  it('should work with all modules', () => {
    // Test cross-module functionality
  })
})
```

---

## **🎯 REFACTORING GUIDELINES**

### **Function Extraction**
1. **Preserve function signatures** - maintain all existing signatures
2. **Maintain dependencies** - ensure all imports are available
3. **Update import paths** - change relative imports to module imports
4. **Test independently** - verify each module works in isolation

### **State Management**
1. **Identify shared state** - find state used across modules
2. **Create shared modules** - extract shared state to separate modules
3. **Use dependency injection** - pass dependencies rather than global state
4. **Maintain encapsulation** - keep module-specific state private

### **Type Safety**
1. **Preserve type definitions** - maintain all existing types
2. **Create module types** - add types for new module boundaries
3. **Export types** - ensure all types are properly exported
4. **Update type imports** - change type import paths

### **Performance Considerations**
1. **Minimize module boundaries** - avoid excessive module fragmentation
2. **Optimize imports** - use specific imports rather than wildcard imports
3. **Lazy loading** - consider lazy loading for non-critical modules
4. **Bundle optimization** - ensure modules can be tree-shaken

---

## **⚠️ CRITICAL REFACTORING NOTES**

### **Dependency Management**
- **Circular dependencies**: Be careful not to create circular imports
- **Shared dependencies**: Extract shared utilities to separate modules
- **External dependencies**: Ensure all external imports are preserved
- **Type dependencies**: Handle type-only imports correctly

### **Function Boundaries**
- **Related functions**: Keep related functions together
- **Shared utilities**: Extract shared utilities to utils module
- **Configuration**: Group configuration-related functions
- **State management**: Keep state management functions together

### **Testing Strategy**
- **Unit tests**: Test each module independently
- **Integration tests**: Test module interactions
- **Regression tests**: Ensure no functionality is lost
- **Performance tests**: Verify no performance regressions

### **Documentation Requirements**
- **API documentation**: Document all public APIs
- **Migration guide**: Provide migration instructions
- **Examples**: Include usage examples
- **Troubleshooting**: Document common issues

---

**Guidelines for Questions**:
1. **Be specific** - reference exact files and line numbers
2. **Include context** - what you're trying to achieve
3. **Show impact** - how this affects your implementation
4. **One question per entry** - easier to track and resolve