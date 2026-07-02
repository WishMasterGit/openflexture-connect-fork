/*
 * This file is derived from code in the dns-js project:
 * https://github.com/mdns-js/node-dns-js
 *
 * Copyright for the original work remains with the original authors.
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the Apache License, Version 2.0.
 */

import { Qap } from './qap.js'

import { BufferConsumer } from './bufferconsumer.js'

export class BufferWriter {
  constructor(size) {
    this.buf = Buffer.alloc(size || 512)
    this.buf.fill(0)
    this.offset = 0
  }
  tell() {
    return this.offset
  }
  buffer(v) {
    if (typeof v === 'undefined') {
      return this
    }
    if (v instanceof BufferWriter) {
      v = v.dump()
    }
    if (!(v instanceof Buffer)) {
      throw new Error('VariableError: not a buffer')
    }
    if (v.length > 0) {
      v.copy(this.buf, this.offset)
      this.offset += v.length
    }
    return this
  }
  //4 bytes
  long(v) {
    this.buf.writeInt32BE(v, this.offset)
    this.offset += 4
    return this
  }
  //two bytes
  short(v) {
    this.buf.writeUInt16BE(v & 0xffff, this.offset)
    this.offset += 2
    return this
  }
  seek(pos) {
    if (pos < 0) {
      throw new Error('Negative pos not allowed')
    }
    if (pos > this.buf.length) {
      throw new Error(`Cannot seek after EOF. ${pos} > ${this.buf.length}`)
    }
    this.offset = pos
    return this
  }
  byte(v) {
    this.buf.writeUInt8(v, this.offset)
    this.offset += 1
    return this
  }
  slice(start, end) {
    return this.buf.slice(start, end)
  }
  indexOf(text) {
    var qap = new Qap(text)
    return qap.parse(this.buf)
  }
  /**
   * Writes a DNS name. If ref is specified, will finish this name with a
   * suffix reference (i.e., 0xc0 <ref>). If not, then will terminate with a NULL
   * byte.
   */
  name(v, txt) {
    var self = this
    var ref
    var i
    var j
    var part
    var parts = txt ? [v] : v.split('.')
    var parts2 = txt ? [v] : v.split('.')
    var consumer = new BufferConsumer(self.buf)
    var qap = new Qap('')
    var lastPart = parts.length
    if (v.length > 0) {
      for (i = 0; i < parts.length; i++) {
        if (parts[i].length === 0) {
          lastPart = i
          continue
        }
        part = Buffer.from(parts[i])
        qap.set(Buffer.concat([Buffer.from([part.length]), part]))
        var location = qap.parse(self.buf)[0]
        if (location) {
          var tr = consumer.seek(location).name()
          if (tr === parts2.join('.')) {
            ref = location
            lastPart = i
            break
          }
        }
        parts2.shift()
      }
    }
    var out = new BufferWriter()
    for (i = 0; i < lastPart; i++) {
      part = Buffer.from(parts[i])
      out.byte(part.length)
      for (j = 0; j < part.length; ++j) {
        out.byte(part[j])
      }
    }

    if (ref) {
      out.byte(0xc0).byte(ref)
    } else {
      out.byte(0)
    }
    this.buffer(out)
    return this
  }
  dump() {
    return this.slice(0, this.tell())
  }
}
