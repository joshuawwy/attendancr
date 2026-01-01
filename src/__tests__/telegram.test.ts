import { describe, it, expect } from 'vitest'
import { formatCheckInNotification, extractStartCode } from '@/lib/telegram'

describe('formatCheckInNotification', () => {
  it('formats notification correctly', () => {
    const message = formatCheckInNotification('Sarah', 'ABC Centre', '3:45 PM')
    expect(message).toBe('Sarah checked in at ABC Centre at 3:45 PM')
  })

  it('uses default centre name', () => {
    const message = formatCheckInNotification('John', undefined, '10:00 AM')
    expect(message).toBe('John checked in at ABC Centre at 10:00 AM')
  })
})

describe('extractStartCode', () => {
  it('extracts code from /start command', () => {
    expect(extractStartCode('/start ABC123')).toBe('ABC123')
    expect(extractStartCode('/start XYZ789')).toBe('XYZ789')
  })

  it('returns null for plain /start', () => {
    expect(extractStartCode('/start')).toBe(null)
    expect(extractStartCode('/start ')).toBe(null)
  })

  it('returns null for invalid commands', () => {
    expect(extractStartCode('start ABC123')).toBe(null)
    expect(extractStartCode('/hello ABC123')).toBe(null)
    expect(extractStartCode('')).toBe(null)
  })

  it('handles codes with alphanumeric characters', () => {
    expect(extractStartCode('/start A1B2C3')).toBe('A1B2C3')
    expect(extractStartCode('/start CODE123XYZ')).toBe('CODE123XYZ')
  })
})
