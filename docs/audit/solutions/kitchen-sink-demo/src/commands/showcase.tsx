/**
 * Showcase Command
 * 
 * Command with subcommands to demonstrate all TUIX components.
 */

import { Command } from '@tuix/cli'
import { ShowcaseDisplayCommand } from './showcase/display'
import { ShowcaseInteractiveCommand } from './showcase/interactive'
import { ShowcaseLayoutCommand } from './showcase/layout'
import { ShowcaseStylingCommand } from './showcase/styling'

export function ShowcaseCommand() {
  return (
    <Command name="showcase" description="Component and styling showcase">
      <ShowcaseDisplayCommand />
      <ShowcaseInteractiveCommand />
      <ShowcaseLayoutCommand />
      <ShowcaseStylingCommand />
    </Command>
  )
}