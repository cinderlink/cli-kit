#!/usr/bin/env bun
/** @jsxImportSource tuix */

import { render } from 'tuix/jsx'

function EmptyCLI() {
  return (
    <cli name="empty-test" description="Test empty CLI help" version="1.0.0">
      {/* No plugins or commands - should show help */}
    </cli>
  )
}

render(EmptyCLI).catch(console.error)