# Pre-Commit Checklist

## Required Validation Steps

### Code Quality
- [ ] All tests pass (`bun test`)
- [ ] No TypeScript errors (`bun run tsc --noEmit`)
- [ ] No ESLint errors or warnings
- [ ] Code follows existing patterns and conventions

### Type Safety
- [ ] No `any` types used
- [ ] Proper discriminated unions for variants
- [ ] Type guards for external data validation
- [ ] Effect signatures include error types

### Testing Requirements
- [ ] New code has corresponding tests
- [ ] Coverage thresholds maintained (80% lines/functions, 70% branches)
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

### Integration
- [ ] Examples still work with changes
- [ ] No breaking changes to public APIs (without documentation)
- [ ] All file references updated if files moved
- [ ] Circular dependencies avoided

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
git commit -m "description of changes"
```

## Quality Gates

### Must Pass
- ✅ All tests pass
- ✅ Zero TypeScript errors
- ✅ All linting passes
- ✅ Coverage thresholds met

### Should Pass
- ✅ No new warnings
- ✅ Documentation complete
- ✅ Examples validated
- ✅ Performance acceptable

## Common Issues

### Test Failures
- Run `bun test --verbose` to see detailed output
- Check for timing-dependent tests
- Verify mock data is correct
- Ensure proper cleanup in tests

### TypeScript Errors
- Fix types properly, don't use `any`
- Add proper type guards for external data
- Use discriminated unions for variants
- Check Effect error types are included

### Missing Documentation
- Add JSDoc to all exported functions
- Include parameter descriptions
- Add usage examples
- Document error conditions

### Import Issues
- Use explicit imports, not wildcard
- Separate type and value imports
- Check for circular dependencies
- Verify all imports resolve correctly

## Emergency Procedures

### If Tests Fail
1. **Don't commit** with failing tests
2. **Debug the issue** using test output
3. **Fix the root cause** (don't skip tests)
4. **Verify fix** with multiple test runs

### If Types Break
1. **Fix types properly** (don't use `any`)
2. **Add type guards** if needed
3. **Update discriminated unions** if variants changed
4. **Check Effect signatures** include all error types

### If Documentation Missing
1. **Add JSDoc** to all changed exported APIs
2. **Update examples** if behavior changed
3. **Link related docs** if applicable
4. **Test examples** to ensure they work

## Related Documentation

- [Rules: Single Implementation](../rules/single-implementation.md)
- [Rules: Type Safety](../rules/type-safety.md)
- [Rules: Testing](../rules/testing.md)
- [Process: Development](../processes/development.md)
- [Process: Code Review](../processes/code-review.md)