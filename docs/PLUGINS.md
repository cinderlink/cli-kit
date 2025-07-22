# Tuix Framework Plugins

## Core Plugins

### 🔐 auth
**Purpose**: Authentication and authorization for CLI applications
**Status**: Stable
**Documentation**: [plugins/auth/readme.md](plugins/auth/readme.md)

Features:
- User login/logout
- Token management
- Permission checking
- Session persistence
- Security middleware

Usage:
```typescript
import { authPlugin } from '@tuix/plugins/auth'

// Login command
cli.command('login', authPlugin.commands.login)

// Check authentication
const user = await authPlugin.services.auth.getCurrentUser()
```

## Plugin Architecture

### Plugin Structure
```typescript
export interface Plugin {
  name: string
  version: string
  
  // Lifecycle hooks
  install(context: PluginContext): Promise<void>
  uninstall?(): Promise<void>
  
  // Configuration
  config?: PluginConfig
  
  // Dependencies
  requires?: string[]
  provides?: string[]
}
```

### Plugin Context
```typescript
interface PluginContext {
  // Core services
  logger: Logger
  config: Config
  events: EventEmitter
  
  // Registration methods
  registerCommand(cmd: Command): void
  registerHook(hook: Hook): void
  registerService(service: Service): void
  
  // Plugin communication
  getPlugin(name: string): Plugin
  callPlugin(name: string, method: string, ...args: any[]): any
}
```

## Creating Plugins

### Basic Plugin Template
```typescript
import { definePlugin } from '@tuix/cli/plugin'
import { z } from 'zod'

export const myPlugin = definePlugin({
  metadata: {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'Description of what this plugin does',
    author: 'Your Name'
  },
  
  commands: {
    myCommand: {
      description: 'Description of the command',
      args: {
        input: z.string().describe('Input parameter')
      },
      handler: async (args) => {
        // Command implementation
        return `Processed: ${args.input}`
      }
    }
  },
  
  hooks: {
    beforeCommand: async (command, args) => {
      // Pre-command logic
    },
    afterCommand: async (command, result) => {
      // Post-command logic
    }
  },
  
  services: {
    myService: {
      doSomething: async () => {
        // Service implementation
      }
    }
  },
  
  configSchema: z.object({
    setting: z.string().default('default-value')
  }),
  
  install: async (context) => {
    console.log('Plugin installed')
  },
  
  uninstall: async (context) => {
    console.log('Plugin uninstalled')
  }
})
```

### Plugin Configuration
```typescript
export const myPlugin = definePlugin({
  configSchema: z.object({
    apiKey: z.string().describe('API key for external service'),
    timeout: z.number().default(5000).describe('Request timeout in ms'),
    retries: z.number().default(3).describe('Number of retry attempts')
  }),
  
  // Plugin implementation uses validated config
  commands: {
    apiCall: {
      handler: async (args, context) => {
        const config = context.config // Typed and validated
        // Use config.apiKey, config.timeout, etc.
      }
    }
  }
})
```

## Plugin Development Guidelines

### Best Practices
1. **Isolation**: Plugins should be self-contained
2. **Dependencies**: Declare all dependencies explicitly
3. **Configuration**: Use schema validation
4. **Errors**: Handle errors gracefully
5. **Cleanup**: Always implement uninstall
6. **Documentation**: Complete API documentation

### Testing Plugins
```typescript
import { createTestContext } from '@tuix/plugins/testing'

describe('MyPlugin', () => {
  it('should install correctly', async () => {
    const context = createTestContext()
    await myPlugin.install(context)
    
    expect(context.hasCommand('my-command')).toBe(true)
  })
  
  it('should handle commands', async () => {
    const result = await myPlugin.commands.myCommand.handler({
      input: 'test'
    })
    
    expect(result).toBe('Processed: test')
  })
})
```

### Plugin Communication
```typescript
// Event-based communication
context.events.on('user:login', (userData) => {
  // React to events from other plugins
})

context.events.emit('myPlugin:action', { data: 'value' })

// Direct service calls
const authService = context.getPlugin('auth').services.auth
const user = await authService.getCurrentUser()
```

## Plugin Registry

### Official Plugins
Maintained by the Tuix team:
- **auth**: Authentication and authorization
- **logger**: Enhanced logging capabilities
- **process-manager**: Process management (in core)
- **config**: Configuration management (in core)

### Community Plugins
Submit your plugin for listing:
1. Follow plugin guidelines
2. Include comprehensive tests
3. Provide documentation
4. Submit PR to registry

### Plugin Discovery
```bash
# List available plugins
tuix plugin list

# Search for plugins
tuix plugin search logging

# Install plugin
tuix plugin install @community/plugin-name
```

## Plugin Lifecycle

### Installation Flow
1. Validate plugin compatibility
2. Check dependencies
3. Load configuration
4. Call install hook
5. Register plugin services
6. Emit installation event

### Uninstallation Flow
1. Check dependent plugins
2. Call uninstall hook
3. Remove registered services
4. Clean up resources
5. Emit uninstallation event

### Update Flow
1. Check version compatibility
2. Call uninstall on old version
3. Install new version
4. Migrate configuration
5. Verify functionality

## Security Considerations

### Plugin Permissions
Future feature for plugin isolation:
```typescript
export const myPlugin = definePlugin({
  permissions: {
    fs: ['read'],
    net: ['https://api.example.com'],
    process: false,
    env: ['NODE_ENV']
  },
  
  // Plugin implementation
})
```

### Security Best Practices
- **Validate Inputs**: All user inputs and external data
- **Limit Scope**: Request minimal permissions needed
- **Error Handling**: Don't expose internal details
- **Secure Storage**: Use proper file permissions for sensitive data
- **Rate Limiting**: Implement for external API calls

## Performance Guidelines

### Lazy Loading
```typescript
export const myPlugin = definePlugin({
  features: {
    heavyFeature: () => import('./heavy-feature')
  },
  
  commands: {
    heavy: {
      handler: async (args) => {
        const feature = await import('./heavy-feature')
        return feature.process(args)
      }
    }
  }
})
```

### Resource Management
- **Memory**: Monitor and limit usage
- **Connections**: Close when done
- **Timers**: Clean up in uninstall
- **Caching**: Use appropriate TTL

## Troubleshooting

### Common Issues

#### Plugin Won't Load
1. **Check Dependencies**: Verify all required dependencies are installed
2. **Configuration**: Validate plugin configuration schema
3. **Permissions**: Ensure proper file/network permissions
4. **Logs**: Check plugin installation logs

#### Command Not Found
1. **Registration**: Verify command is properly registered
2. **Naming**: Check for naming conflicts with other plugins
3. **Scope**: Ensure plugin is loaded in correct context

#### Performance Issues
1. **Profiling**: Use built-in performance monitoring
2. **Lazy Loading**: Defer expensive operations
3. **Caching**: Implement appropriate caching strategies
4. **Resources**: Monitor memory and CPU usage

### Debug Mode
```bash
# Enable plugin debugging
DEBUG=tuix:plugins tuix run

# Verbose plugin information
tuix plugin list --verbose

# Test plugin installation
tuix plugin test my-plugin
```

## Future Features

### Plugin Marketplace
- **Discovery**: Search and browse plugins
- **Reviews**: Community ratings and feedback
- **Versioning**: Semantic versioning support
- **Updates**: Automatic update notifications

### Enhanced Security
- **Sandboxing**: Plugin execution isolation
- **Permissions**: Fine-grained permission system
- **Auditing**: Plugin behavior monitoring
- **Signing**: Plugin signature verification