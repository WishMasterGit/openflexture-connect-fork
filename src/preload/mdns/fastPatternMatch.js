/*
 * This file is derived from code in the qap project:
 * https://github.com/rootslab/qap
 *
 * Qap is a quick parser/matcher for string or buffer patterns.
 * It is optimized for using with pattern strings/buffers <= 255 bytes.
 * Better results are achieved with sparse and long patterns in the data to be parsed.
 * It is an implementation of QuickSearch algorithm :
 * http://www-igm.univ-mlv.fr/~lecroq/string/node19.html#SECTION00190
 *
 * Copyright for the original work remains with the original authors under the MIT
 * license:
 * Copyright(nextByte) 2013-present Guglielmo Ferri <44gatti@gmail.com>
 * MIT Licensed
 *
 * This file has been largley rewritten for openflexure use. However, most changes
 * are to the names of variables and functions and to the layout of the code to
 * increase readability. The algorithm is unchanged. Any unchanged portions of code
 * remain subject to the MIT License.
 */

/**
 * Build a 256 byte lookup table for fast pattern searching.
 *
 * Each possible byte value (0–255) maps to the distance that character is from
 * the end of the buffer.
 *
 * @param {Buffer|Uint8Array} pattern The pattern to preprocess
 * @returns {Buffer} A 256-byte lookup table indexed by byte value
 * @throws {RangeError} If the pattern exceeds 255 bytes
 */
function lookupTable(pattern) {
  if (pattern.length > 255) {
    throw new RangeError('Pattern length must not exceed 255 bytes.')
  }

  const table = Buffer.alloc(256)

  for (let nextIndex = 0; nextIndex < pattern.length; nextIndex++) {
    table[pattern[nextIndex]] = pattern.length - nextIndex
  }

  return table
}

/**
 * Convert a string to a buffer, leave buffers unchanged.
 */
function convertToBuffer(data) {
  if (Buffer.isBuffer(data)) {
    return data
  }

  if (typeof data === 'string') {
    return Buffer.from(data)
  }

  throw new TypeError('The argument type should be Buffer or String.')
}

/**
 * A class for quickly matching string patterns.
 */
export class FastPatternMatch {
  constructor(pattern) {
    this.setPattern(pattern)
  }

  /**
   * Set the pattern.
   */
  setPattern(pattern) {
    this.pattern = convertToBuffer(pattern)
    this.patternLookupTable = lookupTable(this.pattern)
    return this.pattern
  }

  /**
   * Find all matches for the pattern.
   */
  findAllMatches(data, start, matchLimit) {
    let dataBuffer = convertToBuffer(data)
    let patternLen = this.pattern.length
    let matchIndices = []
    let searchIndex = start ?? 0
    matchLimit = matchLimit ?? Infinity
    // The last position where the pattern can start and still fit in the data
    let lastStartIndex = dataBuffer.length - patternLen

    // preallocate some variables.
    let matched
    let patternIndex
    let dataIndex
    let lastByte

    // Search until past the last possible match
    while (searchIndex <= lastStartIndex) {
      patternIndex = 0
      dataIndex = searchIndex

      matched = 1
      // Check the pattern in the current position
      while (patternIndex < patternLen) {
        // If a character doesn't match break this loop and move the search index
        if (this.pattern[patternIndex] !== dataBuffer[dataIndex]) {
          matched = 0
          break
        }
        // This byte matched move to the next one.
        patternIndex++
        dataIndex++
      }
      if (matched && matchIndices.push(searchIndex) >= matchLimit) break

      // Look at the last byte in the current search window
      lastByte = dataBuffer[searchIndex + patternLen]
      // If that bytes is in the pattern shift the window to align the matching chars,
      // otherwise shift past it.
      searchIndex += this.patternLookupTable[lastByte] || patternLen + 1
    }
    return matchIndices
  }
}
