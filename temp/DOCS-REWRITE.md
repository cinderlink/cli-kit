# Documentation Rewrite Process

## Core Principles
1. **NEVER rely on memory** - Always read files to verify information
2. **ALWAYS update planning documents** - Track every decision and change
3. **NEVER skip verification** - Check every assumption against actual files
4. **ALWAYS follow the exact process** - No shortcuts or assumptions

## Process Rules for Continuing Work
1. **START**: Read this document completely
2. **CHECK**: Read checklist files in temp/ for current status
3. **VERIFY**: Use grep/glob to find relevant files
4. **UPDATE**: Modify planning documents before making changes
5. **EXECUTE**: Make the actual changes
6. **DOCUMENT**: Update checklists and planning docs
7. **CLEAN**: Remove completed items, consolidate information

## Main Checklist
- [x] Find all *.md files (excluding node_modules)
- [x] Create src/alignment/ module structure
- [x] Create documentation templates
- [ ] Deploy templates to all appropriate locations
  - [ ] Identify all modules in src/
  - [ ] Identify all plugins in plugins/
  - [ ] Copy templates to root
  - [ ] Copy templates to each module
  - [ ] Copy templates to each plugin
- [ ] Update existing documentation
- [ ] Clean up old/outdated files

## Template Files to Create
1. **README.md** - Module/plugin overview
2. **ISSUES.md** - Known issues and tracking
3. **PLANNING.md** - Future work and design decisions
4. **RULES.md** - NEVER/ALWAYS rules for the module
5. **STANDARDS.md** - Code and design standards
6. **DEPENDENCIES.md** - External and internal dependencies
7. **MODULES.md** - (root only) All framework modules
8. **PLUGINS.md** - (root only) All framework plugins
9. **PACKAGES.md** - (if monorepo) Package documentation
10. **PATHS.md** - (if no modules) Path-based documentation

## Path Scopes
1. **Root** (/)
   - RULES.md, CONVENTIONS.md, MODULES.md, PLUGINS.md
2. **Modules** (src/*/README.md exists)
   - All template files for each module
3. **Plugins** (plugins/*)
   - All template files for each plugin
4. **Nested Directories** (src/*/*/)
   - Appropriate subset of templates

## Information Sources
- CLAUDE.md (global and project)
- Existing docs in docs/
- ~/Projects/phx.digital/exemplar/ patterns
- Current module structure
- Existing conventions in codebase

## Conflict Resolution
1. Rename existing files with conflicts to .old
2. Create new template-based file
3. Merge relevant content
4. Delete .old file

## Completed Steps
1. ✅ Found all markdown files (443 total)
2. ✅ Created temp/markdown-files.txt
3. ✅ Created src/alignment/ structure
4. ✅ Created all documentation templates with {variableName} placeholders
5. ✅ Extracted process templates

## Next Steps
1. Identify all modules in src/ directory
2. Identify all plugins in plugins/ directory
3. Create deployment checklist for each location
4. Copy templates with appropriate naming
5. Create module-specific documentation checklists