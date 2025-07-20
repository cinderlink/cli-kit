# Documentation Standards

## Core Principles

### Terse and Informative
- **NO REPETITION**: Avoid duplicate information across documents
- **DIRECT LANGUAGE**: Get to the point quickly
- **ACTIONABLE**: Every document should enable the reader to do something
- **LINKED**: All features must link to relevant docs and code examples
- **CURRENT**: All information must be accurate and up-to-date

### Organization Principles
- **SINGLE SOURCE OF TRUTH**: One document per topic
- **LOGICAL HIERARCHY**: Clear parent-child relationships
- **DISCOVERABLE**: Easy to find through navigation or search
- **PROGRESSIVE**: Basic to advanced information flow

## Documentation Structure

### Root Level
- `README.md` - Project overview, quick start, and navigation
- `CLAUDE.md` - Claude-specific instructions (already exists)

### Core Documentation (`docs/`)
- `docs/README.md` - Documentation index and navigation
- `docs/core/` - Core system documentation
- `docs/audit/` - Audit and quality documentation

### Specialized Documentation
- JSX guides for integration patterns
- API references for public interfaces
- Examples directory for working code samples

## Content Standards

### Every Document Must Have
1. **Clear Purpose**: What this document is for
2. **Prerequisites**: What you need to know first
3. **Main Content**: The actual information
4. **Examples**: Working code examples
5. **Related Links**: Links to related documentation

### Documentation Format
```markdown
# Document Title

## Purpose
Brief description of what this document covers and who it's for.

## Prerequisites
- Link to prerequisite knowledge
- Required setup or tools

## Main Content
### Section 1
Content with code examples

### Section 2
Content with code examples

## Examples
```typescript
// Working code example
```

## Related Documentation
- [Related Doc 1](./related-doc-1.md)
- [Related Doc 2](./related-doc-2.md)
```

### Code Examples
- **WORKING**: All examples must be tested and working
- **COMPLETE**: Include imports and full context
- **RELEVANT**: Directly related to the topic
- **CURRENT**: Match the current API

```typescript
// Good example - complete and working
import { Component } from "../core/types"
import { Effect } from "effect"

const MyComponent: Component<{ label: string }> = (props) => {
  return {
    render: () => `<button>${props.label}</button>`,
    update: (state) => state
  }
}
```

## API Documentation

### Function Documentation
```typescript
/**
 * Brief description of what the function does.
 * 
 * @param param1 - Description of first parameter
 * @param param2 - Description of second parameter
 * @returns Description of return value and its type
 * @throws {ErrorType} Description of when this error is thrown
 * 
 * @example
 * ```typescript
 * const result = myFunction('value1', 'value2')
 * console.log(result) // Expected output
 * ```
 */
export function myFunction(param1: string, param2: number): string {
  // implementation
}
```

### Component Documentation
```typescript
/**
 * A button component with customizable styling and click handling.
 * 
 * @example
 * ```typescript
 * const button = Button({
 *   label: "Click me",
 *   onClick: () => Effect.log("Button clicked")
 * })
 * ```
 */
export const Button: Component<ButtonProps> = (props) => {
  // implementation
}
```

### Service Documentation
```typescript
/**
 * Terminal service for managing console input/output operations.
 * 
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const terminal = yield* TerminalService
 *   yield* terminal.write("Hello, world!")
 * })
 * ```
 */
export interface TerminalService {
  readonly write: (text: string) => Effect.Effect<void, TerminalError>
  readonly read: () => Effect.Effect<string, TerminalError>
}
```

## Documentation Types

### Guide Documents
- **Purpose**: Teach concepts and workflows
- **Structure**: Step-by-step progression
- **Examples**: Multiple working examples
- **Audience**: Users learning the system

### API Reference
- **Purpose**: Complete function/class documentation
- **Structure**: Alphabetical or logical grouping
- **Examples**: Usage examples for each API
- **Audience**: Developers using the API

### Architecture Documents
- **Purpose**: Explain system design and decisions
- **Structure**: High-level concepts to implementation
- **Examples**: Design patterns and trade-offs
- **Audience**: Contributors and maintainers

## Linking Standards

### Internal Links
- Use relative paths: `[Text](../path/to/doc.md)`
- Link to specific sections: `[Text](./doc.md#section-name)`
- Keep links working when files move

### Code Links
- Link to specific files: `[Function](../src/core/types.ts)`
- Link to specific lines: `[Function](../src/core/types.ts#L123)`
- Keep code links updated when code changes

### External Links
- Use full URLs for external resources
- Prefer official documentation sources
- Check links regularly for broken references

## Quality Checklist

### Before Publishing
- [ ] All code examples tested and working
- [ ] All links functional
- [ ] No duplicate information
- [ ] Clear purpose and audience
- [ ] Proper formatting and structure
- [ ] Related documents linked

### During Review
- [ ] Information is accurate
- [ ] Examples match current API
- [ ] No redundant content
- [ ] Clear and actionable
- [ ] Properly linked to code

### Maintenance
- [ ] Update when code changes
- [ ] Remove outdated information
- [ ] Consolidate duplicate content
- [ ] Keep examples current
- [ ] Test all links regularly

## Common Mistakes to Avoid

### Content Issues
- **Outdated Examples**: Code that doesn't work with current API
- **Incomplete Examples**: Missing imports or context
- **Repetitive Content**: Same information in multiple places
- **Vague Language**: Unclear or ambiguous instructions

### Structure Issues
- **Deep Nesting**: Too many levels of hierarchy
- **Orphaned Documents**: No incoming links
- **Broken Links**: Links to non-existent files
- **Missing Navigation**: No way to find related content

### Maintenance Issues
- **Stale Information**: Claims not verified against code
- **Broken Examples**: Examples that don't run
- **Dead Links**: Links to moved or deleted content
- **Inconsistent Formatting**: Mixed styles and formats

## Documentation Workflow

### Creating New Documentation
1. Check existing docs for similar content
2. Follow the template format
3. Include working examples
4. Link to related documentation
5. Update navigation/index files

### Updating Documentation
1. Verify all claims against current code
2. Update examples to match current API
3. Check and fix broken links
4. Remove outdated information
5. Test all code examples

### Reviewing Documentation
1. Check accuracy against code
2. Verify examples work
3. Test all links
4. Ensure clarity and completeness
5. Check for redundancy with other docs

## Audit Requirements

### Regular Audits Must Check
- [ ] All code examples work with current API
- [ ] All links are functional
- [ ] No duplicate information across docs
- [ ] All public APIs are documented
- [ ] Documentation matches actual code behavior
- [ ] Examples are complete and testable