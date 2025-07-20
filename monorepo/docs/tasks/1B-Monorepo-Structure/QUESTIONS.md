# Task 1B: Monorepo Structure Migration - Questions

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

### **Q1**: Package dependency questions
**Context**: `packages/cli/package.json` dependencies
**Impact**: Which packages should @tuix/cli depend on?
**Status**: `answered`

**Claude Response**: Based on the kitchen-sink demo patterns, @tuix/cli should depend on @tuix/core (for types) and @tuix/components (for rendering). Avoid circular dependencies.

---

### **Q2**: Import path questions
**Context**: `src/cli/index.ts` imports
**Impact**: How to update imports during migration?
**Status**: `answered`

**Claude Response**: Update all relative imports to use package names. For example, `import { Component } from '../core/types'` becomes `import { Component } from '@tuix/core'`.

---

## **🔄 ACTIVE QUESTIONS** (Developer adds questions here)

### **Q1**: Import path update strategy
**Context**: Updating all imports from relative paths to @tuix/* packages
**Impact**: Need systematic approach to update all imports without breaking functionality
**Status**: `waiting_for_response`

**Claude Response**: Systematic approach for import updates:
1. **Start with leaf packages** (no dependencies): @tuix/styling, @tuix/layout, @tuix/services
2. **Update imports in order**: core → reactive → components → cli
3. **Use TypeScript compiler** to catch broken imports: `bun run tsc --noEmit`
4. **Test incrementally**: After each package, run a quick smoke test
5. **Update examples last**: Once packages work, update examples and kitchen-sink demo
6. **Use search/replace**: `import.*from ['"]\.\..*['"]` regex to find relative imports

### **Q2**: Circular dependency handling
**Context**: Package dependencies and potential circular imports
**Impact**: Need to ensure clean dependency tree
**Status**: `answered`

**Claude Response**: Dependency hierarchy should be:
```
@tuix/core (no deps)
├── @tuix/reactive (depends on core)
├── @tuix/services (depends on core)  
├── @tuix/layout (depends on core)
├── @tuix/styling (depends on core)
├── @tuix/components (depends on core, reactive)
├── @tuix/cli (depends on core, components)
└── @tuix/testing (depends on core, components)
```
If circular deps occur, extract shared code to @tuix/core or create utilities module.

### **Q3**: URGENT - TypeScript compilation errors
**Context**: `bun run tsc --noEmit --project packages/core/tsconfig.json` shows many errors
**Impact**: Packages cannot be used until TypeScript compilation is clean
**Status**: `partially_resolved`

**Claude Response**: I have addressed the critical TypeScript issues you specified:

✅ **Fixed Service Import Issues**: Services are now properly defined within the core package
✅ **Fixed Plugin Type Mismatches**: Added helper function `runPluginInit()` with proper PluginDeps layer
✅ **Fixed Type Assertions**: Added optional chaining (`?.`) for potentially undefined objects

**Progress Made**:
- Fixed plugin lifecycle test issues in `basic-plugin.test.ts`
- Created reusable `runPluginInit()` helper in test-utils
- Fixed undefined property access with optional chaining

**Remaining Issues** (~500 errors):
- Plugin tests in other files still need PluginDeps layer fixes
- Type assertion issues in `builtin-plugins.test.ts` (`process` is of type 'unknown')
- Error handling type mismatches in `errors.test.ts`
- Interactive.ts undefined function call

**Question**: Should I continue fixing all ~500 TypeScript errors, or is the monorepo structure adequate for now with these critical fixes applied? The package structure and imports are working correctly.

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

### **Common Package Dependencies**
- `@tuix/core`: Base for all packages
- `@tuix/reactive`: Only for packages using runes
- `@tuix/components`: For UI-related packages
- `@tuix/services`: For packages needing terminal/input

### **Import Pattern Examples**
```typescript
// Core types
import { Component, Effect } from '@tuix/core'

// CLI building
import { CLI, Command, Scope } from '@tuix/cli'

// UI components
import { Box, Text, Table } from '@tuix/components'

// Reactivity
import { $state, $derived, $effect } from '@tuix/reactive'
```

### **Package Structure Template**
```
packages/[name]/
├── package.json
├── src/
│   ├── index.ts (main exports)
│   ├── [feature].ts
│   └── __tests__/
│       └── [feature].test.ts
└── dist/ (built output)
```

---

**Guidelines for Questions**:
1. **Be specific** - reference exact files and line numbers
2. **Include context** - what you're trying to achieve
3. **Show impact** - how this affects your implementation
4. **One question per entry** - easier to track and resolve