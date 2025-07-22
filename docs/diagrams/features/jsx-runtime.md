# JSX Runtime Architecture

## Overview

The JSX runtime enables React-like syntax for building terminal user interfaces with TUIX. It provides component-based development with Svelte-inspired reactive bindings and seamless integration with the CLI framework.

## Core JSX Processing Pipeline

```mermaid
sequenceDiagram
    participant Developer as Developer Code
    participant JSX as JSX Runtime
    participant Registry as Component Registry
    participant Scope as Scope Manager
    participant View as View System
    participant Renderer as Renderer Service
    participant Terminal as Terminal Output
    
    Developer->>JSX: Create JSX element
    JSX->>Registry: Resolve component type
    JSX->>Scope: Register CLI/Plugin scopes
    JSX->>View: Transform to View object
    View->>Renderer: Render view tree
    Renderer->>Terminal: Output to terminal
    
    Note over JSX,Scope: Automatic scope registration
    Note over View,Terminal: Efficient rendering pipeline
```

## Component Type Resolution

```mermaid
flowchart TB
    A[JSX Element] --> B{Component Type?}
    B -->|Function Component| C[Execute Function]
    B -->|Intrinsic Element| D[Map to View Primitive]
    B -->|CLI Component| E[Register with Scope System]
    
    C --> F[Process Props & Children]
    D --> G[Apply Styling & Layout]
    E --> H[Update Command Registry]
    
    F --> I[Return View Object]
    G --> I
    H --> I
    
    subgraph "Intrinsic Elements"
        J[text → text()]
        K[box → box()]
        L[vstack → vstack()]
        M[hstack → hstack()]
        N[styled-text → styledText()]
    end
    
    D --> J
    D --> K
    D --> L
    D --> M
    D --> N
    
    style B fill:#2196f3
    style E fill:#ff9800
    style I fill:#4caf50
```

## Scope Registration Integration

```mermaid
graph TB
    subgraph "JSX Component Processing"
        A[JSX CLI Element] --> B[CLI Component Handler]
        C[JSX Plugin Element] --> D[Plugin Component Handler]
        E[JSX Command Element] --> F[Command Component Handler]
    end
    
    subgraph "Scope Management"
        G[Scope Manager] --> H[CLI Scope Creation]
        G --> I[Plugin Scope Creation]
        G --> J[Command Scope Creation]
    end
    
    subgraph "Registry Integration"
        K[Component Registry] --> L[Command Registration]
        K --> M[Plugin Registration]
        K --> N[Handler Registration]
    end
    
    B --> H
    D --> I
    F --> J
    
    H --> L
    I --> M
    J --> N
    
    style G fill:#9c27b0
    style K fill:#9c27b0
```

## Reactive State Management

```mermaid
graph TB
    subgraph "Reactive Primitives"
        A[$state] --> B[State Rune]
        C[$derived] --> D[Derived Rune]
        E[$effect] --> F[Effect Rune]
        G[$bindable] --> H[Bindable Rune]
    end
    
    subgraph "State Graph"
        I[Component State] --> J[Dependency Tracking]
        J --> K[Change Detection]
        K --> L[Update Propagation]
        L --> M[Re-rendering]
    end
    
    subgraph "Lifecycle Integration"
        N[onMount] --> O[Component Initialization]
        P[onDestroy] --> Q[Resource Cleanup]
        R[Component Updates] --> S[State Synchronization]
    end
    
    B --> I
    D --> I
    F --> N
    H --> R
    
    I --> J
    M --> O
    M --> Q
    L --> S
    
    style A fill:#4caf50
    style I fill:#4caf50
    style N fill:#4caf50
```

## View Tree Construction

```mermaid
flowchart TB
    A[JSX Elements] --> B[Element Validation]
    B --> C[Props Processing]
    C --> D[Children Resolution]
    D --> E[View Object Creation]
    
    subgraph "Children Processing"
        F[Single Child] --> G[Direct Assignment]
        H[Array Children] --> I[Child Filtering]
        J[Nested Components] --> K[Recursive Resolution]
        I --> L[Array Flattening]
    end
    
    subgraph "View Optimization"
        M[Redundant Node Removal]
        N[Layout Optimization]
        O[Caching Opportunities]
        P[Render Shortcuts]
    end
    
    D --> F
    D --> H
    D --> J
    
    G --> E
    L --> E
    K --> E
    
    E --> M
    M --> N
    N --> O
    O --> P
    
    style E fill:#2196f3
    style M fill:#ff5722
```

## Fragment Support

```mermaid
sequenceDiagram
    participant JSX as JSX Runtime
    participant Fragment as Fragment Handler
    participant Children as Children Processor
    participant View as View Builder
    
    JSX->>Fragment: Process Fragment element
    Fragment->>Children: Extract children array
    Children->>Children: Filter null/undefined
    Children->>Children: Flatten nested arrays
    
    alt Single Child
        Children->>View: Return child directly
    else Multiple Children
        Children->>View: Wrap in vstack
    else No Children
        Children->>View: Return empty text
    end
    
    View->>JSX: Return processed view
    
    Note over Fragment: Fragments avoid wrapper elements
    Note over Children: Automatic layout for multiple children
```

## CLI Component Integration

```mermaid
graph TB
    subgraph "CLI Components"
        A[cli] --> B[CLI Root Scope]
        C[plugin] --> D[Plugin Scope]
        E[command] --> F[Command Scope]
        G[arg/flag] --> H[Parameter Scopes]
    end
    
    subgraph "JSX Integration"
        I[Component Props] --> J[Metadata Extraction]
        K[Children Processing] --> L[Handler Resolution]
        M[Scope Hierarchy] --> N[Context Building]
    end
    
    subgraph "Command System"
        O[Command Registry] --> P[Execution Context]
        Q[Help Generation] --> R[Documentation]
        S[Validation] --> T[Error Handling]
    end
    
    A --> I
    C --> I
    E --> I
    G --> I
    
    J --> M
    L --> M
    N --> O
    O --> Q
    O --> S
    
    P --> R
    P --> T
    
    style I fill:#e91e63
    style M fill:#e91e63
    style O fill:#e91e63
```

## Error Handling in JSX

```mermaid
flowchart TB
    A[JSX Processing Error] --> B{Error Type?}
    
    B -->|Component Error| C[Component Error Boundary]
    B -->|Type Error| D[Type Validation Error]
    B -->|Rendering Error| E[Rendering Error Handler]
    B -->|Scope Error| F[Scope Registration Error]
    
    C --> G[Fallback Component]
    D --> H[Development Error Display]
    E --> I[Graceful Degradation]
    F --> J[Scope Recovery]
    
    G --> K[Error Logging]
    H --> K
    I --> K
    J --> K
    
    K --> L[User-Friendly Error Message]
    
    style B fill:#f44336
    style K fill:#f44336
```

## Performance Optimizations

```mermaid
graph TB
    subgraph "Rendering Optimizations"
        A[Component Memoization] --> B[Prop Comparison]
        C[View Caching] --> D[LRU Cache]
        E[Lazy Component Loading] --> F[Dynamic Imports]
    end
    
    subgraph "State Optimizations"
        G[Selective Updates] --> H[Dependency Tracking]
        I[Batched Updates] --> J[Update Scheduling]
        K[Change Detection] --> L[Efficient Diffing]
    end
    
    subgraph "Memory Management"
        M[Resource Cleanup] --> N[Effect Disposal]
        O[Scope Cleanup] --> P[Registry Cleanup]
        Q[Event Unsubscription] --> R[Memory Leak Prevention]
    end
    
    B --> H
    D --> J
    F --> L
    
    H --> N
    J --> P
    L --> R
    
    style A fill:#4caf50
    style G fill:#4caf50
    style M fill:#4caf50
```

## Integration with Core Services

```mermaid
sequenceDiagram
    participant JSX as JSX Runtime
    participant Core as Core Services
    participant Terminal as Terminal Service
    participant Input as Input Service
    participant Storage as Storage Service
    
    JSX->>Core: Initialize component
    Core->>Terminal: Setup terminal interface
    Core->>Input: Configure input handling
    Core->>Storage: Load component state
    
    par Rendering Pipeline
        JSX->>Terminal: Render view tree
        Terminal-->>JSX: Render complete
    and Input Processing
        Input->>JSX: User interaction events
        JSX->>JSX: Update component state
    and State Persistence
        JSX->>Storage: Save component state
        Storage-->>JSX: State saved
    end
    
    Note over JSX,Core: Service abstraction layer
    Note over Core: Effect.ts coordination
```

## Related Diagrams

- [CLI System](./cli-system.md) - CLI integration with JSX components
- [Plugin System](./plugin-system.md) - Plugin components in JSX
- [Data Flows](../patterns/data-flows.md) - Core data flow patterns
- [Advanced Patterns](../patterns/advanced.md) - Advanced JSX patterns