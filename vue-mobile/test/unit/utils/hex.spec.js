import { describe, expect, it } from 'vitest'
import HexUtils from 'utils/hex.js'

describe('HexUtils', () => {
  it('roundtrips Array2HexString ↔ HexString2Array', () => {
    const bytes = [0, 15, 16, 255]
    const hex = HexUtils.Array2HexString(bytes)
    expect(hex).toBe('000f10ff')
    expect(HexUtils.HexString2Array(hex)).toEqual(bytes)
  })

  it('returns empty array for empty or odd-length hex', () => {
    expect(HexUtils.HexString2Array('')).toEqual([])
    expect(HexUtils.HexString2Array('abc')).toEqual([])
  })
})
