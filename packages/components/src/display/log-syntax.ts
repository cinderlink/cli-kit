/**
 * Log Syntax Highlighting System
 * 
 * @module @tuix/components/display/log-syntax
 */

/**
 * Supported log formats for syntax highlighting
 */
export enum LogFormat {
  JSON = 'json',
  XML = 'xml',
  PLAIN = 'plain',
  ERROR_STACK = 'error-stack',
  HTTP_LOG = 'http-log',
  SQL = 'sql',
  DOCKER = 'docker',
  KUBERNETES = 'kubernetes'
}

/**
 * Highlighted text segment
 */
export interface HighlightedSegment {
  text: string
  type: 'keyword' | 'string' | 'number' | 'error' | 'timestamp' | 'level' | 'plain'
  color?: string
}

/**
 * Result of syntax highlighting
 */
export interface HighlightedText {
  segments: HighlightedSegment[]
  format: LogFormat
}

/**
 * Theme configuration for syntax highlighting
 */
export interface SyntaxTheme {
  keyword: string
  string: string
  number: string
  error: string
  timestamp: string
  level: string
  plain: string
  background?: string
}

/**
 * Built-in themes
 */
export const themes: Record<'dark' | 'light', SyntaxTheme> = {
  dark: {
    keyword: '#569cd6',
    string: '#ce9178',
    number: '#b5cea8',
    error: '#f44747',
    timestamp: '#9cdcfe',
    level: '#4ec9b0',
    plain: '#d4d4d4'
  },
  light: {
    keyword: '#0000ff',
    string: '#a31515',
    number: '#098658',
    error: '#e51400',
    timestamp: '#0969da',
    level: '#116329',
    plain: '#24292f'
  }
}

/**
 * Syntax highlighter interface
 */
export interface SyntaxHighlighter {
  detectFormat(logMessage: string): LogFormat
  highlight(message: string, format?: LogFormat): HighlightedText
  formatJSON(jsonString: string): HighlightedText
  formatXML(xmlString: string): HighlightedText
  setTheme(theme: SyntaxTheme): void
}

/**
 * Log syntax highlighter implementation
 */
export class LogSyntaxHighlighter implements SyntaxHighlighter {
  private theme: SyntaxTheme = themes.dark

  constructor(theme: SyntaxTheme = themes.dark) {
    this.theme = theme
  }

  setTheme(theme: SyntaxTheme): void {
    this.theme = theme
  }

  /**
   * Auto-detect log format from message content
   */
  detectFormat(message: string): LogFormat {
    const trimmed = message.trim()
    
    // JSON detection
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed)
        return LogFormat.JSON
      } catch {
        // Not valid JSON, continue
      }
    }
    
    // XML detection
    if (trimmed.startsWith('<') && trimmed.includes('>')) {
      return LogFormat.XML
    }
    
    // Error stack trace detection
    if (trimmed.includes('at ') && (trimmed.includes('(') || trimmed.includes(':'))) {
      return LogFormat.ERROR_STACK
    }
    
    // HTTP log detection (Common Log Format)
    if (/^\d+\.\d+\.\d+\.\d+.*?"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS).*?"\s+\d{3}/.test(trimmed)) {
      return LogFormat.HTTP_LOG
    }
    
    // SQL detection
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|SHOW)\s+/i.test(trimmed)) {
      return LogFormat.SQL
    }
    
    // Docker log detection
    if (trimmed.includes('CONTAINER') || trimmed.includes('IMAGE') || /^[a-f0-9]{12}/.test(trimmed)) {
      return LogFormat.DOCKER
    }
    
    // Kubernetes log detection
    if (trimmed.includes('kubectl') || trimmed.includes('namespace') || 
        trimmed.includes('pod') || trimmed.includes('deployment')) {
      return LogFormat.KUBERNETES
    }
    
    return LogFormat.PLAIN
  }

  /**
   * Highlight a log message
   */
  highlight(message: string, format?: LogFormat): HighlightedText {
    const detectedFormat = format || this.detectFormat(message)
    
    switch (detectedFormat) {
      case LogFormat.JSON:
        return this.formatJSON(message)
      case LogFormat.XML:
        return this.formatXML(message)
      case LogFormat.ERROR_STACK:
        return this.formatErrorStack(message)
      case LogFormat.HTTP_LOG:
        return this.formatHttpLog(message)
      case LogFormat.SQL:
        return this.formatSQL(message)
      case LogFormat.DOCKER:
        return this.formatDocker(message)
      case LogFormat.KUBERNETES:
        return this.formatKubernetes(message)
      default:
        return this.formatPlain(message)
    }
  }

  /**
   * Format and highlight JSON
   */
  formatJSON(jsonString: string): HighlightedText {
    const segments: HighlightedSegment[] = []
    
    try {
      const parsed = JSON.parse(jsonString.trim())
      const formatted = JSON.stringify(parsed, null, 2)
      
      // Basic JSON syntax highlighting
      let currentPos = 0
      const text = formatted
      
      // Simple regex-based highlighting for JSON
      const jsonRegex = /"([^"\\]|\\.)*"|true|false|null|(-?\d+\.?\d*([eE][+-]?\d+)?)|[{}[\],:]|\s+/g
      
      let match
      while ((match = jsonRegex.exec(text)) !== null) {
        const [matchText] = match
        
        if (matchText.startsWith('"') && matchText.endsWith('"')) {
          // String (could be key or value)
          const isKey = text[match.index + matchText.length]?.trim() === ':'
          segments.push({
            text: matchText,
            type: isKey ? 'keyword' : 'string',
            color: isKey ? this.theme.keyword : this.theme.string
          })
        } else if (/^(true|false|null)$/.test(matchText)) {
          // Boolean/null
          segments.push({
            text: matchText,
            type: 'keyword',
            color: this.theme.keyword
          })
        } else if (/^-?\d+\.?\d*([eE][+-]?\d+)?$/.test(matchText)) {
          // Number
          segments.push({
            text: matchText,
            type: 'number',
            color: this.theme.number
          })
        } else {
          // Punctuation, whitespace
          segments.push({
            text: matchText,
            type: 'plain',
            color: this.theme.plain
          })
        }
        
        currentPos = match.index + matchText.length
      }
      
    } catch (error) {
      // If JSON parsing fails, treat as plain text but mark as error
      return {
        segments: [{
          text: jsonString,
          type: 'error',
          color: this.theme.error
        }],
        format: LogFormat.JSON
      }
    }
    
    return {
      segments,
      format: LogFormat.JSON
    }
  }

  /**
   * Format and highlight XML
   */
  formatXML(xmlString: string): HighlightedText {
    const segments: HighlightedSegment[] = []
    
    // Simple XML highlighting
    const xmlRegex = /(<\/?[^>]+>)|([^<]+)/g
    
    let match
    while ((match = xmlRegex.exec(xmlString)) !== null) {
      const [fullMatch, tag, content] = match
      
      if (tag) {
        // XML tag
        segments.push({
          text: tag,
          type: 'keyword',
          color: this.theme.keyword
        })
      } else if (content && content.trim()) {
        // Content between tags
        segments.push({
          text: content,
          type: 'string',
          color: this.theme.string
        })
      } else if (content) {
        // Whitespace
        segments.push({
          text: content,
          type: 'plain',
          color: this.theme.plain
        })
      }
    }
    
    return {
      segments: segments.length > 0 ? segments : [{
        text: xmlString,
        type: 'plain',
        color: this.theme.plain
      }],
      format: LogFormat.XML
    }
  }

  /**
   * Format error stack traces
   */
  private formatErrorStack(message: string): HighlightedText {
    const segments: HighlightedSegment[] = []
    const lines = message.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (i === 0) {
        // Error message line
        segments.push({
          text: line,
          type: 'error',
          color: this.theme.error
        })
      } else if (line.trim().startsWith('at ')) {
        // Stack trace line
        const parts = line.split('(')
        if (parts.length >= 2) {
          segments.push({
            text: parts[0] + '(',
            type: 'keyword',
            color: this.theme.keyword
          })
          segments.push({
            text: parts.slice(1).join('('),
            type: 'string',
            color: this.theme.string
          })
        } else {
          segments.push({
            text: line,
            type: 'keyword',
            color: this.theme.keyword
          })
        }
      } else {
        segments.push({
          text: line,
          type: 'plain',
          color: this.theme.plain
        })
      }
      
      if (i < lines.length - 1) {
        segments.push({
          text: '\n',
          type: 'plain',
          color: this.theme.plain
        })
      }
    }
    
    return {
      segments,
      format: LogFormat.ERROR_STACK
    }
  }

  /**
   * Format HTTP logs
   */
  private formatHttpLog(message: string): HighlightedText {
    const segments: HighlightedSegment[] = []
    
    // Common Log Format: IP - - [timestamp] "METHOD /path HTTP/1.1" status size
    const httpRegex = /^(\d+\.\d+\.\d+\.\d+|\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d{3})\s+(\d+|-)/
    const match = httpRegex.exec(message)
    
    if (match) {
      const [, ip, user1, user2, timestamp, request, status, size] = match
      
      segments.push(
        { text: ip, type: 'keyword', color: this.theme.keyword },
        { text: ` ${user1} ${user2} [`, type: 'plain', color: this.theme.plain },
        { text: timestamp, type: 'timestamp', color: this.theme.timestamp },
        { text: '] "', type: 'plain', color: this.theme.plain },
        { text: request, type: 'string', color: this.theme.string },
        { text: '" ', type: 'plain', color: this.theme.plain },
        { 
          text: status, 
          type: status.startsWith('4') || status.startsWith('5') ? 'error' : 'number',
          color: status.startsWith('4') || status.startsWith('5') ? this.theme.error : this.theme.number
        },
        { text: ` ${size}`, type: 'number', color: this.theme.number }
      )
      
      // Add any remaining text
      const remaining = message.slice(match[0].length)
      if (remaining) {
        segments.push({
          text: remaining,
          type: 'plain',
          color: this.theme.plain
        })
      }
    } else {
      segments.push({
        text: message,
        type: 'plain',
        color: this.theme.plain
      })
    }
    
    return {
      segments,
      format: LogFormat.HTTP_LOG
    }
  }

  /**
   * Format SQL statements
   */
  private formatSQL(message: string): HighlightedText {
    const segments: HighlightedSegment[] = []
    
    const sqlKeywords = /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP|BY|ORDER|HAVING|DISTINCT|UNION|ALL|AS|ON|AND|OR|NOT|NULL|TRUE|FALSE|IS|IN|LIKE|BETWEEN|EXISTS|CASE|WHEN|THEN|ELSE|END)\b/gi
    
    let lastIndex = 0
    let match
    
    while ((match = sqlKeywords.exec(message)) !== null) {
      // Add text before keyword
      if (match.index > lastIndex) {
        const beforeText = message.slice(lastIndex, match.index)
        segments.push({
          text: beforeText,
          type: 'plain',
          color: this.theme.plain
        })
      }
      
      // Add keyword
      segments.push({
        text: match[0],
        type: 'keyword',
        color: this.theme.keyword
      })
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < message.length) {
      segments.push({
        text: message.slice(lastIndex),
        type: 'plain',
        color: this.theme.plain
      })
    }
    
    return {
      segments,
      format: LogFormat.SQL
    }
  }

  /**
   * Format Docker logs
   */
  private formatDocker(message: string): HighlightedText {
    const segments: HighlightedSegment[] = []
    
    // Docker container ID pattern
    const dockerIdRegex = /\b[a-f0-9]{12}\b/g
    // Docker keywords
    const dockerKeywords = /\b(CONTAINER|IMAGE|REPOSITORY|TAG|STATUS|PORTS|NAMES|CREATED|SIZE)\b/gi
    
    let processedText = message
    let currentIndex = 0
    
    // First pass: highlight container IDs
    let match
    while ((match = dockerIdRegex.exec(message)) !== null) {
      if (match.index > currentIndex) {
        const beforeText = message.slice(currentIndex, match.index)
        segments.push({
          text: beforeText,
          type: 'plain',
          color: this.theme.plain
        })
      }
      
      segments.push({
        text: match[0],
        type: 'keyword',
        color: this.theme.keyword
      })
      
      currentIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (currentIndex < message.length) {
      segments.push({
        text: message.slice(currentIndex),
        type: 'plain',
        color: this.theme.plain
      })
    }
    
    return {
      segments,
      format: LogFormat.DOCKER
    }
  }

  /**
   * Format Kubernetes logs
   */
  private formatKubernetes(message: string): HighlightedText {
    const segments: HighlightedSegment[] = []
    
    const k8sKeywords = /\b(pod|deployment|service|namespace|configmap|secret|ingress|kubectl|describe|get|apply|delete|logs|exec|port-forward)\b/gi
    
    let lastIndex = 0
    let match
    
    while ((match = k8sKeywords.exec(message)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = message.slice(lastIndex, match.index)
        segments.push({
          text: beforeText,
          type: 'plain',
          color: this.theme.plain
        })
      }
      
      segments.push({
        text: match[0],
        type: 'keyword',
        color: this.theme.keyword
      })
      
      lastIndex = match.index + match[0].length
    }
    
    if (lastIndex < message.length) {
      segments.push({
        text: message.slice(lastIndex),
        type: 'plain',
        color: this.theme.plain
      })
    }
    
    return {
      segments,
      format: LogFormat.KUBERNETES
    }
  }

  /**
   * Format plain text (fallback)
   */
  private formatPlain(message: string): HighlightedText {
    return {
      segments: [{
        text: message,
        type: 'plain',
        color: this.theme.plain
      }],
      format: LogFormat.PLAIN
    }
  }
}

/**
 * Create a syntax highlighter with the specified theme
 */
export function createSyntaxHighlighter(theme: 'dark' | 'light' = 'dark'): LogSyntaxHighlighter {
  return new LogSyntaxHighlighter(themes[theme])
}

/**
 * Utility function to convert highlighted text to TUIX View elements
 */
export function renderHighlightedText(highlighted: HighlightedText): string {
  // For now, return the plain text. In a full implementation,
  // this would integrate with TUIX's styling system to apply colors
  return highlighted.segments.map(segment => segment.text).join('')
}