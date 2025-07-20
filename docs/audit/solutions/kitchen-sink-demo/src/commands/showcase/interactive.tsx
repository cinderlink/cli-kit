/**
 * Showcase Interactive Subcommand
 * 
 * Demonstrates all interactive components.
 */

import { Command } from '@tuix/cli'
import { InteractiveShowcaseView } from '../../components/showcase/InteractiveShowcaseView'

export function ShowcaseInteractiveCommand() {
  return (
    <Command name="interactive" description="Showcase interactive components">
      <InteractiveShowcaseView />
    </Command>
  )
}