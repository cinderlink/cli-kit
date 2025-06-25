#!/usr/bin/env bun
/**
 * Run visual rendering tests
 */

import { runVisualTests } from "./src/testing/visual-test.ts"

runVisualTests().catch(console.error)