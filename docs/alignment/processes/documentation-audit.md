# Documentation Audit Process

## Overview

This is the systematic documentation audit methodology for ensuring documentation accuracy, completeness, and alignment with actual code implementation.

## Core Documentation Audit Principles

### 1. Claims Verification
**Principle**: All documentation claims must be verified against actual code.

**Process**:
- Read documentation assertions
- Locate corresponding code implementation
- Verify claim accuracy
- Flag discrepancies for correction

### 2. Completeness Assessment
**Principle**: All public APIs and features must have corresponding documentation.

**Process**:
- Inventory all exported functions, classes, interfaces
- Check for corresponding documentation
- Identify undocumented features
- Assess documentation depth and quality

### 3. Link Validation
**Principle**: All internal and external links must be functional and current.

**Process**:
- Test all hyperlinks in documentation
- Verify code references point to correct locations
- Check example code actually works
- Update broken or outdated links

## Documentation Audit Phases

### Phase 1: Inventory and Assessment
**Objective**: Create comprehensive inventory of all documentation

**Tasks**:
- [ ] Catalog all documentation files
- [ ] Identify documentation types (guides, API reference, examples)
- [ ] Map documentation to code features
- [ ] Assess current documentation coverage

**Deliverables**:
- Documentation inventory spreadsheet
- Coverage gap analysis
- Quality assessment matrix

### Phase 2: Claims Verification
**Objective**: Verify all documentation claims against code

**Tasks**:
- [ ] Read each documentation file completely
- [ ] Identify factual claims about code behavior
- [ ] Locate corresponding code implementation
- [ ] Test claimed functionality
- [ ] Document discrepancies

**Process Per File**:
```markdown
## File: [filename]
### Claims Analysis
- **Claim**: [documented assertion]
- **Code Location**: [file:line reference]
- **Verification**: [Pass/Fail]
- **Notes**: [discrepancies or issues]

### Overall Assessment
- **Accuracy**: [percentage of verified claims]
- **Completeness**: [missing information assessment]
- **Clarity**: [readability and understanding]
- **Currency**: [how up-to-date information is]
```

### Phase 3: API Documentation Review
**Objective**: Ensure all public APIs are properly documented

**Tasks**:
- [ ] Extract all exported functions/classes/interfaces
- [ ] Check for JSDoc documentation
- [ ] Verify parameter documentation
- [ ] Verify return value documentation
- [ ] Check for usage examples

**API Documentation Template**:
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
```

### Phase 4: Example Validation
**Objective**: Ensure all code examples work correctly

**Tasks**:
- [ ] Extract all code examples from documentation
- [ ] Create test files for each example
- [ ] Run examples to verify they work
- [ ] Update examples that are broken
- [ ] Add missing examples for complex features

**Example Testing Process**:
```bash
# Extract example from docs
# Save as temporary file
# Run with appropriate runtime
bun run temp-example.ts

# Verify output matches expected behavior
# Update documentation if example is incorrect
```

### Phase 5: Structure and Navigation
**Objective**: Ensure documentation is well-organized and navigable

**Tasks**:
- [ ] Review information architecture
- [ ] Check navigation between documents
- [ ] Verify table of contents accuracy
- [ ] Assess progressive disclosure
- [ ] Validate cross-references

**Navigation Assessment**:
```markdown
## Navigation Analysis
- **Entry Points**: [how users find information]
- **Information Flow**: [logical progression]
- **Cross-References**: [links between related topics]
- **Search-ability**: [how easy to find specific info]
```

### Phase 6: Redundancy Elimination
**Objective**: Remove duplicate and redundant information

**Tasks**:
- [ ] Identify duplicate content across files
- [ ] Assess information overlap
- [ ] Consolidate redundant sections
- [ ] Create single source of truth for each topic
- [ ] Update cross-references after consolidation

## Documentation Quality Standards

### Content Standards
- **ACCURATE**: All claims verified against code
- **COMPLETE**: All public APIs documented
- **CURRENT**: Information reflects latest implementation
- **CLEAR**: Written in plain, understandable language
- **CONCISE**: No unnecessary repetition or verbosity

### Structure Standards
- **PROGRESSIVE**: Basic to advanced information flow
- **NAVIGABLE**: Clear paths between related information
- **SEARCHABLE**: Good headings and organization
- **LINKED**: Proper cross-references and external links

### Code Example Standards
- **WORKING**: All examples execute without errors
- **COMPLETE**: Include necessary imports and context
- **RELEVANT**: Directly related to documented feature
- **TESTED**: Examples validated through automated testing

## Quality Assessment Framework

### Documentation File Assessment
```markdown
## File: [filename]
### Content Quality
- **Accuracy**: X% of claims verified
- **Completeness**: Missing [list items]
- **Currency**: Last updated [date], code changed [date]
- **Clarity**: [assessment notes]

### Structure Quality  
- **Organization**: [logical flow assessment]
- **Navigation**: [ease of finding information]
- **Cross-references**: [link quality and coverage]

### Code Examples
- **Count**: X examples total
- **Working**: X/X examples execute correctly
- **Complete**: X/X examples include full context
- **Tested**: X/X examples have automated tests

### Recommendations
- **Keep**: [what's working well]
- **Fix**: [specific issues to address]
- **Enhance**: [opportunities for improvement]
- **Remove**: [redundant or outdated content]
```

### Overall Documentation Health Metrics
```markdown
## Documentation Health Dashboard
### Coverage Metrics
- **API Coverage**: X% of public APIs documented
- **Feature Coverage**: X% of features have guides
- **Example Coverage**: X% of features have examples

### Quality Metrics
- **Accuracy Rate**: X% of claims verified
- **Link Health**: X% of links working
- **Example Success**: X% of examples working
- **Currency Score**: X% of docs updated recently

### Maintenance Metrics
- **Outdated Content**: X files need updates
- **Broken Links**: X links need fixing
- **Missing Docs**: X features need documentation
- **Redundant Content**: X sections need consolidation
```

## Documentation Audit Tools and Commands

### Automated Link Checking
```bash
# Check all markdown links
find docs -name "*.md" -exec markdown-link-check {} \;

# Check code references are valid
grep -r "src/.*\.ts:" docs/ | while read line; do
  # Extract file path and verify it exists
done
```

### Code Example Validation
```bash
# Extract and test code examples
for file in docs/**/*.md; do
  # Extract code blocks
  # Save as temporary test files
  # Run with appropriate runtime
  # Report failures
done
```

### API Documentation Coverage
```bash
# Find all exported APIs
grep -r "^export " src/ > exported-apis.txt

# Find documented APIs
grep -r "@param\|@returns" src/ > documented-apis.txt

# Compare coverage
# Report missing documentation
```

### Content Analysis
```bash
# Find potential duplicate content
for file in docs/**/*.md; do
  # Extract headings and content
  # Compare with other files
  # Report potential duplicates
done
```

## Documentation Maintenance Process

### Daily Maintenance
- **Link Monitoring**: Automated checking of external links
- **Example Testing**: Continuous integration for code examples
- **Currency Tracking**: Monitor code changes that affect documentation

### Weekly Maintenance
- **New Feature Review**: Check for undocumented new features
- **Usage Analytics**: Review which documentation is most accessed
- **User Feedback**: Process documentation improvement requests

### Monthly Maintenance
- **Comprehensive Review**: Full audit of high-traffic documentation
- **Structure Assessment**: Review information architecture
- **Quality Metrics**: Update documentation health dashboard

### Quarterly Maintenance
- **Complete Audit**: Full documentation audit following this process
- **Architecture Review**: Assess overall documentation strategy
- **Tool Evaluation**: Review and update documentation tooling

## Integration with Development Process

### Pre-commit Documentation Checks
```bash
# Check for documentation updates when APIs change
if git diff --name-only | grep -q "src/.*\.ts$"; then
  # Check if corresponding documentation exists
  # Warn if documentation might need updates
fi
```

### Pull Request Documentation Review
- **API Changes**: Require documentation updates for API changes
- **New Features**: Require documentation for new user-facing features
- **Example Updates**: Update examples when APIs change

### Release Documentation Process
- **Pre-release Audit**: Full documentation review before releases
- **Changelog Integration**: Ensure documentation reflects changelog items
- **Migration Guides**: Create migration documentation for breaking changes

## Documentation Audit Deliverables

### Audit Report Template
```markdown
# Documentation Audit Report
**Date**: [audit date]
**Scope**: [files/sections audited]
**Auditor**: [who performed audit]

## Executive Summary
[High-level findings and recommendations]

## Detailed Findings
### Accuracy Issues
[List of inaccurate claims with corrections]

### Completeness Gaps
[List of missing documentation]

### Quality Issues
[List of clarity, structure, or navigation problems]

### Positive Findings
[What's working well]

## Recommendations
### High Priority
[Critical fixes needed]

### Medium Priority  
[Important improvements]

### Low Priority
[Nice-to-have enhancements]

## Action Plan
[Specific steps to address findings]

## Metrics
[Before/after quality measurements]
```

## Related Processes

- [Development Process](./development.md) - Integration with daily development
- [Audit Process](./audit.md) - Overall code and documentation quality
- [Code Review Process](./code-review.md) - Documentation requirements in reviews
- [Documentation Standards](../rules/documentation.md) - Writing and maintenance standards