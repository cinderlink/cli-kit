# Tuix Framework Dependencies

## Core Dependencies

### Bun Runtime
**Version**: >= 1.0.0  
**Purpose**: JavaScript/TypeScript runtime and tooling  
**Usage**: 
- Runtime execution
- Package management
- Testing framework
- Build tooling

**Critical APIs**:
- `Bun.serve()` - HTTP server
- `Bun.file()` - File system operations
- `bun:test` - Testing framework
- `bun:sqlite` - Database operations

### Effect
**Version**: ^3.0.0  
**Purpose**: Type-safe functional programming  
**Usage**:
- Error handling
- Async operations
- Dependency injection
- Resource management

**Core Patterns**:
```typescript
// Service pattern
Effect.gen(function* () {
  const service = yield* MyService
  return yield* service.operation()
})

// Error handling
pipe(
  operation,
  Effect.catchTag('ValidationError', () => fallback),
  Effect.provide(layer)
)
```

### @effect/schema
**Version**: ^0.64.0  
**Purpose**: Runtime type validation  
**Usage**:
- Input validation
- Configuration schemas
- API contract validation

## Development Dependencies

### TypeScript
**Version**: ^5.0.0  
**Purpose**: Type checking and compilation  
**Configuration**: Strict mode enabled

### ESLint
**Version**: ^8.0.0  
**Purpose**: Code quality and consistency  
**Configuration**: Project-specific rules

## Framework Philosophy

### Bun-First Development
- **NEVER** use Node.js, npm, yarn, or pnpm
- **NEVER** use node-specific packages when Bun alternatives exist
- **ALWAYS** prefer Bun's built-in APIs

### Effect-Driven Architecture
- **ALWAYS** use Effect for async operations
- **ALWAYS** use tagged errors for error handling
- **ALWAYS** use layers for dependency injection
- **NEVER** use raw Promises in public APIs

## Dependency Management

### Adding Dependencies
1. Justify the need - can it be built with existing tools?
2. Check for Bun-native alternatives first
3. Ensure Effect compatibility
4. Document usage patterns

### Version Policy
- **Core deps**: Pin to minor version
- **Dev deps**: Use caret ranges
- **Security**: Update immediately for vulnerabilities

## Module Dependencies

### Core Module
- Direct: Effect, @effect/schema
- Indirect: None
- Consumers: All other modules

### CLI Module
- Direct: Effect, core
- Indirect: @effect/schema
- Consumers: Applications, plugins

### JSX Module
- Direct: Effect, core
- Indirect: @effect/schema
- Consumers: UI applications, CLI components

### Components Module
- Direct: Effect, core, jsx
- Indirect: @effect/schema
- Consumers: Applications

### Services Module
- Direct: Effect, core
- Indirect: @effect/schema
- Consumers: All modules requiring I/O

### Testing Module
- Direct: Effect, bun:test, core
- Indirect: All framework modules
- Consumers: Test suites

## Breaking Changes Policy

### Major Version Changes
Required when:
- Removing public APIs
- Changing Effect major version
- Changing Bun major version
- Breaking TypeScript compatibility

### Minor Version Changes
Allowed when:
- Adding new features
- Deprecating APIs
- Performance improvements
- Bug fixes

### Patch Version Changes
Only for:
- Bug fixes
- Security patches
- Documentation updates

## Security Considerations

### Dependency Auditing
- Run `bun audit` regularly
- Monitor security advisories
- Update vulnerable dependencies immediately

### Supply Chain Security
- Verify package authenticity
- Use lock files (bun.lockb)
- Review dependency changes in PRs

## Performance Implications

### Bundle Size
- Effect: ~200KB (tree-shakeable)
- @effect/schema: ~50KB (tree-shakeable)
- Total framework overhead: < 300KB

### Runtime Performance
- Bun startup: < 10ms
- Effect overhead: Minimal (< 5% vs raw JS)
- TypeScript: Zero runtime cost

## Future Considerations

### Potential Additions
- **@effect/platform**: For platform-specific features
- **@effect/rpc**: For plugin communication
- **@effect/sql**: For database operations

### Potential Removals
- None planned - core dependencies are stable

## Dependency FAQ

**Q: Why Bun instead of Node.js?**
A: Superior performance, built-in TypeScript, integrated tooling, better DX

**Q: Why Effect instead of raw TypeScript?**
A: Type-safe error handling, composable async, dependency injection, better testing

**Q: Can I use npm packages?**
A: Yes, but prefer Bun-native alternatives when available

**Q: What about Deno/Node compatibility?**
A: Not a goal - we optimize for Bun's capabilities