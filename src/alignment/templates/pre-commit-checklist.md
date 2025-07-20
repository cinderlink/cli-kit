# Pre-Commit Checklist

## Required Validation Steps

### Code Quality
- [ ] All tests pass (`bun test`)
- [ ] No TypeScript errors (`bun run tsc --noEmit`)
- [ ] Code follows existing patterns and conventions
- [ ] {additionalCodeQualityChecks}

### Type Safety
- [ ] No `any` types used
- [ ] Proper discriminated unions for variants
- [ ] Type guards for external data validation
- [ ] Effect signatures include error types

### Testing Requirements
- [ ] New code has corresponding tests
- [ ] Coverage thresholds maintained ({minCoverage}% lines/functions, {minBranchCoverage}% branches)
- [ ] Tests are deterministic and fast
- [ ] Error conditions tested

### Documentation
- [ ] JSDoc updated for changed APIs
- [ ] Parameter and return value documentation complete
- [ ] Usage examples provided for complex functions
- [ ] Related documentation links updated

### Code Organization
- [ ] Single implementation principle followed
- [ ] No duplicate implementations created
- [ ] Proper file naming conventions used
- [ ] Clean imports and exports

### Cleanup
- [ ] No development artifacts (.bak, .old, .temp files)
- [ ] No commented-out code blocks
- [ ] No unused imports or variables
- [ ] No debugging console.logs left in code

## Command Checklist

Run these commands before committing:

```bash
# 1. Test everything
bun test

# 2. Type check
bun run tsc --noEmit

# 3. Check git status
git status

# 4. Review changes
git diff

# 5. Stage appropriate files
git add [files]

# 6. Commit with descriptive message
git commit -m "{commitMessageFormat}"
```

## Quality Gates

### Must Pass
- ✅ All tests pass
- ✅ Zero TypeScript errors
- ✅ Coverage thresholds met
- ✅ {additionalMustPass}

### Should Pass
- ✅ No new warnings
- ✅ Documentation complete
- ✅ Examples validated
- ✅ {additionalShouldPass}