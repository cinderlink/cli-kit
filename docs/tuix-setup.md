# TUIX File Support Setup

This guide helps you set up proper tooling support for `.tuix` files (Terminal UI eXtensions) in your project.

## What are .tuix files?

`.tuix` files are Terminal UI component files that use JSX-like syntax specifically for building terminal user interfaces with `@cinderlink/cli-kit`. They are similar to `.tsx` files but designed for TUI components instead of web components.

## TypeScript Configuration

### For CLI-Kit Development

If you're working on the CLI-Kit framework itself, the TypeScript configuration is already set up in `tsconfig.json` and `tsconfig.tuix.json`.

### For Projects Using CLI-Kit

Create or extend your `tsconfig.json`:

```json
{
  "extends": "@cinderlink/cli-kit/tsconfig.tuix.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [
    "src/**/*",
    "**/*.tuix"
  ]
}
```

Or if you prefer to configure manually:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@cinderlink/cli-kit",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "target": "ESNext",
    "lib": ["ESNext"]
  },
  "include": [
    "src/**/*",
    "**/*.tuix"
  ]
}
```

## Bun Configuration

Create or update your `bunfig.toml`:

```toml
# JSX configuration for .tuix files
[jsx]
factory = "jsx"
fragment = "Fragment"
importSource = "@cinderlink/cli-kit/jsx-runtime"

# File extension mappings
[loader]
".tuix" = "tsx"
```

## VS Code Support

### File Association

Add to your VS Code `settings.json` or workspace settings:

```json
{
  "files.associations": {
    "*.tuix": "typescriptreact"
  },
  "emmet.includeLanguages": {
    "tuix": "javascriptreact"
  }
}
```

### Extension Recommendations

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode"
  ]
}
```

## Package.json Scripts

Add helpful scripts to your `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:tuix": "tsc --project tsconfig.tuix.json --noEmit",
    "dev": "bun --watch run src/index.tuix",
    "build": "bun build src/index.tuix --outdir dist"
  }
}
```

## Example .tuix File

```tsx
#!/usr/bin/env bun

import { $bindable } from "@cinderlink/cli-kit/runes"
import { Box, Text, TextInput } from "@cinderlink/cli-kit/components"

export default function MyTUIApp() {
  const name = $bindable("")
  const count = $bindable(0)
  
  return (
    <Box border="rounded" padding={2}>
      <Text bold>My TUI Application</Text>
      <Text>Name: <TextInput bind:value={name} /></Text>
      <Text>Count: {count.$value}</Text>
    </Box>
  )
}

// Run the app
if (import.meta.main) {
  const app = MyTUIApp()
  // Start your TUI app here
}
```

## IDE Integration

### WebStorm/IntelliJ

1. Go to Settings → Editor → File Types
2. Find "TypeScript JSX" file type
3. Add `*.tuix` to the file name patterns

### Vim/Neovim

Add to your configuration:

```vim
autocmd BufNewFile,BufRead *.tuix setfiletype typescriptreact
```

### Emacs

Add to your configuration:

```elisp
(add-to-list 'auto-mode-alist '("\\.tuix\\'" . typescript-tsx-mode))
```

## Troubleshooting

### TypeScript Errors

If you see errors like "Cannot find module '*.tuix'", make sure:

1. You have the correct `tsconfig.json` setup
2. The `types/tuix.d.ts` file is included in your project
3. Your IDE has reloaded the TypeScript service

### Bun Not Recognizing .tuix Files

Ensure your `bunfig.toml` has the correct loader configuration and restart your development server.

### JSX Transform Issues

Make sure your `jsxImportSource` points to `@cinderlink/cli-kit` and not React.

## Migration from .tsx

To migrate existing React-style `.tsx` files to `.tuix`:

1. Rename the file extension from `.tsx` to `.tuix`
2. Update imports to use CLI-Kit components instead of React components
3. Replace DOM elements with TUI elements (`<div>` → `<Box>`, etc.)
4. Update your build/run commands to target the new `.tuix` files