/**
 * ANSI escape sequence utilities
 * 
 * Functions for working with ANSI escape codes in terminal output
 */

import { stringWidth } from '../output/string/width'

/**
 * ANSI escape sequence regex pattern
 */
const ANSI_REGEX = /\u001b\[[0-9;]*m/g;

/**
 * Strip ANSI escape codes from a string
 * 
 * @param text - The string to strip ANSI codes from
 * @returns String with ANSI escape codes removed
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

/**
 * Check if a string contains ANSI escape codes
 * 
 * @param text - The string to check
 * @returns True if the string contains ANSI escape codes
 */
export function hasAnsi(text: string): boolean {
  return ANSI_REGEX.test(text);
}

/**
 * Get the visual width of a string (ignoring ANSI codes)
 * 
 * @param text - The string to measure
 * @returns The visual width ignoring ANSI escape codes
 */
export function visualWidth(text: string): number {
  return stringWidth(stripAnsi(text));
}

/**
 * ANSI color codes
 */
export const Colors = {
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  
  // Styles
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  strikethrough: '\x1b[9m'
} as const;

/**
 * Wrap text with color using ANSI escape codes
 * 
 * @param text - The text to colorize
 * @param color - The color key from the Colors object
 * @returns Text wrapped with color codes and reset
 */
export function colorize(text: string, color: keyof typeof Colors): string {
  return `${Colors[color]}${text}${Colors.reset}`;
}

/**
 * Create colored text functions
 */
export const color = {
  black: (text: string) => colorize(text, 'black'),
  red: (text: string) => colorize(text, 'red'),
  green: (text: string) => colorize(text, 'green'),
  yellow: (text: string) => colorize(text, 'yellow'),
  blue: (text: string) => colorize(text, 'blue'),
  magenta: (text: string) => colorize(text, 'magenta'),
  cyan: (text: string) => colorize(text, 'cyan'),
  white: (text: string) => colorize(text, 'white'),
  gray: (text: string) => colorize(text, 'gray'),
  
  bold: (text: string) => colorize(text, 'bold'),
  dim: (text: string) => colorize(text, 'dim'),
  italic: (text: string) => colorize(text, 'italic'),
  underline: (text: string) => colorize(text, 'underline')
};