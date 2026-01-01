import { describe, it, expect } from 'vitest'
import {
  cn,
  formatSGT,
  formatDateSGT,
  generateLinkCode,
  isValidPin,
  maskPhone,
  isSessionValid,
  SESSION_DURATION_MS,
} from '@/lib/utils'

describe('cn (class name merger)', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
    expect(cn('foo', null, 'bar')).toBe('foo bar')
    expect(cn('px-4', 'px-8')).toBe('px-8') // Tailwind merge
  })
})

describe('formatSGT', () => {
  it('formats time in Singapore timezone', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    const formatted = formatSGT(date)
    // SGT is UTC+8, so 10:30 UTC = 6:30 PM SGT
    expect(formatted).toMatch(/6:30\s*PM/i)
  })

  it('handles string dates', () => {
    const formatted = formatSGT('2024-01-15T10:30:00Z')
    expect(formatted).toMatch(/PM|AM/)
  })
})

describe('formatDateSGT', () => {
  it('formats date in Singapore timezone', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    const formatted = formatDateSGT(date)
    expect(formatted).toContain('Jan')
    expect(formatted).toContain('2024')
  })
})

describe('generateLinkCode', () => {
  it('generates a 6-character code', () => {
    const code = generateLinkCode()
    expect(code).toHaveLength(6)
  })

  it('only uses allowed characters', () => {
    const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for (let i = 0; i < 100; i++) {
      const code = generateLinkCode()
      for (const char of code) {
        expect(allowedChars).toContain(char)
      }
    }
  })

  it('generates unique codes', () => {
    const codes = new Set()
    for (let i = 0; i < 100; i++) {
      codes.add(generateLinkCode())
    }
    // Should have mostly unique codes (allowing for some collisions)
    expect(codes.size).toBeGreaterThan(90)
  })
})

describe('isValidPin', () => {
  it('validates 6-digit PINs', () => {
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('000000')).toBe(true)
    expect(isValidPin('999999')).toBe(true)
  })

  it('rejects invalid PINs', () => {
    expect(isValidPin('12345')).toBe(false) // Too short
    expect(isValidPin('1234567')).toBe(false) // Too long
    expect(isValidPin('12345a')).toBe(false) // Contains letter
    expect(isValidPin('')).toBe(false) // Empty
    expect(isValidPin('abcdef')).toBe(false) // All letters
  })
})

describe('maskPhone', () => {
  it('masks phone numbers correctly', () => {
    expect(maskPhone('91234567')).toBe('****4567')
    expect(maskPhone('+6591234567')).toBe('****4567')
  })

  it('handles short phone numbers', () => {
    expect(maskPhone('1234')).toBe('1234')
    expect(maskPhone('123')).toBe('123')
  })
})

describe('isSessionValid', () => {
  it('returns true for future expiration', () => {
    const futureTime = Date.now() + 60000 // 1 minute from now
    expect(isSessionValid(futureTime)).toBe(true)
  })

  it('returns false for past expiration', () => {
    const pastTime = Date.now() - 60000 // 1 minute ago
    expect(isSessionValid(pastTime)).toBe(false)
  })

  it('returns false for current time', () => {
    const now = Date.now()
    expect(isSessionValid(now)).toBe(false)
  })
})

describe('SESSION_DURATION_MS', () => {
  it('equals 8 hours in milliseconds', () => {
    expect(SESSION_DURATION_MS).toBe(8 * 60 * 60 * 1000)
  })
})
