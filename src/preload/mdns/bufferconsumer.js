/*
 * This file is derived from code in the dns-js project:
 * https://github.com/mdns-js/node-dns-js
 *
 * Copyright for the original work remains with the original authors.
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the Apache License, Version 2.0.
 */

var LABEL_POINTER = 0xc0

export class BufferConsumer {
  constructor(arg) {
    if (!(arg instanceof Buffer)) {
      throw new Error('Expected instance of Buffer')
    }
    this.buffer = arg
    this.length = this.buffer.length
    this._offset = 0
  }
  tell() {
    return this._offset
  }
  seek(pos) {
    if (pos < 0) {
      throw new Error('Negative pos not allowed')
    }
    if (pos > this.length) {
      throw new Error(`Cannot seek after EOF. ${pos} > ${this.length}`)
    }
    this._offset = pos
    return this
  }
  slice(length) {
    var v
    if (typeof length === 'undefined') {
      v = this.buffer.slice(this._offset)
      this._offset = this.length - 1
      return v
    } else {
      if (this._offset + length > this.length) {
        throw new Error('Buffer overflow')
      }
      v = this.buffer.slice(this._offset, this._offset + length)
      this._offset += length
      return v
    }
  }
  isEOF() {
    return this._offset >= this.length
  }
  byte() {
    this._offset += 1
    return this.buffer.readUInt8(this._offset - 1)
  }
  short() {
    this._offset += 2
    return this.buffer.readUInt16BE(this._offset - 2)
  }
  long() {
    this._offset += 4
    return this.buffer.readUInt32BE(this._offset - 4)
  }
  string(encoding, length) {
    var end
    var ret

    if (length === undefined) {
      end = this.buffer.length
    } else {
      end = this.tell() + length
      // if (end > this.length) {
      //   throw new errors.MalformedPacket(
      //     'Trying to read past eof. Start=%d, End=%s, Length=%s',
      //     this.tell(), end, this.length);
      // }
    }

    if (!encoding) {
      encoding = 'utf8'
    }
    ret = this.buffer.toString(encoding, this._offset, end)
    this.seek(end)
    return ret
  }
  /**
   * Consumes a DNS name, which will either finish with a NULL byte or a suffix
   * reference (i.e., 0xc0 <ref>).
   */
  name(join, endAt) {
    if (typeof join === 'undefined') {
      join = true
    }
    var parts = []
    var ret
    var len
    var pos
    var end
    var comp = false
    len = this.byte()
    if (len === 0) {
      parts.push('')
    }
    while (len !== 0) {
      if ((len & LABEL_POINTER) === LABEL_POINTER) {
        len -= LABEL_POINTER
        len = len << 8
        pos = len + this.byte()
        if (!comp) {
          end = this.tell()
        }
        this.seek(pos)
        len = this.byte()
        comp = true
        continue
      }

      // Otherwise, consume a string!
      var v = this.string('utf8', len)
      if (v.length > 0) {
        parts.push(v)
      }

      if (endAt && this.tell() >= endAt) {
        break
      }
      len = this.byte()
    }
    if (!comp) {
      end = this.tell()
    }

    this.seek(end)
    if (join) {
      ret = parts.join('.')
    } else {
      ret = parts
    }

    return ret
  }
}
