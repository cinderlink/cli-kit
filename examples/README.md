# CLI Framework Examples

This directory contains curated examples demonstrating the features and capabilities of our Bubble Tea-inspired CLI framework for Bun.

## 📁 Example Overview

### **basic-panel.ts** - Framework Verification
A simple test confirming the framework fundamentals work correctly:
- ✅ **Complete borders** rendered properly on all sides
- ✅ **Color system** working with ANSI codes
- ✅ **Panel layout** with correct padding and spacing
- ✅ **Basic interactions** (counter increment/decrement)

### **contact-form.ts** - Clean Form Implementation
A properly styled contact form demonstrating:
- ✅ **Professional form layout** with complete borders
- ✅ **Clean component composition** with proper focus management
- ✅ **Input validation** with real-time feedback (email validation)
- ✅ **Consistent styling** across all form elements
- ✅ **Tab navigation** and form submission workflow

**Key Features:**
- Name and email inputs with validation
- Tab navigation between fields
- Submit/cancel buttons with proper styling
- Success screen with form data display
- Theme-aware colors that adapt to terminal

### **button-showcase.ts** - Button Variants and States
Comprehensive demonstration of button components:
- ✅ **All button variants**: Primary, Secondary, Success, Danger, Warning, Ghost
- ✅ **Interactive states**: Focus, hover, pressed, disabled
- ✅ **Consistent sizing** and alignment
- ✅ **Theme integration** with proper color relationships
- ✅ **Keyboard navigation** and click handling

**Key Features:**
- 6 button variants in a clean grid layout
- Tab navigation between buttons
- Visual feedback for button clicks
- Consistent styling and behavior

### **layout-patterns.ts** - Layout System Capabilities
Advanced layout demonstrations including:
- ✅ **Panel composition** with borders and padding
- ✅ **Flexbox layouts** (horizontal and vertical)
- ✅ **Centering and alignment** techniques
- ✅ **Nested layouts** for complex UIs
- ✅ **Responsive design** patterns

**Key Features:**
- 4 different layout patterns to browse
- Basic panels with proper spacing
- Flexbox grid system demonstration
- Centered modal-style content
- Complex nested layout (header/sidebar/main/footer)

## 🎨 **Color System**

All examples use the proven ANSI color system for maximum compatibility:

### **Color Palette**
- **Basic ANSI colors** - `Colors.white`, `Colors.cyan`, `Colors.gray`, etc.
- **Status colors** - `Colors.green`, `Colors.yellow`, `Colors.red` for feedback
- **Terminal compatibility** - Works in all terminal environments
- **Consistent appearance** - Reliable color rendering across platforms

### **Styling Features**
- **Text decorations** - Bold, italic, underline, etc.
- **Background colors** - Highlight and focus states
- **Borders and panels** - Clean UI structure
- **Proper spacing** - Padding and margin control

## 🏗️ **Architecture Patterns**

### **Component Design**
- **Interface-driven development** with consistent contracts
- **Effect-based state management** for robust error handling
- **Composable components** that work together seamlessly
- **Focus management** with proper visual feedback

### **Layout System**
- **Flexbox-inspired layouts** with gap control
- **Panel composition** with padding and borders
- **Centering utilities** for modal-style content
- **Responsive techniques** for different terminal sizes

### **Message Architecture**
- **Type-safe messages** with discriminated unions
- **Command composition** using Effect sequences
- **Event handling** with proper state updates
- **Focus propagation** between components

## 🚀 **Running Examples**

Each example is a standalone application. Run them with:

```bash
# Basic framework test
bun examples/basic-panel.ts

# Clean contact form
bun examples/contact-form.ts

# Button showcase
bun examples/button-showcase.ts

# Layout demonstrations
bun examples/layout-patterns.ts
```

## 🎯 **Key Learnings from Examples**

### **1. Framework Fundamentals Work Correctly**
- **Complete borders** - All panel borders render properly on all sides
- **ANSI color system** - Proven color constants work reliably
- **Layout composition** - Flexbox and panel systems function correctly

### **2. Proper Component Architecture**
- **Effect-based state management** - Robust error handling and async flows
- **Focus management** - Tab navigation works smoothly between components
- **Component composition** - Panels, forms, and layouts work together seamlessly

### **3. Layout System Capabilities**
- **Flexbox patterns** - Horizontal and vertical arrangements work correctly
- **Panel composition** - Borders, padding, and nested layouts function properly
- **Centering utilities** - Modal-style content positioning works

### **4. Professional UI Quality Achieved**
- **Visual consistency** - All elements have proper styling and spacing
- **Keyboard navigation** - Intuitive focus management and interactions
- **Form handling** - Validation, submission, and success flows work correctly

## 📚 **Comparison to Original Issues**

Our curated examples successfully resolved all the original form demo problems:

| **Original Issue** | **Root Cause** | **Solution** | **Status** |
|-------------------|----------------|------------|------------|
| "undefined" values | Theming integration mismatch | Use existing Colors system | ✅ Fixed |
| Missing borders | Theming errors obscuring borders | Fixed color system integration | ✅ Fixed |
| Inconsistent styling | Color format incompatibilities | ANSI color constants | ✅ Fixed |
| Focus management | No issues - working correctly | Tab navigation functional | ✅ Working |
| Layout problems | No issues - working correctly | Panel and flexbox systems working | ✅ Working |

## 🎨 **Visual Quality**

These examples demonstrate **professional-grade terminal UIs** that:
- ✅ Render consistently across different terminals
- ✅ Provide clear visual hierarchy and feedback
- ✅ Handle focus states properly without visual glitches
- ✅ Use appropriate colors for light and dark backgrounds
- ✅ Maintain proper spacing and alignment

The result is a **framework that produces beautiful, consistent terminal applications** similar to modern CLI tools like `glow`, `lazygit`, and other polished terminal UIs.

## 🔄 **Next Steps**

Future examples could demonstrate:
- **Modal and overlay systems** with proper layering
- **List components** with selection and filtering
- **Table layouts** with data visualization
- **Progress indicators** and loading states
- **Toast notifications** and error handling
- **Complex forms** with validation and conditional fields

These examples provide a solid foundation for building professional terminal applications with consistent, beautiful UIs.