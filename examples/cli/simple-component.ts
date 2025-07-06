/**
 * Simple Component Test
 * 
 * Basic test of the simplified component API
 */

import { 
  defineConfig, 
  runCLI,
  createComponent,
  $state,
  onMount,
  text
} from "../../cli"
import { z } from "zod"

// Simple component test
const SimpleComponent = createComponent((context) => {
  const message = context.$state("Hello World!")
  
  context.onMount(() => {
    console.log("Component mounted!")
  })
  
  return {
    view: () => text(message.value)
  }
})

const config = defineConfig({
  name: "simple-component",
  version: "1.0.0",
  description: "Test simplified components",
  
  commands: {
    test: {
      description: "Test simple component",
      handler: (args) => {
        console.log("Handler called, returning component")
        return SimpleComponent
      }
    }
  }
})

if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  runCLI(config).catch(console.error)
}