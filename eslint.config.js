import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      
      // General rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Effect.ts patterns
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error'
    }
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '__tests__/**/*', 'tests/**/*'],
    rules: {
      // Allow console in tests
      'no-console': 'off',
      // Allow any in test files for mocking
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow non-null assertions in tests
      '@typescript-eslint/no-non-null-assertion': 'off'
    }
  },
  {
    files: ['examples/**/*', 'bin/**/*'],
    rules: {
      // Allow console in examples and binaries
      'no-console': 'off',
      // Relax return type requirements for examples
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  }
]