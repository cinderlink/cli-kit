# Requirements for TUIX Team Before Exemplar Migration

**Date**: 2025-01-12  
**Status**: Ready to migrate once these items are completed  
**Priority**: High - production integration waiting

## Critical Requirements for Migration

### 1. **Export Missing Core Modules** 🔥
**Status**: TUIX team confirmed these exist but need proper exports

#### **Required Exports in Main Package**
Update `src/index.ts` to include:
```typescript
// CLI Framework - Required for command registration
export { defineConfig, runCLI, definePlugin } from './cli/index.ts'

// Process Manager - Required for development environment management  
export { ProcessManager } from './process-manager/index.ts'

// Logger - Required for structured logging
export { Logger, createDevelopmentLogger } from './logger/index.ts'
```

#### **Required Submodule Exports**
Ensure these imports work:
```typescript
import { ProcessManager } from 'tuix/process-manager'
import { Logger, createDevelopmentLogger } from 'tuix/logger'
```

### 2. **Fix JSX Complex Object Rendering** 🔧
**Issue**: Nested JSX elements showing as `[object Object]` instead of rendered output

#### **Current Problem**
```jsx
// This renders as [object Object]:
<bold><green>{running}</green></bold>
```

#### **Required Fix**
Enhanced string normalization in jsx-runtime.ts to handle nested object serialization properly.

**Expected Result**: All JSX elements should render as terminal-formatted text, not object representations.

### 3. **Update Package.json Exports** 📦
**Required**: Proper export map for submodules

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./cli": "./src/cli/index.ts", 
    "./process-manager": "./src/process-manager/index.ts",
    "./logger": "./src/logger/index.ts",
    "./jsx-runtime": "./src/jsx-runtime.ts"
  }
}
```

### 4. **Documentation Updates** 📚
**Required**: Update API documentation to reflect actual available exports

#### **CLI Framework Examples**
Document the correct import patterns:
```typescript
import { defineConfig, runCLI, definePlugin } from 'tuix'

const config = defineConfig({
  name: 'my-cli',
  version: '1.0.0', 
  commands: { /* ... */ }
})

await runCLI(config)
```

#### **Plugin Pattern Documentation**
Document our working auto-discovery pattern as the official example.

## Testing Requirements

### **Validation Commands**
These must work without errors:
```bash
# Test basic imports
bun -e "import { defineConfig, runCLI } from 'tuix'; console.log('✅ CLI imports work')"

# Test submodule imports  
bun -e "import { ProcessManager } from 'tuix/process-manager'; console.log('✅ Process manager works')"

# Test JSX rendering
bun -e "import { jsx } from 'tuix'; console.log(jsx('bold', {children: jsx('green', {children: 'test'})}));"
```

### **Expected Outputs**
- No import errors
- JSX elements render as formatted terminal text
- All modules accessible via documented paths

## Timeline

### **Phase 1: Core Exports (Required First)**
- [ ] Export CLI framework from main package
- [ ] Export process manager submodule
- [ ] Export logger submodule
- [ ] Update package.json exports map

### **Phase 2: JSX Fix (Required Second)**  
- [ ] Fix complex object rendering in JSX runtime
- [ ] Test nested JSX element rendering
- [ ] Validate no `[object Object]` outputs

### **Phase 3: Documentation (Required Third)**
- [ ] Update API documentation
- [ ] Add CLI framework examples
- [ ] Document plugin patterns

## Success Criteria

### **Migration Ready When**:
1. ✅ All imports work without shim fallbacks
2. ✅ JSX renders properly formatted terminal output
3. ✅ Documentation matches actual API
4. ✅ Example code runs without modification

### **Post-Migration Benefits**:
- Remove ~500 lines of local shim code
- Access to TUIX performance optimizations  
- Official support and updates
- Real-time rendering capabilities

## Communication

**Contact**: Drew via the established Claude conversation  
**Testing**: Will validate immediately when changes are available  
**Timeline**: Ready to migrate within 1-2 hours of completion

**Current Status**: Exemplar CLI is production-ready with shims - waiting only for these TUIX exports to complete migration to official implementation.