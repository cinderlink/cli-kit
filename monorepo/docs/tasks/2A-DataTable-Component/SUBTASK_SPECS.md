# Task 2A: DataTable Component - Detailed Subtask Specifications

## **⚠️ CURRENT STATUS: 80% Complete - Critical Fixes Required**

### **Immediate Fixes Needed Before Continuing**
1. **Fix import error in `/packages/components/src/base.ts` line 58** (blocking all tests)
2. **Fix UIComponent interface compliance** (TypeScript errors)
3. **Run and verify all 49 tests pass**

## **📋 SUBTASK SPECIFICATIONS**

---

## **Subtask 2A.1: Core DataTable** ✅ **MOSTLY COMPLETE**

### **Objective**
Create the foundation DataTable component with virtual scrolling and basic functionality.

### **Requirements**
```typescript
// Location: packages/components/src/interactive/data-table.tsx

export class DataTable<T> extends ReactiveComponent {
  // Virtual scrolling state
  private viewport = $state({
    scrollTop: 0,
    height: 0,
    rowHeight: 20,
    visibleStart: 0,
    visibleEnd: 0
  })
  
  // Calculate visible rows
  private visibleRows = $derived(() => {
    const start = Math.floor(this.viewport.value.scrollTop / this.viewport.value.rowHeight)
    const count = Math.ceil(this.viewport.value.height / this.viewport.value.rowHeight)
    return this.state.value.data.slice(start, start + count)
  })
  
  // Handle keyboard navigation
  handleKeyPress(key: string) {
    switch (key) {
      case 'ArrowUp': this.moveSelection(-1); break
      case 'ArrowDown': this.moveSelection(1); break
      case 'PageUp': this.moveSelection(-10); break
      case 'PageDown': this.moveSelection(10); break
      case 'Enter': this.selectCurrentRow(); break
    }
  }
}
```

### **Implementation Steps**
1. Create base DataTable class extending ReactiveComponent
2. Implement virtual scrolling calculations
3. Add viewport management and scroll handling
4. Create row rendering with proper offsetting
5. Implement keyboard navigation
6. Add row selection logic (single/multi)
7. Test with various dataset sizes

### **Testing Requirements**
- Render 10k rows without performance issues
- Verify only visible rows are in DOM
- Test keyboard navigation accuracy
- Verify selection state management
- Memory usage stays constant with scrolling

---

## **Subtask 2A.2: Sorting & Filtering**

### **Objective**
Add comprehensive sorting and filtering capabilities with high performance.

### **Requirements**
```typescript
// Location: packages/components/src/interactive/data-table-features.ts

interface SortConfig<T> {
  column: keyof T
  direction: 'asc' | 'desc'
  comparator?: (a: T, b: T) => number
}

interface FilterConfig<T> {
  column: keyof T
  type: 'text' | 'number' | 'date' | 'custom'
  value: any
  operator?: 'equals' | 'contains' | 'gt' | 'lt' | 'between'
  customFilter?: (value: T[keyof T], filterValue: any) => boolean
}

export class DataTableFeatures<T> {
  // Multi-column sorting
  sort(data: T[], configs: SortConfig<T>[]): T[] {
    return [...data].sort((a, b) => {
      for (const config of configs) {
        const result = this.compareValues(a, b, config)
        if (result !== 0) return result
      }
      return 0
    })
  }
  
  // Efficient filtering
  filter(data: T[], filters: FilterConfig<T>[]): T[] {
    return data.filter(row => 
      filters.every(filter => this.matchesFilter(row, filter))
    )
  }
}
```

### **Implementation Steps**
1. Design sort configuration interface
2. Implement multi-column sorting algorithm
3. Add custom comparator support
4. Create filter type system
5. Implement filter operators
6. Add filter UI components
7. Optimize for large datasets
8. Create column-specific filter inputs

### **Performance Requirements**
- Sort 10k rows in <50ms
- Filter 10k rows in <30ms
- Support chained operations efficiently
- Minimal memory allocation during operations

---

## **Subtask 2A.3: Stream Integration**

### **Objective**
Enable real-time data updates through Effect streams with efficient rendering.

### **Requirements**
```typescript
// Location: packages/components/src/interactive/data-table-stream.ts

import { Stream, Effect } from 'effect'

export class DataTableStream<T> {
  // Connect to data stream
  connectStream(stream: Stream.Stream<DataUpdate<T>>) {
    return Effect.gen(function* () {
      yield* Stream.runForEach(stream, update => 
        Effect.sync(() => this.applyUpdate(update))
      )
    })
  }
  
  // Efficient diff-based updates
  private applyUpdate(update: DataUpdate<T>) {
    switch (update.type) {
      case 'add':
        this.insertRows(update.rows, update.index)
        break
      case 'update':
        this.updateRows(update.rows)
        break
      case 'remove':
        this.removeRows(update.indices)
        break
      case 'reset':
        this.resetData(update.data)
        break
    }
  }
  
  // Batch updates for performance
  private batchUpdates = Effect.throttle({
    rate: 60, // 60 FPS
    strategy: 'adaptive'
  })
}
```

### **Implementation Steps**
1. Design DataUpdate interface
2. Implement stream connection logic
3. Create diff algorithm for updates
4. Add batch update mechanism
5. Implement row-level updates
6. Handle high-frequency streams
7. Add backpressure handling
8. Test with various update patterns

### **Testing Requirements**
- Handle 1000 updates/second smoothly
- Verify diff algorithm correctness
- Test memory usage under load
- Ensure no dropped updates
- Verify visual consistency

---

## **Subtask 2A.4: Column Features**

### **Objective**
Add advanced column manipulation features for enhanced usability.

### **Requirements**
```typescript
// Location: packages/components/src/interactive/data-table-columns.ts

interface ColumnDef<T> {
  key: keyof T
  header: string
  width?: number
  flex?: number
  resizable?: boolean
  sortable?: boolean
  filterable?: boolean
  renderer?: (value: T[keyof T], row: T) => View
  group?: string
}

export class DataTableColumns<T> {
  // Column resizing
  resizeColumn(columnKey: keyof T, newWidth: number) {
    const column = this.columns.find(c => c.key === columnKey)
    if (column?.resizable) {
      column.width = Math.max(50, newWidth) // Min width
      this.recalculateLayout()
    }
  }
  
  // Column reordering via drag
  reorderColumns(fromIndex: number, toIndex: number) {
    const [column] = this.columns.splice(fromIndex, 1)
    this.columns.splice(toIndex, 0, column)
    this.updateColumnPositions()
  }
  
  // Custom cell rendering
  renderCell(column: ColumnDef<T>, row: T): View {
    if (column.renderer) {
      return column.renderer(row[column.key], row)
    }
    return this.defaultRenderer(row[column.key])
  }
}
```

### **Implementation Steps**
1. Implement column width calculation
2. Add resize handle detection
3. Create drag-to-reorder logic
4. Implement custom renderers
5. Add column grouping support
6. Create column menu UI
7. Handle dynamic column changes
8. Test with various configurations

### **Testing Requirements**
- Resize columns smoothly
- Reorder without data loss
- Custom renderers work correctly
- Column groups display properly
- Performance with many columns

---

## **Subtask 2A.5: DataTable Testing**

### **Objective**
Comprehensive testing suite ensuring reliability and performance.

### **Requirements**
```typescript
// Location: packages/components/src/interactive/__tests__/data-table.test.ts

describe('DataTable Component', () => {
  // Performance benchmarks
  bench('render 10k rows', () => {
    const data = generateLargeDataset(10000)
    const table = new DataTable({ data, columns })
    expect(renderTime).toBeLessThan(100) // ms
  })
  
  // Interaction tests
  test('keyboard navigation', async () => {
    const table = renderDataTable({ data: testData })
    await userEvent.keyboard('{ArrowDown}')
    expect(table.selectedIndex).toBe(1)
  })
  
  // Visual regression
  test('visual consistency', async () => {
    const table = renderDataTable({ data: testData })
    await expect(table).toMatchSnapshot()
  })
  
  // Accessibility
  test('screen reader support', () => {
    const table = renderDataTable({ data: testData })
    expect(table).toHaveAccessibleName('Data Table')
    expect(table.rows[0]).toHaveAttribute('aria-rowindex', '1')
  })
})
```

### **Implementation Steps**
1. Set up performance benchmarking
2. Create large dataset generators
3. Implement interaction test helpers
4. Add visual regression tests
5. Test accessibility features
6. Document common patterns
7. Create integration examples
8. Add stress testing scenarios

### **Coverage Requirements**
- 95%+ code coverage
- All user interactions tested
- Performance benchmarks for all operations
- Accessibility compliance verified
- Memory leak detection tests

---

## **📝 INTEGRATION NOTES**

### **With Other Components**
- Consistent keyboard navigation with Task 2B (LogViewer)
- Similar stream patterns as Task 2C (ProcessMonitor)
- Reusable filter UI for other components

### **With Plugins**
- Process data from Task 2D (Process Manager Plugin)
- Log data from Task 2E (Logger Plugin)

### **Performance Considerations**
- Use requestAnimationFrame for smooth scrolling
- Implement row recycling for memory efficiency
- Batch DOM updates when possible
- Consider WebWorker for sorting large datasets

---

## **🚀 DEVELOPMENT TIPS**

1. **Start Simple**: Basic table first, then add features
2. **Benchmark Early**: Set up performance tests immediately
3. **Test Real Data**: Use production-like datasets
4. **Profile Memory**: Watch for leaks in stream handling
5. **Document Patterns**: Create examples for common use cases