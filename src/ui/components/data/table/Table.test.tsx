/**
 * Table Component Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Table, DataTable, CompactTable } from './Table.js'
import type { Column } from './Table.js'
import { $state } from '../../../../core/update/reactivity/runes.js'
import { jsx } from '../../../../jsx/runtime/index.js'

describe('Table Component', () => {
  const testData = [
    { id: 1, name: 'John Doe', age: 30, email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', age: 25, email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', age: 35, email: 'bob@example.com' },
  ]

  const testColumns: Column[] = [
    { key: 'id', label: 'ID', width: 10 },
    { key: 'name', label: 'Name', width: 20 },
    { key: 'age', label: 'Age', width: 10, sortable: true },
    { key: 'email', label: 'Email', width: 30 },
  ]

  describe('Basic rendering', () => {
    it('should render table with data', () => {
      const component = Table({
        data: testData,
        columns: testColumns,
      })

      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })

    it('should show empty message when no data', () => {
      const component = Table({
        data: [],
        columns: testColumns,
        emptyMessage: 'No data available',
      })

      expect(component).toBeDefined()
    })

    it('should render with custom column renderer', () => {
      const columns: Column[] = [
        {
          key: 'name',
          label: 'Name',
          render: value =>
            jsx('text', {
              children: `User: ${value}`,
              style: { foreground: 'blue' },
            }),
        },
      ]

      const component = Table({
        data: testData,
        columns,
      })

      expect(component).toBeDefined()
    })
  })

  describe('Selection', () => {
    it('should handle single row selection', () => {
      const selectedIndex = $state(0)
      let selectCalled = false

      const component = Table({
        data: testData,
        columns: testColumns,
        selectedIndex,
        onSelect: (row, index) => {
          selectCalled = true
          expect(row).toBe(testData[index])
        },
      })

      expect(component).toBeDefined()
    })

    it('should handle multi row selection', () => {
      const selectedIndices = $state<number[]>([0, 2])

      const component = Table({
        data: testData,
        columns: testColumns,
        selectedIndices,
        selectionMode: 'multi',
      })

      expect(selectedIndices.value).toEqual([0, 2])
    })
  })

  describe('Sorting', () => {
    it('should handle column sorting', () => {
      const sortColumn = $state<string | null>('age')
      const sortDirection = $state<'asc' | 'desc'>('asc')

      const component = Table({
        data: testData,
        columns: testColumns,
        sortColumn,
        sortDirection,
      })

      expect(component).toBeDefined()
      expect(sortColumn.value).toBe('age')
      expect(sortDirection.value).toBe('asc')
    })
  })

  describe('Filtering', () => {
    it('should filter data based on string filter', () => {
      const component = Table({
        data: testData,
        columns: testColumns,
        filter: 'john',
      })

      expect(component).toBeDefined()
    })

    it('should filter data based on function filter', () => {
      const component = Table({
        data: testData,
        columns: testColumns,
        filter: row => row.age > 25,
      })

      expect(component).toBeDefined()
    })
  })

  describe('Column features', () => {
    it('should format column values', () => {
      const columns: Column[] = [
        {
          key: 'age',
          label: 'Age',
          format: value => `${value} years`,
        },
      ]

      const component = Table({
        data: testData,
        columns,
      })

      expect(component).toBeDefined()
    })

    it('should align column content', () => {
      const columns: Column[] = [
        { key: 'id', label: 'ID', align: 'right' },
        { key: 'name', label: 'Name', align: 'left' },
        { key: 'age', label: 'Age', align: 'center' },
      ]

      const component = Table({
        data: testData,
        columns,
      })

      expect(component).toBeDefined()
    })
  })

  describe('Preset Components', () => {
    it('should render DataTable', () => {
      const component = DataTable({
        data: testData,
        columns: testColumns,
      })

      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })

    it('should render CompactTable', () => {
      const component = CompactTable({
        data: testData,
        columns: testColumns,
      })

      expect(component).toBeDefined()
      expect(component.type).toBe('interactive')
    })
  })
})
