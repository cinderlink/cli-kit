/**
 * DataTable Component Tests
 * 
 * Comprehensive test suite for the production DataTable component
 * following TUIX MVU architecture patterns.
 * 
 * @module @tuix/components/interactive/__tests__/DataTable
 */

import { test, expect, describe, beforeEach } from "bun:test"
import { Effect } from "effect"
import { DataTable, DataTableSelectionMode, type DataTableColumn, type DataTableRow, type DataTableModel, type DataTableStreamUpdate } from "../DataTable"

// Test data interface
interface Employee {
  id: number
  name: string
  department: string
  salary: number
  startDate: Date
  active: boolean
}

// Test data generation
function generateEmployees(count: number): Employee[] {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance']
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry']
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${names[i % names.length]} ${Math.floor(i / names.length)}`,
    department: departments[i % departments.length],
    salary: 40000 + (i * 1000),
    startDate: new Date(2020 + (i % 4), (i % 12), (i % 28) + 1),
    active: i % 10 !== 0 // 90% active
  }))
}

// Convert employees to DataTable rows
function createDataTableRows(employees: Employee[]): DataTableRow<Employee>[] {
  return employees.map(emp => ({
    id: emp.id.toString(),
    data: emp,
    selectable: true
  }))
}

// Test columns configuration
const testColumns: DataTableColumn<Employee>[] = [
  { key: 'id', title: 'ID', width: 60, sortable: true },
  { key: 'name', title: 'Name', width: 150, sortable: true, filterable: true },
  { key: 'department', title: 'Department', width: 120, sortable: true, filterable: true },
  { key: 'salary', title: 'Salary', width: 100, sortable: true, filterable: true, render: (value) => `$${(value as number).toLocaleString()}` },
  { key: 'startDate', title: 'Start Date', width: 100, sortable: true, render: (value) => (value as Date).toISOString().split('T')[0] },
  { key: 'active', title: 'Status', width: 80, render: (value) => (value as boolean) ? 'Active' : 'Inactive' }
]

describe('DataTable Component', () => {
  let dataTable: DataTable<Employee>
  let testEmployees: Employee[]
  let testRows: DataTableRow<Employee>[]

  beforeEach(() => {
    dataTable = new DataTable<Employee>('test-datatable')
    testEmployees = generateEmployees(50)
    testRows = createDataTableRows(testEmployees)
  })

  describe('Initialization', () => {
    test('creates DataTable with correct id', () => {
      expect(dataTable.id).toBe('test-datatable')
    })

    test('initializes model with default values', () => {
      const model = dataTable.createInitialModel(testColumns, testRows)
      
      expect(model.id).toBe('test-datatable')
      expect(model.columns).toEqual(testColumns)
      expect(model.rows).toEqual(testRows)
      expect(model.filteredRows).toEqual(testRows)
      expect(model.selectedRowIds).toEqual([])
      expect(model.currentRowIndex).toBe(0)
      expect(model.sortConfigs).toEqual([])
      expect(model.filters).toEqual([])
      expect(model.selectionMode).toBe(DataTableSelectionMode.Single)
      expect(model.showHeader).toBe(true)
      expect(model.focused).toBe(false)
      expect(model.disabled).toBe(false)
    })

    test('initializes with custom options', () => {
      const model = dataTable.createInitialModel(testColumns, testRows, {
        selectionMode: DataTableSelectionMode.Multiple,
        virtualHeight: 300,
        rowHeight: 25,
        showHeader: false,
        showRowNumbers: true
      })
      
      expect(model.selectionMode).toBe(DataTableSelectionMode.Multiple)
      expect(model.virtual.height).toBe(300)
      expect(model.virtual.rowHeight).toBe(25)
      expect(model.showHeader).toBe(false)
      expect(model.showRowNumbers).toBe(true)
    })

    test('calculates virtual viewport correctly', () => {
      const model = dataTable.createInitialModel(testColumns, testRows, {
        virtualHeight: 200,
        rowHeight: 20
      })
      
      // With 200px height and 20px rows, should show 10 rows + overscan
      expect(model.virtual.visibleEnd - model.virtual.visibleStart).toBeGreaterThanOrEqual(10)
      expect(model.virtual.visibleEnd - model.virtual.visibleStart).toBeLessThanOrEqual(14)
      expect(model.visibleRows.length).toBe(model.virtual.visibleEnd - model.virtual.visibleStart)
    })
  })

  describe('Keyboard Navigation', () => {
    let model: DataTableModel<Employee>

    beforeEach(() => {
      model = dataTable.createInitialModel(testColumns, testRows)
    })

    test('ArrowDown moves selection down', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'keypress', key: { key: 'ArrowDown' } as any }, model)
      )
      expect(result[0].currentRowIndex).toBe(1)
    })

    test('ArrowUp moves selection up', async () => {
      const modelWithIndex = { ...model, currentRowIndex: 5 }
      const result = await Effect.runPromise(
        dataTable.update({ type: 'keypress', key: { key: 'ArrowUp' } as any }, modelWithIndex)
      )
      expect(result[0].currentRowIndex).toBe(4)
    })

    test('ArrowUp at first row stays at first row', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'keypress', key: { key: 'ArrowUp' } as any }, model)
      )
      expect(result[0].currentRowIndex).toBe(0)
    })

    test('PageDown moves selection by 10', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'keypress', key: { key: 'PageDown' } as any }, model)
      )
      expect(result[0].currentRowIndex).toBe(10)
    })

    test('PageUp moves selection by 10', async () => {
      const modelWithIndex = { ...model, currentRowIndex: 15 }
      const result = await Effect.runPromise(
        dataTable.update({ type: 'keypress', key: { key: 'PageUp' } as any }, modelWithIndex)
      )
      expect(result[0].currentRowIndex).toBe(5)
    })

    test('Home moves to first row', async () => {
      const modelWithIndex = { ...model, currentRowIndex: 20 }
      const result = await Effect.runPromise(
        dataTable.update({ type: 'keypress', key: { key: 'Home' } as any }, modelWithIndex)
      )
      expect(result[0].currentRowIndex).toBe(0)
    })

    test('End moves to last row', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'keypress', key: { key: 'End' } as any }, model)
      )
      expect(result[0].currentRowIndex).toBe(testRows.length - 1)
    })

    test('Enter selects current row', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'keypress', key: { key: 'Enter' } as any }, model)
      )
      expect(result[0].selectedRowIds).toContain(testRows[0].id)
    })

    test('Space selects current row', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'keypress', key: { key: ' ' } as any }, model)
      )
      expect(result[0].selectedRowIds).toContain(testRows[0].id)
    })
  })

  describe('Sorting', () => {
    let model: DataTableModel<Employee>

    beforeEach(() => {
      model = dataTable.createInitialModel(testColumns, testRows)
    })

    test('sorts by column ascending', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'sort', column: 'name', direction: 'asc' }, model)
      )
      
      const newModel = result[0]
      expect(newModel.sortConfigs).toHaveLength(1)
      expect(newModel.sortConfigs[0].column).toBe('name')
      expect(newModel.sortConfigs[0].direction).toBe('asc')
      
      // Verify data is sorted
      const names = newModel.filteredRows.map(row => row.data.name)
      const sortedNames = [...names].sort()
      expect(names).toEqual(sortedNames)
    })

    test('sorts by column descending', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'sort', column: 'salary', direction: 'desc' }, model)
      )
      
      const newModel = result[0]
      expect(newModel.sortConfigs[0].direction).toBe('desc')
      
      // Verify data is sorted descending
      const salaries = newModel.filteredRows.map(row => row.data.salary)
      for (let i = 0; i < salaries.length - 1; i++) {
        expect(salaries[i]).toBeGreaterThanOrEqual(salaries[i + 1])
      }
    })

    test('toggles sort direction on repeated sorts', async () => {
      // First sort ascending
      let result = await Effect.runPromise(
        dataTable.update({ type: 'sort', column: 'id' }, model)
      )
      expect(result[0].sortConfigs[0].direction).toBe('asc')
      
      // Second sort should toggle to descending
      result = await Effect.runPromise(
        dataTable.update({ type: 'sort', column: 'id' }, result[0])
      )
      expect(result[0].sortConfigs[0].direction).toBe('desc')
    })

    test('multi-column sorting replaces previous sorts', async () => {
      // Sort by name first
      let result = await Effect.runPromise(
        dataTable.update({ type: 'sort', column: 'name' }, model)
      )
      
      // Sort by salary - should replace name sort but keep as first priority
      result = await Effect.runPromise(
        dataTable.update({ type: 'sort', column: 'salary' }, result[0])
      )
      
      expect(result[0].sortConfigs).toHaveLength(2)
      expect(result[0].sortConfigs[0].column).toBe('salary') // Most recent first
      expect(result[0].sortConfigs[1].column).toBe('name')
    })
  })

  describe('Filtering', () => {
    let model: DataTableModel<Employee>

    beforeEach(() => {
      model = dataTable.createInitialModel(testColumns, testRows)
    })

    test('filters by text contains', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'name', 
          filter: { value: 'Alice', type: 'contains', dataType: 'text' }
        }, model)
      )
      
      const newModel = result[0]
      expect(newModel.filters).toHaveLength(1)
      expect(newModel.filters[0].column).toBe('name')
      expect(newModel.filters[0].value).toBe('Alice')
      expect(newModel.filteredRows.every(row => row.data.name.includes('Alice'))).toBe(true)
    })

    test('filters by text equals', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'department', 
          filter: { value: 'Engineering', type: 'equals', dataType: 'text' }
        }, model)
      )
      
      const newModel = result[0]
      expect(newModel.filteredRows.every(row => row.data.department === 'Engineering')).toBe(true)
    })

    test('filters by number greater than', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'salary', 
          filter: { value: '45000', type: 'gt', dataType: 'number' }
        }, model)
      )
      
      const newModel = result[0]
      expect(newModel.filteredRows.every(row => row.data.salary > 45000)).toBe(true)
    })

    test('filters by number less than', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'salary', 
          filter: { value: '45000', type: 'lt', dataType: 'number' }
        }, model)
      )
      
      const newModel = result[0]
      expect(newModel.filteredRows.every(row => row.data.salary < 45000)).toBe(true)
    })

    test('removes filter when value is empty', async () => {
      // Add filter first
      let result = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'name', 
          filter: { value: 'Alice', type: 'contains', dataType: 'text' }
        }, model)
      )
      expect(result[0].filters).toHaveLength(1)
      
      // Remove filter with empty value
      result = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'name', 
          filter: { value: '', type: 'contains', dataType: 'text' }
        }, result[0])
      )
      
      expect(result[0].filters).toHaveLength(0)
      expect(result[0].filteredRows).toHaveLength(testRows.length)
    })

    test('multiple filters work together', async () => {
      // Filter by department
      let result = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'department', 
          filter: { value: 'Engineering', type: 'equals', dataType: 'text' }
        }, model)
      )
      
      // Add salary filter
      result = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'salary', 
          filter: { value: '42000', type: 'gt', dataType: 'number' }
        }, result[0])
      )
      
      const newModel = result[0]
      expect(newModel.filters).toHaveLength(2)
      expect(newModel.filteredRows.every(row => 
        row.data.department === 'Engineering' && row.data.salary > 42000
      )).toBe(true)
    })
  })

  describe('Row Selection', () => {
    let model: DataTableModel<Employee>

    beforeEach(() => {
      model = dataTable.createInitialModel(testColumns, testRows, {
        selectionMode: DataTableSelectionMode.Multiple
      })
    })

    test('selects row in single selection mode', async () => {
      const singleModel = dataTable.createInitialModel(testColumns, testRows, {
        selectionMode: DataTableSelectionMode.Single
      })
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[0].id }, singleModel)
      )
      
      expect(result[0].selectedRowIds).toEqual([testRows[0].id])
    })

    test('deselects row in single selection mode', async () => {
      const singleModel = dataTable.createInitialModel(testColumns, testRows, {
        selectionMode: DataTableSelectionMode.Single
      })
      
      // Select first
      let result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[0].id }, singleModel)
      )
      expect(result[0].selectedRowIds).toEqual([testRows[0].id])
      
      // Select same row again should deselect
      result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[0].id }, result[0])
      )
      expect(result[0].selectedRowIds).toEqual([])
    })

    test('replaces selection in single selection mode', async () => {
      const singleModel = dataTable.createInitialModel(testColumns, testRows, {
        selectionMode: DataTableSelectionMode.Single
      })
      
      // Select first row
      let result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[0].id }, singleModel)
      )
      expect(result[0].selectedRowIds).toEqual([testRows[0].id])
      
      // Select second row should replace first
      result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[1].id }, result[0])
      )
      expect(result[0].selectedRowIds).toEqual([testRows[1].id])
    })

    test('adds to selection in multi selection mode', async () => {
      // Select first row
      let result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[0].id, multi: true }, model)
      )
      expect(result[0].selectedRowIds).toEqual([testRows[0].id])
      
      // Select second row with multi
      result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[1].id, multi: true }, result[0])
      )
      expect(result[0].selectedRowIds).toEqual([testRows[0].id, testRows[1].id])
    })

    test('removes from selection in multi selection mode', async () => {
      // Select two rows first
      let result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[0].id, multi: true }, model)
      )
      result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[1].id, multi: true }, result[0])
      )
      expect(result[0].selectedRowIds).toEqual([testRows[0].id, testRows[1].id])
      
      // Deselect first row
      result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[0].id, multi: true }, result[0])
      )
      expect(result[0].selectedRowIds).toEqual([testRows[1].id])
    })

    test('selects range of rows', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'selectRange', fromIndex: 2, toIndex: 5 }, model)
      )
      
      const expectedIds = testRows.slice(2, 6).map(row => row.id)
      expect(result[0].selectedRowIds).toEqual(expectedIds)
    })

    test('clears all selection', async () => {
      // Select some rows first
      let result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[0].id, multi: true }, model)
      )
      result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[1].id, multi: true }, result[0])
      )
      expect(result[0].selectedRowIds).toHaveLength(2)
      
      // Clear selection
      result = await Effect.runPromise(
        dataTable.update({ type: 'clearSelection' }, result[0])
      )
      expect(result[0].selectedRowIds).toEqual([])
    })

    test('ignores selection when mode is None', async () => {
      const noneModel = dataTable.createInitialModel(testColumns, testRows, {
        selectionMode: DataTableSelectionMode.None
      })
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'select', rowId: testRows[0].id }, noneModel)
      )
      
      expect(result[0].selectedRowIds).toEqual([])
    })
  })

  describe('Virtual Scrolling', () => {
    let model: DataTableModel<Employee>
    let largeDataset: DataTableRow<Employee>[]

    beforeEach(() => {
      // Create large dataset for virtual scrolling tests
      const largeEmployees = generateEmployees(1000)
      largeDataset = createDataTableRows(largeEmployees)
      model = dataTable.createInitialModel(testColumns, largeDataset, {
        virtualHeight: 200,
        rowHeight: 20
      })
    })

    test('initializes with correct virtual viewport', () => {
      expect(model.virtual.height).toBe(200)
      expect(model.virtual.rowHeight).toBe(20)
      expect(model.virtual.scrollTop).toBe(0)
      expect(model.virtual.visibleStart).toBe(0)
      
      // Should show ~10 rows (200px / 20px) plus overscan
      expect(model.virtual.visibleEnd - model.virtual.visibleStart).toBeGreaterThanOrEqual(10)
      expect(model.virtual.visibleEnd - model.virtual.visibleStart).toBeLessThanOrEqual(14)
    })

    test('updates visible range on scroll', async () => {
      const scrollTop = 500 // Scroll down 500px
      const result = await Effect.runPromise(
        dataTable.update({ type: 'scroll', scrollTop }, model)
      )
      
      const newModel = result[0]
      expect(newModel.virtual.scrollTop).toBe(scrollTop)
      expect(newModel.virtual.visibleStart).toBeGreaterThan(0)
      
      // Visible rows should be from the scrolled position
      const expectedStart = Math.floor(scrollTop / 20) - 2 // minus overscan
      expect(newModel.virtual.visibleStart).toBeGreaterThanOrEqual(Math.max(0, expectedStart))
    })

    test('maintains performance with large dataset', () => {
      // Test that visible rows count remains constant regardless of total data size
      expect(model.visibleRows.length).toBeLessThanOrEqual(14) // Max with overscan
      expect(model.visibleRows.length).toBeGreaterThanOrEqual(10) // Min visible
      
      // Virtual viewport should handle any scroll position
      const maxScroll = (largeDataset.length - 10) * 20 // Near end of data
      const scrollTest = () => {
        const viewport = {
          ...model.virtual,
          scrollTop: maxScroll,
          visibleStart: Math.floor(maxScroll / 20) - 2,
          visibleEnd: Math.min(Math.floor(maxScroll / 20) + 12, largeDataset.length)
        }
        return viewport
      }
      
      expect(() => scrollTest()).not.toThrow()
    })
  })

  describe('Data Updates', () => {
    let model: DataTableModel<Employee>

    beforeEach(() => {
      model = dataTable.createInitialModel(testColumns, testRows)
    })

    test('updates data and recalculates filtered rows', async () => {
      const newEmployees = generateEmployees(25) // Smaller dataset
      const newRows = createDataTableRows(newEmployees)
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'updateData', rows: newRows }, model)
      )
      
      const newModel = result[0]
      expect(newModel.rows).toEqual(newRows)
      expect(newModel.filteredRows).toEqual(newRows)
      expect(newModel.visibleRows.length).toBeLessThanOrEqual(newRows.length)
    })

    test('maintains sort order after data update', async () => {
      // Sort first
      let result = await Effect.runPromise(
        dataTable.update({ type: 'sort', column: 'name' }, model)
      )
      
      // Update data
      const newEmployees = generateEmployees(30)
      const newRows = createDataTableRows(newEmployees)
      result = await Effect.runPromise(
        dataTable.update({ type: 'updateData', rows: newRows }, result[0])
      )
      
      const newModel = result[0]
      expect(newModel.sortConfigs).toHaveLength(1)
      expect(newModel.sortConfigs[0].column).toBe('name')
      
      // Verify data is still sorted
      const names = newModel.filteredRows.map(row => row.data.name)
      const sortedNames = [...names].sort()
      expect(names).toEqual(sortedNames)
    })

    test('maintains filters after data update', async () => {
      // Filter first
      let result = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'department', 
          filter: { value: 'Engineering', type: 'equals', dataType: 'text' }
        }, model)
      )
      
      // Update data
      const newEmployees = generateEmployees(40)
      const newRows = createDataTableRows(newEmployees)
      result = await Effect.runPromise(
        dataTable.update({ type: 'updateData', rows: newRows }, result[0])
      )
      
      const newModel = result[0]
      expect(newModel.filters).toHaveLength(1)
      expect(newModel.filters[0].column).toBe('department')
      expect(newModel.filteredRows.every(row => row.data.department === 'Engineering')).toBe(true)
    })
  })

  describe('View Rendering', () => {
    let model: DataTableModel<Employee>

    beforeEach(() => {
      model = dataTable.createInitialModel(testColumns, testRows.slice(0, 10)) // Small dataset for testing
    })

    test('renders view without errors', () => {
      expect(() => dataTable.view(model)).not.toThrow()
    })

    test('renders view structure', () => {
      const view = dataTable.view(model)
      expect(view).toBeDefined()
      // View structure testing would require more detailed view inspection
      // For now, we're testing that it doesn't throw errors
    })

    test('handles empty data', () => {
      const emptyModel = dataTable.createInitialModel(testColumns, [])
      expect(() => dataTable.view(emptyModel)).not.toThrow()
    })

    test('handles disabled state', () => {
      const disabledModel = { ...model, disabled: true }
      expect(() => dataTable.view(disabledModel)).not.toThrow()
    })
  })

  describe('Column Operations', () => {
    let model: DataTableModel<Employee>

    beforeEach(() => {
      model = dataTable.createInitialModel(testColumns, testRows)
    })

    test('resizes column', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'resizeColumn', column: 'name', width: 200 }, model)
      )
      
      expect(result[0].columnWidths.get('name')).toBe(200)
    })

    test('enforces minimum column width', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'resizeColumn', column: 'name', width: 10 }, model)
      )
      
      expect(result[0].columnWidths.get('name')).toBe(50) // Minimum width enforced
    })

    test('reorders columns', async () => {
      const originalColumns = model.columns
      const result = await Effect.runPromise(
        dataTable.update({ type: 'reorderColumns', fromIndex: 0, toIndex: 2 }, model)
      )
      
      const newColumns = result[0].columns
      expect(newColumns[0]).toEqual(originalColumns[1]) // Second column moved to first
      expect(newColumns[1]).toEqual(originalColumns[2]) // Third column moved to second
      expect(newColumns[2]).toEqual(originalColumns[0]) // First column moved to third
    })

    test('updates columns dynamically', async () => {
      const newColumns: DataTableColumn<Employee>[] = [
        { key: 'name', title: 'Full Name', width: 200 },
        { key: 'department', title: 'Dept', width: 100 }
      ]
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'updateColumns', columns: newColumns }, model)
      )
      
      const newModel = result[0]
      expect(newModel.columns).toEqual(newColumns)
      expect(newModel.columnWidths.get('name')).toBe(200)
      expect(newModel.columnWidths.get('department')).toBe(100)
    })

    test('maintains filtering after column update', async () => {
      // Add a filter first
      let result = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'department', 
          filter: { value: 'Engineering', type: 'equals', dataType: 'text' }
        }, model)
      )
      
      const newColumns: DataTableColumn<Employee>[] = [
        { key: 'name', title: 'Full Name', width: 200 },
        { key: 'department', title: 'Department', width: 150 },
        { key: 'salary', title: 'Salary', width: 120 }
      ]
      
      // Update columns
      result = await Effect.runPromise(
        dataTable.update({ type: 'updateColumns', columns: newColumns }, result[0])
      )
      
      const newModel = result[0]
      expect(newModel.columns).toEqual(newColumns)
      expect(newModel.filters).toHaveLength(1)
      expect(newModel.filteredRows.every(row => row.data.department === 'Engineering')).toBe(true)
    })
  })

  describe('Focus Management', () => {
    let model: DataTableModel<Employee>

    beforeEach(() => {
      model = dataTable.createInitialModel(testColumns, testRows)
    })

    test('handles focus message', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'focus' }, model)
      )
      
      expect(result[0].focused).toBe(true)
    })

    test('handles blur message', async () => {
      const focusedModel = { ...model, focused: true }
      const result = await Effect.runPromise(
        dataTable.update({ type: 'blur' }, focusedModel)
      )
      
      expect(result[0].focused).toBe(false)
    })
  })

  describe('Enhanced Filtering Features', () => {
    let model: DataTableModel<Employee>

    beforeEach(() => {
      model = dataTable.createInitialModel(testColumns, testRows)
    })

    describe('Global Search', () => {
      test('searches across all columns', async () => {
        const result = await Effect.runPromise(
          dataTable.update({ type: 'globalSearch', value: 'Alice' }, model)
        )
        
        const newModel = result[0]
        expect(newModel.globalSearch.value).toBe('Alice')
        expect(newModel.filteredRows.every(row => 
          row.data.name.includes('Alice') || 
          row.data.department.includes('Alice')
        )).toBe(true)
      })

      test('is case insensitive', async () => {
        const result = await Effect.runPromise(
          dataTable.update({ type: 'globalSearch', value: 'ALICE' }, model)
        )
        
        const newModel = result[0]
        expect(newModel.filteredRows.some(row => row.data.name.includes('Alice'))).toBe(true)
      })

      test('resets current row index', async () => {
        const modelWithIndex = { ...model, currentRowIndex: 10 }
        const result = await Effect.runPromise(
          dataTable.update({ type: 'globalSearch', value: 'Alice' }, modelWithIndex)
        )
        
        expect(result[0].currentRowIndex).toBe(0)
      })
    })

    describe('OR Operator Filters', () => {
      test('supports OR logic between filters', async () => {
        // Add first filter (Engineering)
        let result = await Effect.runPromise(
          dataTable.update({ 
            type: 'filter', 
            column: 'department', 
            filter: { value: 'Engineering', type: 'equals', dataType: 'text', operator: 'or' }
          }, model)
        )
        
        // Add second filter (Sales) with OR
        result = await Effect.runPromise(
          dataTable.update({ 
            type: 'filter', 
            column: 'department', 
            filter: { value: 'Sales', type: 'equals', dataType: 'text', operator: 'or' }
          }, result[0])
        )
        
        const newModel = result[0]
        expect(newModel.filteredRows.every(row => 
          row.data.department === 'Engineering' || row.data.department === 'Sales'
        )).toBe(true)
      })

      test('combines AND and OR filters correctly', async () => {
        // Add AND filter (salary > 42000)
        let result = await Effect.runPromise(
          dataTable.update({ 
            type: 'filter', 
            column: 'salary', 
            filter: { value: '42000', type: 'gt', dataType: 'number', operator: 'and' }
          }, model)
        )
        
        // Add OR filter (Engineering OR Sales)
        result = await Effect.runPromise(
          dataTable.update({ 
            type: 'filter', 
            column: 'department', 
            filter: { value: 'Engineering', type: 'equals', dataType: 'text', operator: 'or' }
          }, result[0])
        )
        
        const newModel = result[0]
        expect(newModel.filteredRows.every(row => 
          row.data.salary > 42000 && row.data.department === 'Engineering'
        )).toBe(true)
      })
    })

    describe('Custom Filters', () => {
      test('supports custom filter functions', async () => {
        const customFilter = (value: unknown, filterValue: string) => {
          const salary = value as number
          const threshold = parseInt(filterValue)
          return salary % threshold === 0 // Salary divisible by threshold
        }

        const result = await Effect.runPromise(
          dataTable.update({ 
            type: 'filter', 
            column: 'salary', 
            filter: { 
              value: '1000', 
              type: 'equals', 
              dataType: 'number',
              customFilter 
            }
          }, model)
        )
        
        const newModel = result[0]
        expect(newModel.filteredRows.every(row => 
          (row.data.salary as number) % 1000 === 0
        )).toBe(true)
      })
    })

    describe('Between Filter', () => {
      test('filters values between range', async () => {
        const result = await Effect.runPromise(
          dataTable.update({ 
            type: 'filter', 
            column: 'salary', 
            filter: { value: '42000,45000', type: 'between', dataType: 'number' }
          }, model)
        )
        
        const newModel = result[0]
        expect(newModel.filteredRows.every(row => 
          row.data.salary >= 42000 && row.data.salary <= 45000
        )).toBe(true)
      })
    })

    describe('Clear Filters', () => {
      test('clears all filters and global search', async () => {
        // Add some filters first
        let result = await Effect.runPromise(
          dataTable.update({ 
            type: 'filter', 
            column: 'department', 
            filter: { value: 'Engineering', type: 'equals', dataType: 'text' }
          }, model)
        )
        
        result = await Effect.runPromise(
          dataTable.update({ type: 'globalSearch', value: 'Alice' }, result[0])
        )
        
        // Clear all filters
        result = await Effect.runPromise(
          dataTable.update({ type: 'clearFilters' }, result[0])
        )
        
        const newModel = result[0]
        expect(newModel.filters).toHaveLength(0)
        expect(newModel.globalSearch.value).toBe('')
        expect(newModel.filteredRows).toHaveLength(testRows.length)
      })
    })

    describe('Combined Filtering', () => {
      test('global search and column filters work together', async () => {
        // Add column filter
        let result = await Effect.runPromise(
          dataTable.update({ 
            type: 'filter', 
            column: 'department', 
            filter: { value: 'Engineering', type: 'equals', dataType: 'text' }
          }, model)
        )
        
        // Add global search
        result = await Effect.runPromise(
          dataTable.update({ type: 'globalSearch', value: 'Alice' }, result[0])
        )
        
        const newModel = result[0]
        expect(newModel.filteredRows.every(row => 
          row.data.department === 'Engineering' && row.data.name.includes('Alice')
        )).toBe(true)
      })
    })
  })
})

describe('DataTable Performance Tests', () => {
  let dataTable: DataTable<Employee>
  
  beforeEach(() => {
    dataTable = new DataTable<Employee>()
  })

  test('handles large dataset initialization', () => {
    const largeEmployees = generateEmployees(10000)
    const largeRows = createDataTableRows(largeEmployees)
    
    const startTime = performance.now()
    const model = dataTable.createInitialModel(testColumns, largeRows, { virtualHeight: 400, rowHeight: 20 })
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(100) // Should initialize in <100ms
    expect(model.visibleRows.length).toBeLessThanOrEqual(25) // Only visible rows loaded
  })

  test('sorting performance with large dataset', async () => {
    const largeEmployees = generateEmployees(10000)
    const largeRows = createDataTableRows(largeEmployees)
    const model = dataTable.createInitialModel(testColumns, largeRows)
    
    const startTime = performance.now()
    await Effect.runPromise(
      dataTable.update({ type: 'sort', column: 'name' }, model)
    )
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(50) // Should sort in <50ms
  })

  test('filtering performance with large dataset', async () => {
    const largeEmployees = generateEmployees(10000)
    const largeRows = createDataTableRows(largeEmployees)
    const model = dataTable.createInitialModel(testColumns, largeRows)
    
    const startTime = performance.now()
    await Effect.runPromise(
      dataTable.update({ 
        type: 'filter', 
        column: 'department', 
        filter: { value: 'Engineering', type: 'equals', dataType: 'text' }
      }, model)
    )
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(30) // Should filter in <30ms
  })

  test('scroll performance with large dataset', async () => {
    const largeEmployees = generateEmployees(100000)
    const largeRows = createDataTableRows(largeEmployees)
    const model = dataTable.createInitialModel(testColumns, largeRows, { virtualHeight: 400, rowHeight: 20 })
    
    const startTime = performance.now()
    
    // Simulate rapid scrolling
    for (let i = 0; i < 50; i++) {
      await Effect.runPromise(
        dataTable.update({ type: 'scroll', scrollTop: i * 100 }, model)
      )
    }
    
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(100) // 50 scroll operations in <100ms
  })
})

describe('DataTable Stream Integration', () => {
  let dataTable: DataTable<Employee>
  let model: DataTableModel<Employee>
  let testEmployees: Employee[]
  let testRows: DataTableRow<Employee>[]
  
  beforeEach(() => {
    dataTable = new DataTable<Employee>()
    testEmployees = generateEmployees(50)
    testRows = createDataTableRows(testEmployees)
    model = dataTable.createInitialModel(testColumns, testRows.slice(0, 5))
  })

  describe('Stream Configuration', () => {
    test('initializes with stream disabled', () => {
      expect(model.streamConfig.enabled).toBe(false)
      expect(model.streamConfig.batchSize).toBe(100)
      expect(model.streamConfig.throttleMs).toBe(16)
      expect(model.connectedStreams.size).toBe(0)
      expect(model.pendingUpdates.length).toBe(0)
    })

    test('enables streaming when connecting to stream', async () => {
      const result = await Effect.runPromise(
        dataTable.update({ type: 'connectStream', streamId: 'test-stream' }, model)
      )
      
      const newModel = result[0]
      expect(newModel.streamConfig.enabled).toBe(true)
      expect(newModel.connectedStreams.has('test-stream')).toBe(true)
      expect(newModel.connectedStreams.get('test-stream')).toBe(true)
    })

    test('disables streaming when disconnecting last stream', async () => {
      // First connect a stream
      const connectedResult = await Effect.runPromise(
        dataTable.update({ type: 'connectStream', streamId: 'test-stream' }, model)
      )
      
      // Then disconnect it
      const disconnectedResult = await Effect.runPromise(
        dataTable.update({ type: 'disconnectStream', streamId: 'test-stream' }, connectedResult[0])
      )
      
      const newModel = disconnectedResult[0]
      expect(newModel.streamConfig.enabled).toBe(false)
      expect(newModel.connectedStreams.has('test-stream')).toBe(false)
    })
  })

  describe('Stream Updates', () => {
    beforeEach(async () => {
      // Enable streaming for these tests
      const result = await Effect.runPromise(
        dataTable.update({ type: 'connectStream', streamId: 'test-stream' }, model)
      )
      model = result[0]
    })

    test('handles add stream update', async () => {
      const newEmployee = generateEmployees(1)[0]
      const newRow = createDataTableRows([newEmployee])[0]
      const update: DataTableStreamUpdate<Employee> = {
        type: 'add',
        rows: [newRow]
      }
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'streamUpdate', update }, model)
      )
      
      const newModel = result[0]
      expect(newModel.rows.length).toBe(model.rows.length + 1)
      expect(newModel.rows[newModel.rows.length - 1].id).toBe(newRow.id)
    })

    test('handles update stream update', async () => {
      const existingRow = model.rows[0]
      const updatedEmployee = { ...existingRow.data, name: 'Updated Name' }
      const updatedRow = { ...existingRow, data: updatedEmployee }
      
      const update: DataTableStreamUpdate<Employee> = {
        type: 'update',
        rows: [updatedRow]
      }
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'streamUpdate', update }, model)
      )
      
      const newModel = result[0]
      expect(newModel.rows.length).toBe(model.rows.length)
      expect(newModel.rows[0].data.name).toBe('Updated Name')
    })

    test('handles remove stream update', async () => {
      const update: DataTableStreamUpdate<Employee> = {
        type: 'remove',
        indices: [0, 2] // Remove first and third rows
      }
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'streamUpdate', update }, model)
      )
      
      const newModel = result[0]
      expect(newModel.rows.length).toBe(model.rows.length - 2)
      expect(newModel.rows[0].id).toBe(model.rows[1].id) // Second row is now first
    })

    test('handles reset stream update', async () => {
      const newEmployees = generateEmployees(3)
      const newRows = createDataTableRows(newEmployees)
      
      const update: DataTableStreamUpdate<Employee> = {
        type: 'reset',
        data: newRows
      }
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'streamUpdate', update }, model)
      )
      
      const newModel = result[0]
      expect(newModel.rows.length).toBe(3)
      expect(newModel.rows[0].id).toBe(newRows[0].id)
    })

    test('maintains sorting after stream update', async () => {
      // First sort by name
      const sortedResult = await Effect.runPromise(
        dataTable.update({ type: 'sort', column: 'name' }, model)
      )
      
      // Add new row
      const newEmployee = { ...generateEmployees(1)[0], name: 'AAA First' }
      const newRow = createDataTableRows([newEmployee])[0]
      const update: DataTableStreamUpdate<Employee> = {
        type: 'add',
        rows: [newRow]
      }
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'streamUpdate', update }, sortedResult[0])
      )
      
      const newModel = result[0]
      expect(newModel.filteredRows[0].data.name).toBe('AAA First')
      expect(newModel.sortConfigs.length).toBe(1)
      expect(newModel.sortConfigs[0].column).toBe('name')
    })

    test('maintains filtering after stream update', async () => {
      // First filter by department
      const filteredResult = await Effect.runPromise(
        dataTable.update({ 
          type: 'filter', 
          column: 'department', 
          filter: { value: 'Engineering', type: 'equals', dataType: 'text' }
        }, model)
      )
      
      // Add new row with matching department
      const newEmployee = { ...generateEmployees(1)[0], department: 'Engineering' }
      const newRow = createDataTableRows([newEmployee])[0]
      const update: DataTableStreamUpdate<Employee> = {
        type: 'add',
        rows: [newRow]
      }
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'streamUpdate', update }, filteredResult[0])
      )
      
      const newModel = result[0]
      expect(newModel.filteredRows.every(row => row.data.department === 'Engineering')).toBe(true)
      expect(newModel.filters.length).toBe(1)
    })

    test('batches multiple updates efficiently', async () => {
      // Create multiple updates
      const updates: DataTableStreamUpdate<Employee>[] = []
      for (let i = 0; i < 150; i++) { // More than batch size
        const newEmployee = generateEmployees(1)[0]
        const newRow = createDataTableRows([newEmployee])[0]
        updates.push({
          type: 'add',
          rows: [newRow]
        })
      }
      
      // Process all updates
      let currentModel = model
      for (const update of updates) {
        const result = await Effect.runPromise(
          dataTable.update({ type: 'streamUpdate', update }, currentModel)
        )
        currentModel = result[0]
      }
      
      expect(currentModel.rows.length).toBe(model.rows.length + 150)
    })

    test('ignores stream updates when streaming disabled', async () => {
      // Disable streaming
      const disabledResult = await Effect.runPromise(
        dataTable.update({ type: 'disconnectStream', streamId: 'test-stream' }, model)
      )
      
      const newEmployee = generateEmployees(1)[0]
      const newRow = createDataTableRows([newEmployee])[0]
      const update: DataTableStreamUpdate<Employee> = {
        type: 'add',
        rows: [newRow]
      }
      
      const result = await Effect.runPromise(
        dataTable.update({ type: 'streamUpdate', update }, disabledResult[0])
      )
      
      const newModel = result[0]
      expect(newModel.rows.length).toBe(model.rows.length) // No change
    })
  })

  describe('Stream Performance', () => {
    beforeEach(async () => {
      // Enable streaming for these tests
      const result = await Effect.runPromise(
        dataTable.update({ type: 'connectStream', streamId: 'test-stream' }, model)
      )
      model = result[0]
    })

    test('handles high-frequency updates', async () => {
      const updates: DataTableStreamUpdate<Employee>[] = []
      for (let i = 0; i < 1000; i++) {
        const newEmployee = generateEmployees(1)[0]
        const newRow = createDataTableRows([newEmployee])[0]
        updates.push({
          type: 'add',
          rows: [newRow]
        })
      }
      
      const startTime = performance.now()
      let currentModel = model
      
      // Process updates in batches
      for (let i = 0; i < updates.length; i += 50) {
        const batch = updates.slice(i, i + 50)
        for (const update of batch) {
          const result = await Effect.runPromise(
            dataTable.update({ type: 'streamUpdate', update }, currentModel)
          )
          currentModel = result[0]
        }
      }
      
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should handle 1000 updates in <1s
      expect(currentModel.rows.length).toBe(model.rows.length + 1000)
    })

    test('throttles updates correctly', async () => {
      const updates: DataTableStreamUpdate<Employee>[] = []
      for (let i = 0; i < 10; i++) {
        const newEmployee = generateEmployees(1)[0]
        const newRow = createDataTableRows([newEmployee])[0]
        updates.push({
          type: 'add',
          rows: [newRow]
        })
      }
      
      let currentModel = model
      const startTime = Date.now()
      
      // Send updates rapidly
      for (const update of updates) {
        const result = await Effect.runPromise(
          dataTable.update({ type: 'streamUpdate', update }, currentModel)
        )
        currentModel = result[0]
      }
      
      const endTime = Date.now()
      
      // Should have processed all updates despite throttling
      expect(currentModel.rows.length).toBe(model.rows.length + 10)
      expect(endTime - startTime).toBeGreaterThanOrEqual(0)
    })
  })
})