/**
 * Showcase Display Subcommand
 * 
 * Demonstrates all display components.
 */

import { Command } from '@tuix/cli'
import { DisplayShowcaseView } from '../../components/showcase/DisplayShowcaseView'

export function ShowcaseDisplayCommand() {
  return (
    <Command name="display" description="Showcase display components">
      <DisplayShowcaseView />
    </Command>
  )
}