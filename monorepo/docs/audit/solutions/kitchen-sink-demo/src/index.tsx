#!/usr/bin/env bun
/**
 * Kitchen Sink Demo - Main Entry Point
 * 
 * This demonstrates the ideal TUIX application structure:
 * - Clean separation of concerns
 * - Composable plugins and commands
 * - Reusable components
 * - Type-safe throughout
 */

import { jsx } from '@tuix/jsx'
import { KitchenSinkPlugin } from './plugins/kitchen-sink'

// Simple, clean entry point
jsx(() => <KitchenSinkPlugin />).catch(console.error)