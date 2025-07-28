/**
 * Debug Scopes Tab
 */

import { text, vstack } from '@core/view'
import { Colors } from '@core/terminal/ansi/styles'
import { scopeManager } from '@core/model/scope/manager'
import { debugStore } from '../../../core/store'
import type { View } from '@core/types'
import type { ScopeDef } from '@core/model/scope/types'

interface ScopeTreeNode {
  scope: ScopeDef
  children: ScopeTreeNode[]
}

export function DebugScopes(): View {
  const state = debugStore.getState()
  const scopes = scopeManager.getAllScopes()
  const tree = buildScopeTree(scopes)

  return vstack([
    text('🌳 Scope Tree', { color: Colors.cyan, bold: true }),
    text(`Total: ${scopes.length} scopes`),
    text(''),
    renderScopeNode(tree, state.commandPath, 0),
  ])
}

function buildScopeTree(scopes: ScopeDef[]): ScopeTreeNode {
  const root = scopes.find(s => s.type === 'cli') || scopes[0]
  if (!root) {
    return {
      scope: createDummyScope(),
      children: [],
    }
  }

  function buildNode(scope: ScopeDef): ScopeTreeNode {
    const children = scopes.filter(
      s =>
        s.path.length === scope.path.length + 1 &&
        s.path.slice(0, -1).join('/') === scope.path.join('/')
    )

    return {
      scope,
      children: children.map(buildNode),
    }
  }

  return buildNode(root)
}

function renderScopeNode(node: ScopeTreeNode, commandPath: string[], depth: number): View {
  const indent = '  '.repeat(depth)
  const isMatched = commandPath.includes(node.scope.name)
  const isActive = scopeManager.isScopeActive(node.scope.id)

  const marker = isActive ? '●' : '○'
  const color = isMatched ? Colors.green : isActive ? Colors.cyan : Colors.gray

  const lines: View[] = [
    text(`${indent}${marker} ${node.scope.name} [${node.scope.type}]`, { color }),
  ]

  // Add children
  node.children.forEach(child => {
    lines.push(renderScopeNode(child, commandPath, depth + 1))
  })

  return vstack(lines)
}

function createDummyScope(): ScopeDef {
  return {
    id: 'dummy',
    type: 'cli',
    name: 'No scopes registered',
    path: [],
    description: '',
    executable: false,
    metadata: {},
    children: [],
  }
}
