/**
 * Showcase Layout Subcommand
 * 
 * Demonstrates layout components and patterns.
 */

import { Command } from '@tuix/cli'
import { LayoutShowcaseView } from '../../components/showcase/LayoutShowcaseView'

export function ShowcaseLayoutCommand() {
  return (
    <Command name="layout" description="Showcase layout components">
      <LayoutShowcaseView />
    </Command>
  )
}