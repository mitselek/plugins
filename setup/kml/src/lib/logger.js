/**
 * Clean Logger Utility
 * Centralized colored logging with consistent formatting
 */

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

export class Logger {
  static log (message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
  }

  static success (message) {
    this.log(`✅ ${message}`, 'green')
  }

  static error (message) {
    this.log(`❌ ${message}`, 'red')
  }

  static warning (message) {
    this.log(`⚠️  ${message}`, 'yellow')
  }

  static info (message) {
    this.log(`ℹ️  ${message}`, 'blue')
  }

  static header (message) {
    this.log(`\n${message}`, 'bold')
  }

  static section (message) {
    this.log(`\n🔍 ${message}`, 'cyan')
  }

  static skip (message) {
    this.log(`⏭️  ${message}`, 'yellow')
  }

  static progress (message) {
    this.log(`📝 ${message}`, 'cyan')
  }
}
