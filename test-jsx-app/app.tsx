#!/usr/bin/env bun

import { jsx } from "tuix/jsx-app"

function App() {
  return (
    <vstack>
      <text color="green" bold>🎉 Welcome to your TUIX app!</text>
      <text color="blue">Built with JSX and TypeScript</text>
      
      <panel title="Getting Started" border="rounded">
        <vstack>
          <text>• Edit this file to customize your app</text>
          <text>• Use JSX for declarative UI components</text>
          <text>• Press 'q' to quit the app</text>
        </vstack>
      </panel>
      
      <hstack>
        <button variant="primary">Primary</button>
        <button variant="secondary">Secondary</button>
        <button variant="success">Success</button>
      </hstack>
    </vstack>
  )
}

// Run the app
jsx(App).catch(console.error)
