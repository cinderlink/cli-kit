# {moduleName} Standards

## Code Standards

### TypeScript Requirements
- **Strict Mode**: Always enabled
- **Type Coverage**: 100% of exports must be typed
- **Discriminated Unions**: Use for all message/event types
- **No Implicit Any**: Zero tolerance

### Naming Conventions
- **Files**: kebab-case (e.g., {exampleFileName}.ts)
- **Classes/Types**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### File Organization
```
{moduleDirectory}/
├── index.ts           # Public API exports
├── types.ts           # Type definitions
├── readme.md          # Module documentation
├── issues.md          # Known issues
├── planning.md        # Future plans
└── {additionalStructure}
```

## Testing Standards

### Test Coverage
- **Minimum**: {minCoverage}% lines, {minBranchCoverage}% branches
- **Target**: {targetCoverage}% overall coverage

## Documentation Standards

### JSDoc Requirements
```typescript
/**
 * {functionDescription}
 * 
 * @param {paramName} - {paramDescription}
 * @returns {returnDescription}
 * @example
 * ```typescript
 * {exampleCode}
 * ```
 */
```

## Module-Specific Standards

{moduleSpecificStandards}

## Compliance Checklist

- [ ] Follows TypeScript standards
- [ ] Meets test coverage requirements
- [ ] Documentation complete
- [ ] {additionalChecklistItems}