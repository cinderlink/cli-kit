# Exemplar CLI Debug & Fix Instructions

## 🔍 First, Let's Diagnose the Issue

Please run these commands and paste the output below each one:

### 1. Check your Bun version:
```bash
bun --version
```
**Output:** 

### 2. Verify tuix installation:
```bash
ls -la node_modules/tuix/ | head -20
```
**Output:** 

### 3. Check if jsx-runtime exists:
```bash
ls node_modules/tuix/jsx-runtime.ts node_modules/tuix/jsx-dev-runtime.ts
```
**Output:** 

### 4. Test with explicit JSX source:
```bash
bun --jsx-import-source=tuix run src/bin/exemplar-jsx.tsx help 2>&1
```
**Output:** 

### 5. Run with debug mode:
```bash
TUIX_DEBUG=true bun --jsx-import-source=tuix run src/bin/exemplar-jsx.tsx 2>&1 | head -30
```
**Output:** 

## 🛠️ Quick Fix to Try

### Create a bunfig.toml in your project root:

```toml
[jsx]
# Use the automatic JSX transform
runtime = "automatic"
# Import JSX runtime from tuix
importSource = "tuix"
```

Then test:
```bash
bun ex help
```
**Output:** 

## 📝 Alternative: Add JSX pragma

Add this to the very top of your `src/bin/exemplar-jsx.tsx` file (before imports):

```tsx
/** @jsxImportSource tuix */
```

Then test:
```bash
bun ex help
```
**Output:** 

## 🔧 Update package.json (if above doesn't work)

Change your "ex" script in package.json to:
```json
"ex": "bun --jsx-import-source=tuix run src/bin/exemplar-jsx.tsx"
```

Then test:
```bash
bun run ex help
```
**Output:** 

## 📊 Expected Working Output

When it's working correctly, you should see:

```
app
Exemplar development toolkit
Version: 1.0.0
╭─────────────────────────────────────────────────────╮
│                                                     │
│ Available Commands                                  │
│                                                     │
│ exemplar:dev    Development environment management  │
│ dev             Development environment management  │
│ help            Show help information               │
│                                                     │
╰─────────────────────────────────────────────────────╯
```

## 🚨 If None of This Works

Please also provide:

### 6. Your current tsconfig.json jsx settings:
```bash
grep -A2 -B2 "jsx" tsconfig.json
```
**Output:** 

### 7. Check if tuix is symlinked or real:
```bash
ls -la node_modules | grep tuix
```
**Output:** 

### 8. Tuix package.json exports:
```bash
cat node_modules/tuix/package.json | grep -A20 '"exports"'
```
**Output:** 

## 💡 What's Happening

The error "Cannot find module './jsx-dev-runtime'" happens because:

1. Your `tsconfig.json` has `"jsx": "react-jsx"` which tells TypeScript to use the automatic JSX transform
2. It's configured with `"jsxImportSource": "tuix"` which is correct
3. But Bun's runtime can't find `tuix/jsx-dev-runtime` when it tries to import it

The solutions above tell Bun explicitly where to find the JSX runtime.

## ✅ Once It's Working

Your commands should work like:
```bash
bun ex dev status
bun ex dev start --service vite
bun ex dev logs --follow
```

---

**Please fill in the outputs above and I'll help you get this working!**