/**
 * Showcase Styling Subcommand
 * 
 * Demonstrates styling system and theming.
 */

import { Command } from '@tuix/cli'
import { StylingShowcaseView } from '../../components/showcase/StylingShowcaseView'

export function ShowcaseStylingCommand() {
  return (
    <Command name="styling" description="Showcase styling and themes">
      <StylingShowcaseView />
    </Command>
  )
}