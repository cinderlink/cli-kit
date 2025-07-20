# Audit Rules and Process

## Project Vision
Tuix is a CLI framework that emulates Svelte 5 runes patterns and semantics to create beautiful terminal UIs. The framework augments Svelte 5 projects seamlessly by providing:

- **Core**: Raw primitives using Effect to simplify terminal, OS, filesystem operations
- **Style**: Easy-to-use system for clean and modern terminal UIs
- **CLI**: Programmatic command-line application building with plugins, commands, subcommands, auto help
- **Svelte 5 Layer**: JSX and runes for easy composition of all features
- **Process Manager**: Simple process running and management
- **Logging**: Structured logging infrastructure
- **Streams**: The glue that makes it all reactive and user-friendly in JSX
- **Effect**: The magic for performance and reactivity
- **Bun**: Fast, native runtime optimizations

## Core Principles

### Single Implementation Principle ⚠️ CRITICAL RULE ⚠️
- **ONE VERSION RULE**: Never create multiple versions of the same feature
- **NO WORKAROUNDS**: Fix the real implementation instead of creating simplified versions
- **DELETE CLONES**: If another version exists, it must be removed or justified as distinct
- **REPLACE, DON'T APPEND**: When improving code, replace existing implementation entirely

### Documentation Standards
- **TERSE AND INFORMATIVE**: No repetitive or redundant content
- **LINKED**: All features must link to relevant docs and code examples
- **ACCURATE**: All claims must be verified against actual code
- **COMPLETE**: All public APIs must be documented

### Code Quality Standards
- **TESTED**: Every .ts file must have corresponding .test.ts file
- **TYPED**: No `any` types, use proper TypeScript
- **EFFECT-BASED**: Use Effect patterns consistently
- **JSX-PREFERRED**: JSX is preferred where it doesn't complicate things

## Audit Process Rounds - STRICT RULES

### Round-Based Approach Rules
1. **ALWAYS READ FILES**: Never check off a file without reading it with a tool call
2. **UPDATE DOCUMENTS FIRST**: Always update audit documents before marking complete
3. **RELATED FILES TOGETHER**: Audit related files as groups regardless of checklist position
4. **API SIMPLIFICATION**: Consider how APIs can be simplified and build upon each other
5. **PROGRESS TRACKING**: End each round with rules recap and progress summary

### Audit Order (by Feature Groups)
1. **Core/Runtime** - Foundation primitives
2. **JSX Engine** - Svelte 5 runes emulation
3. **Config System** - Configuration management
4. **Process Manager** - Process lifecycle
5. **Logging** - Logging infrastructure
6. **Styles & Components** - UI building blocks

### Per-File Audit Process
For EACH file being audited:
1. **READ**: Use Read tool to examine the file
2. **ANALYZE**: Check against standards and vision
3. **DOCUMENT**: Create findings document in `docs/audit/findings/`
4. **UPDATE**: Update relationships.md if needed
5. **CHECK**: Mark complete in file-checklists.md

### Round Completion Requirements
At the end of EVERY round:
1. **RULES RECAP**: Repeat the audit rules
2. **ACCOMPLISHMENT SUMMARY**: Brief description of what was completed
3. **PROGRESS COUNTER**: 
   - Documentation files: X/10 checked
   - Source files: X/122 checked
   - Test files: X/4 checked
   - Files remaining: X total

### Round 1: Framework Setup
- [x] Create audit directory structure
- [x] Create standards documents
- [x] Create comprehensive file checklists
- [x] Create relationship tracking templates

### Round 2: Documentation Review
- [ ] Review all docs in /docs for accuracy
- [ ] Identify redundant documentation
- [ ] Check all claims against code
- [ ] Document missing documentation
- [ ] Delete bad/outdated docs

### Round 3: Code Review
- [ ] Verify all features are documented
- [ ] Check test coverage for all source files
- [ ] Identify undocumented features
- [ ] Find redundant implementations
- [ ] Map relationships between components

### Round 4: Standards Compliance
- [ ] Run `bun test` to verify all tests pass
- [ ] Run `bun run tsc --noEmit` to check TypeScript
- [ ] Verify Effect patterns are used correctly
- [ ] Check JSX implementation preferences
- [ ] Validate API consistency

### Round 5: Cleanup
- [ ] Remove redundant features/docs
- [ ] Consolidate duplicate implementations
- [ ] Update documentation links
- [ ] Remove development artifacts
- [ ] Standardize naming conventions

### Round 6: Validation
- [ ] Final test run
- [ ] Type checking validation
- [ ] Documentation link verification
- [ ] API consistency check
- [ ] Standards compliance verification

## Quality Gates
Each round must pass these gates before proceeding:
- All tests must pass (`bun test`)
- No TypeScript errors (`bun run tsc --noEmit`)
- All documented claims verified against code
- No redundant implementations identified
- All relationships properly mapped

## Audit Checklist Templates

### Documentation File Template
```
## File: [filename]
- **Purpose**: [What this doc is for]
- **Accuracy**: [Claims verified? Y/N]
- **Completeness**: [Missing info? Y/N]
- **Links**: [All links work? Y/N]
- **Redundancy**: [Duplicate info elsewhere? Y/N]
- **Status**: [Keep/Delete/Merge]
```

### Code File Template
```
## File: [filename]
- **Purpose**: [What this code does]
- **Documented**: [Has JSDoc? Y/N]
- **Tested**: [Has .test.ts? Y/N]
- **Test Coverage**: [Sufficient? Y/N]
- **Dependencies**: [List key deps]
- **Used By**: [What uses this?]
- **Status**: [Keep/Refactor/Delete]
```

### Test File Template
```
## File: [filename]
- **Tests**: [What it tests]
- **Coverage**: [Lines/Functions/Branches %]
- **Quality**: [Good/Needs Work/Poor]
- **Belongs To**: [Source file it tests]
- **Status**: [Keep/Improve/Delete]
```