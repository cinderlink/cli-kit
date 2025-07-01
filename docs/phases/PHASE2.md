# Phase 2: Component Library & Enhanced Features
## @cinderlink/cli-kit TUI Framework

### 📋 **Overview**

Phase 2 focuses on building a comprehensive component library inspired by the Bubble Tea ecosystem, implementing a robust styling system based on Lipgloss patterns, and creating a flexible layout system. This phase transforms our MVU foundation into a practical toolkit for building rich TUI applications.

### 🎯 **Phase 2 Goals**

1. **Essential Components** - Text input, buttons, lists, tables, and more
2. **Styling System** - Lipgloss-inspired styling with borders, padding, and colors
3. **Layout System** - Flexible positioning and responsive design
4. **Mouse Support** - Click, hover, and drag interactions
5. **Focus Management** - Keyboard navigation and focus states
6. **Real-world Examples** - Forms, dialogs, and complex layouts

### 📚 **Research Insights from Bubbletea Ecosystem**

Based on analysis of bubbles components and examples:

#### **Component Architecture Patterns**
- Model-Update-View with self-contained state
- Composition through embedding
- Standardized constructors with `New()` functions
- Consistent API with Focus/Blur/SetSize methods

#### **Key Features to Implement**
- KeyMap structs for keyboard bindings
- Styles structs for theming
- Focus state management
- Size constraints and overflow handling
- Help system integration

### 🗓️ **Week 3: Core Components**

#### **Goals**
- Implement fundamental interactive components
- Establish component patterns and conventions
- Create consistent API design

#### **Deliverables**

##### **1. Component Base Module** (`src/components/base.ts`)
```typescript
interface ComponentBase<Model, Msg> {
  // Standard properties
  width?: number
  height?: number
  focused: boolean
  
  // Standard methods
  focus(): Effect<void, never, never>
  blur(): Effect<void, never, never>
  setSize(width: number, height: number): Effect<void, never, never>
}
```

##### **2. TextInput Component** (`src/components/textinput.ts`)
- Single-line text input
- Cursor management
- Character limit support
- Placeholder text
- Password mode
- Validation interface
- Selection support
- Inspired by: `bubbles/textinput`

##### **3. Button Component** (`src/components/button.ts`)
- Clickable button with label
- Focus states
- Mouse hover/click support
- Keyboard activation (Enter/Space)
- Disabled state
- Multiple style variants

##### **4. List Component** (`src/components/list.ts`)
- Scrollable item list
- Single/multi selection
- Keyboard navigation
- Item filtering
- Custom item rendering
- Status messages
- Pagination support
- Inspired by: `bubbles/list`

##### **5. Spinner Component** (`src/components/spinner.ts`)
- Loading indicators
- Multiple spinner styles
- Customizable animation speed
- Start/stop control
- Inspired by: `bubbles/spinner`

#### **Testing Requirements**
- Unit tests for each component
- Integration tests for focus management
- Visual regression tests
- Performance benchmarks

### 🗓️ **Week 4: Advanced Components**

#### **Goals**
- Build complex, data-rich components
- Implement viewport-based scrolling
- Add advanced interaction patterns

#### **Deliverables**

##### **1. Table Component** (`src/components/table.ts`)
- Data grid with headers
- Column sizing
- Row selection
- Sorting support
- Cell overflow handling
- Border styles
- Inspired by: `bubbles/table`

##### **2. Textarea Component** (`src/components/textarea.ts`)
- Multi-line text editing
- Word wrapping
- Syntax highlighting support
- Line numbers option
- Undo/redo
- Find/replace
- Inspired by: `bubbles/textarea`

##### **3. Viewport Component** (`src/components/viewport.ts`)
- Scrollable content area
- Smooth scrolling
- Mouse wheel support
- Performance optimization
- Content caching
- Inspired by: `bubbles/viewport`

##### **4. Progress Component** (`src/components/progress.ts`)
- Progress bars
- Multiple styles (bar, percentage, spinner)
- Gradient support
- Animated updates
- Inspired by: `bubbles/progress`

##### **5. Help Component** (`src/components/help.ts`)
- Keyboard shortcut display
- Automatic binding detection
- Collapsible sections
- Context-sensitive help
- Inspired by: `bubbles/help`

### 🗓️ **Week 5: Styling System**

#### **Goals**
- Port Lipgloss styling concepts to TypeScript
- Create flexible theming system
- Implement advanced styling features

#### **Deliverables**

##### **1. Style Core** (`src/styling/style.ts`)
```typescript
interface Style {
  // Colors
  foreground?: Color
  background?: Color
  
  // Borders
  border?: BorderStyle
  borderTop?: boolean
  borderRight?: boolean
  borderBottom?: boolean
  borderLeft?: boolean
  
  // Spacing
  padding?: Padding
  margin?: Margin
  
  // Text
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  
  // Layout
  width?: number
  height?: number
  maxWidth?: number
  maxHeight?: number
  
  // Alignment
  align?: Alignment
  verticalAlign?: VerticalAlignment
}
```

##### **2. Border System** (`src/styling/borders.ts`)
- Multiple border styles (normal, rounded, thick, double)
- Custom border characters
- Border color support
- Partial borders
- Inspired by: Lipgloss borders

##### **3. Color System** (`src/styling/colors.ts`)
- ANSI color support
- RGB/Hex colors
- Adaptive colors (light/dark mode)
- Color gradients
- Color manipulation utilities

##### **4. Layout Helpers** (`src/styling/layout.ts`)
- Flexbox-like layout
- Grid system
- Positioning (absolute, relative)
- Overflow handling
- Responsive utilities

##### **5. Theme System** (`src/styling/theme.ts`)
- Predefined themes
- Theme inheritance
- Component-specific theming
- Runtime theme switching
- Inspired by: Lipgloss adaptive colors

### 🗓️ **Week 6: Enhanced Features**

#### **Goals**
- Add mouse support across components
- Implement focus management system
- Create animation capabilities
- Build developer tools

#### **Deliverables**

##### **1. Mouse Support** (`src/services/mouse.ts`)
- Click detection with component bounds
- Hover state tracking
- Drag operations
- Mouse wheel scrolling
- Context menus

##### **2. Focus Manager** (`src/services/focus.ts`)
- Tab order management
- Focus trapping
- Focus rings/indicators
- Keyboard shortcuts registry
- Focus restoration

##### **3. Animation System** (`src/services/animation.ts`)
- Tween animations
- Spring physics
- Transition effects
- Frame-based updates
- Performance optimization

##### **4. Form System** (`src/components/form.ts`)
- Form state management
- Validation framework
- Field grouping
- Error display
- Submit handling

##### **5. Dialog System** (`src/components/dialog.ts`)
- Modal dialogs
- Confirmation prompts
- Input dialogs
- Custom content
- Keyboard handling

### 📊 **Success Metrics**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Component Count** | 15+ components | Number of production-ready components |
| **Test Coverage** | >90% | Unit + integration test coverage |
| **Performance** | <16ms render | Frame time for complex layouts |
| **Bundle Size** | <5MB | Total framework size |
| **Examples** | 10+ demos | Working example applications |

### 🏗️ **Technical Decisions**

#### **Component Patterns**
```typescript
// Standard component structure
interface Component<Model, Msg> {
  model: Model
  init(): Effect<[Model, Cmd<Msg>[]], never, Services>
  update(msg: Msg): Effect<[Model, Cmd<Msg>[]], never, Services>
  view(): View
  
  // Standard methods
  focus(): Effect<void, never, never>
  blur(): Effect<void, never, never>
  setSize(w: number, h: number): Effect<void, never, never>
  
  // Configuration
  keyMap: KeyMap<Msg>
  styles: Styles
}
```

#### **Message Routing**
```typescript
// Component-specific messages
type TextInputMsg = 
  | { _tag: "CharacterInput", char: string }
  | { _tag: "CursorMove", position: number }
  | { _tag: "SelectionChange", start: number, end: number }

// Parent component routing
type AppMsg =
  | { _tag: "TextInput", id: string, msg: TextInputMsg }
  | { _tag: "List", id: string, msg: ListMsg }
```

#### **Styling API**
```typescript
// Chainable style API
const style = Style.new()
  .foreground(Color.rgb(255, 0, 0))
  .background(Color.hex("#1a1a1a"))
  .border(Border.rounded())
  .padding(2, 4)
  .bold()
```

### 🚀 **Example Applications**

1. **Todo App** - List, input, and persistence
2. **File Manager** - Tree view, preview, operations
3. **Chat Client** - Real-time updates, input, scrolling
4. **Dashboard** - Charts, tables, live data
5. **Code Editor** - Syntax highlighting, file tree
6. **Form Builder** - Drag-drop, validation, preview
7. **Music Player** - Playlist, progress, controls
8. **Git Client** - Commits, diffs, branches
9. **Database Browser** - Tables, queries, results
10. **System Monitor** - Graphs, processes, resources

### 📈 **Risk Mitigation**

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Performance degradation** | High | Continuous benchmarking, virtual rendering |
| **API inconsistency** | Medium | Design reviews, pattern documentation |
| **Mouse support complexity** | Medium | Incremental implementation, feature flags |
| **Cross-platform issues** | High | CI testing on all platforms |
| **Bundle size growth** | Medium | Tree shaking, lazy loading |

### ✅ **Week-by-Week Checklist**

#### **Week 3: Core Components**
- [ ] Component base module with standard interfaces
- [ ] TextInput with full feature set
- [ ] Button with mouse and keyboard support
- [ ] List with filtering and pagination
- [ ] Spinner with multiple styles
- [ ] Unit tests for all components
- [ ] Basic form example

#### **Week 4: Advanced Components**
- [ ] Table with sorting and selection
- [ ] Textarea with editing features
- [ ] Viewport with optimized scrolling
- [ ] Progress with animations
- [ ] Help with automatic detection
- [ ] Integration tests
- [ ] File manager example

#### **Week 5: Styling System**
- [ ] Complete style API
- [ ] All border styles
- [ ] Color system with gradients
- [ ] Layout helpers
- [ ] Theme system
- [ ] Style documentation
- [ ] Themed example app

#### **Week 6: Enhanced Features**
- [ ] Full mouse support
- [ ] Focus management
- [ ] Animation system
- [ ] Form components
- [ ] Dialog system
- [ ] Developer tools
- [ ] Complete example suite

### 🎯 **Definition of Done**

A component/feature is considered complete when:
1. **Fully implemented** with all planned features
2. **Tested** with >90% coverage
3. **Documented** with API docs and examples
4. **Performant** meeting render time targets
5. **Accessible** with keyboard navigation
6. **Typed** with full TypeScript support
7. **Integrated** working with other components

### 🔄 **Continuous Improvement**

- Weekly performance benchmarks
- User feedback integration
- API refinement based on usage
- Documentation updates
- Example expansion
- Community engagement

---

## **Next Steps**

1. Begin Week 3 implementation with TextInput component
2. Set up component testing infrastructure
3. Create component development guide
4. Start API documentation
5. Plan first example application

The framework is ready to evolve from foundation to full-featured TUI toolkit!