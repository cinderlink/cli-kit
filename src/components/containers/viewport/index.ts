// JSX Component
export { Viewport, type ViewportProps, type ViewportState } from './Viewport.tsx'

// Legacy TEA Component and utilities (moved to src/tea/)
export { 
  viewport, 
  createTextContent, 
  createGridContent, 
  createNumberedContent,
  type ViewportConfig,
  type ViewportModel,
  type ViewportMsg
} from '../../../tea/containers/Viewport'