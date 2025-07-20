# Development Standards

This document outlines the development workflow and standards for the TUIX CLI-Kit project.

## Dogfooding Process

We use our own process management and logging system for development, following the principle of "eating our own dog food."

### Development Environment Setup

Start the development environment using our process manager:

```bash
# Start core development services
tuix dev --services typecheck,test-watch --coverage --timeout 10

# Monitor in interactive mode
tuix pm status --watch --timeout 30
```

### Active Services

1. **TypeScript Checking**: Continuous type checking with immediate error feedback
   - Service: `typecheck`
   - Command: `bun run tsc --noEmit --watch`
   - Health Check: Detects error counts and completion
   - Preset: `tsc` for TypeScript-specific log formatting

2. **Test Watching**: Continuous test execution with coverage tracking
   - Service: `test-watch` 
   - Command: `bun test --watch`
   - Health Check: Test completion detection
   - Preset: `vitest` for test result formatting

### Development Workflow

1. **Start Development**:
   ```bash
   tuix dev --services typecheck,test-watch --coverage --interactive
   ```

2. **Monitor Issues**:
   ```bash
   # View merged logs from both services
   tuix logs --merge typecheck,test-watch --filter "error|fail"
   
   # Follow specific service logs
   tuix logs typecheck --tail --timeout 30
   ```

3. **Fix Issues Iteratively**:
   - Address TypeScript errors first (highest priority)
   - Fix test failures 
   - Improve coverage gaps
   - Remove duplicate code

4. **Quality Gates**:
   ```bash
   # Wait for clean typecheck
   tuix logs typecheck --wait --until "Found 0 errors" --timeout 60
   
   # Wait for all tests passing
   tuix logs test-watch --wait --until "All tests passed" --timeout 120
   ```

## Code Quality Standards

### TypeScript Requirements
- Zero TypeScript compilation errors
- Proper typing without `any` usage
- Component init methods must return proper tuple types: `[Model, Cmd<Msg>[]]`

### Testing Requirements
- Minimum 80% function, line, and statement coverage
- Minimum 70% branch coverage
- All tests must pass before committing
- Use component logic testing for most scenarios

### Code Organization
- Single implementation principle - no duplicate features
- Clear, descriptive naming
- Proper exports and documentation
- Remove development artifacts before committing

## Commands Reference

### Essential Commands
```bash
# Start development environment
tuix dev --services typecheck,test-watch --coverage

# Check build status
bun run tsc --noEmit
bun test

# Quality checks
bun run lint  # if available
```

### Process Management
```bash
# Service control
tuix pm start <service> --preset <type>
tuix pm stop <service>
tuix pm status --watch

# Log management
tuix logs <service> --tail
tuix logs --merge service1,service2 --filter "pattern"
```

## Error Resolution Process

1. **Immediate Priority**: TypeScript compilation errors
2. **High Priority**: Test failures  
3. **Medium Priority**: Coverage gaps
4. **Low Priority**: Code cleanup and optimization

### Current State (as of dogfooding start)
- **TypeScript**: 2194 errors (component init type issues)
- **Tests**: 232 failures out of 1853 total tests
- **Coverage**: 73.27% functions, 74.70% lines

## Benefits of This Approach

1. **Real-world Testing**: We use our tools in actual development
2. **Immediate Feedback**: Issues surface quickly during development
3. **Process Validation**: Our workflows are tested under real conditions
4. **Tool Evolution**: Features evolve based on actual usage patterns

## Integration with External Tools

Our process manager replaces traditional tools:
- **Instead of PM2**: Use `tuix dev` for service orchestration
- **Instead of separate terminals**: Use `tuix logs --merge` for unified monitoring
- **Instead of manual watching**: Use health checks and event waiting

---

This development standard ensures we maintain high code quality while validating our tooling through practical usage.