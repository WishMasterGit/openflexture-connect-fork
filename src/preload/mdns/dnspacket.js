/*
 * This file is derived from code in the dns-js project:
 * https://github.com/mdns-js/node-dns-js
 *
 * Copyright for the original work remains with the original authors.
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the Apache License, Version 2.0.
 */

import { BufferWriter } from './bufferwriter.js'
import { BufferConsumer } from './bufferconsumer.js'
import { DNSRecord } from './dnsrecord.js'
import { MalformedPacket } from './errors.js'

var MIN_RECORD_SIZE = 5
var SECTION_NAMES = ['answer', 'authority', 'additional']
var ALL_SECTION_NAMES = ['question'].concat(SECTION_NAMES)

function parseFlags(val, packet) {
  packet.header.qr = (val & 0x8000) >> 15
  packet.header.opcode = (val & 0x7800) >> 11
  packet.header.aa = (val & 0x400) >> 10
  packet.header.tc = (val & 0x200) >> 9
  packet.header.rd = (val & 0x100) >> 8
  packet.header.ra = (val & 0x80) >> 7
  packet.header.res1 = (val & 0x40) >> 6
  packet.header.res2 = (val & 0x20) >> 5
  packet.header.res3 = (val & 0x10) >> 4
  packet.header.rcode = val & 0xf
}

function parseHeader(consumer, packet) {
  packet.header.id = consumer.short()
  parseFlags(consumer.short(), packet)

  packet.question = new Array(consumer.short())
  packet.answer = new Array(consumer.short())
  packet.authority = new Array(consumer.short())
  packet.additional = new Array(consumer.short())

  var allcount =
    packet.question.length +
    packet.answer.length +
    packet.authority.length +
    packet.additional.length
  // allcount * MIN_RECORD_SIZE should be less then consumer.length - consumer.tell()
  if (allcount * MIN_RECORD_SIZE > consumer.length - consumer.tell()) {
    throw new MalformedPacket(
      'Unexpectedly big section count: %d. Missing at least %d bytes.',
      allcount,
      allcount * MIN_RECORD_SIZE - (consumer.length - consumer.tell())
    )
  }
}

function writeHeader(writer, packet) {
  var header = packet.header
  writer.short(header.id)
  var val = 0
  val += (header.qr << 15) & 0x8000
  val += (header.opcode << 11) & 0x7800
  val += (header.aa << 10) & 0x400
  val += (header.tc << 9) & 0x200
  val += (header.rd << 8) & 0x100
  val += (header.ra << 7) & 0x80
  val += (header.res1 << 6) & 0x40
  val += (header.res1 << 5) & 0x20
  val += (header.res1 << 4) & 0x10
  val += header.rcode & 0xf
  writer.short(val)
}

/**
 * DNSPacket holds the state of a DNS packet. It can be modified or serialized
 * in-place.
 *
 * @constructor
 */
export class DNSPacket {
  constructor(flags) {
    this.header = {
      id: 0,
      qr: 0,
      opcode: 0,
      aa: 0,
      tc: 0,
      rd: 1,
      ra: 0,
      res1: 0,
      res2: 0,
      res3: 0,
      rcode: 0
    }
    if (flags) {
      parseFlags(flags, this)
    }
    this.question = []
    this.answer = []
    this.authority = []
    this.additional = []
    this.edns_options = []
    this.payload = undefined
  }
  /**
   * Parse a DNSPacket from an Buffer
   * @param {Buffer} buffer - A Node.js Buffer instance
   * @returns {DNSPacket} Instance of DNSPacket
   */
  static parse(buffer) {
    var consumer = new BufferConsumer(buffer)
    var packet = new DNSPacket()
    var receivedOpts = 0
    parseHeader(consumer, packet)

    // Parse the QUESTION section.
    for (var qi = 0; qi < packet.question.length; qi++) {
      var part = DNSRecord.parseQuestion(consumer)
      packet.question[qi] = part
    }

    // Parse the ANSWER, AUTHORITY and ADDITIONAL sections.
    SECTION_NAMES.forEach(function (sectionName) {
      var section = packet[sectionName]
      for (var si = 0; si < section.length; si++) {
        var record = DNSRecord.parse(consumer)
        if (record.type === DNSRecord.Type.OPT) {
          if (receivedOpts++ >= 0) {
            if (sectionName === 'additional') {
              packet.edns_version = record.opt.version
              packet.do = record.opt.do
              packet.payload = record.class
            }
          }
        }
        section[si] = record
      }
    })

    if (!consumer.isEOF()) {
      var multiple = [packet]
      multiple.push(DNSPacket.parse(consumer.slice()))

      return multiple
    }
    return packet
  }
  /**
   * Serialize this DNSPacket into an Buffer for sending over UDP.
   * @returns {Buffer} A Node.js Buffer
   */
  static toBuffer(packet) {
    var writer = new BufferWriter()
    var sections = ['question'].concat(SECTION_NAMES)
    writeHeader(writer, packet)

    sections.forEach(function (sectionName) {
      var section = packet[sectionName]
      writer.short(section.length)
    })

    var e = each.bind(packet)

    sections.forEach(function (sectionName) {
      e(sectionName, function (rec) {
        DNSRecord.write(writer, rec, true)

        if (sectionName !== 'question' && rec.isQD) {
          throw new Error('unexpected QD record in non QD section.')
        }
      })
    })

    return writer.slice(0, writer.tell())
  }
}

/**
 * Enum identifying DNSPacket flags
 * @readonly
 * @enum {number}
 */
DNSPacket.Flag = {
  RESPONSE: 0x8000,
  AUTHORITATIVE: 0x400,
  TRUNCATED: 0x200,
  RECURSION: 0x100
}

/**
 * Enum identifying DNSPacket rcode flag values
 * @readonly
 * @enum {number}
 */
DNSPacket.RCODE = {
  NoError: 0,
  FormErr: 1,
  ServFail: 2,
  NXDomain: 3
}

/**
 * Get records from packet.
 *
 * @param {DNSPacket.Section} section - record section [qd|an|ns|ar],
 * @param {DNSRecord.Type} [filter] - DNSRecord.Type to filter on
 * @param {DNSPacket~eachCallback} callback - Function callback
 */
DNSPacket.prototype.each = each

/**
 * Callback for each matching DNS record.
 *
 * @callback DNSPacket~eachCallback
 * @param {DNSRecord} rec - DNSRecord that was found
 */
function each(section) {
  if (ALL_SECTION_NAMES.indexOf(section) === -1) {
    throw new Error('Unkown section, ' + section)
  }
  var filter = false
  var cb
  if (arguments.length === 2) {
    cb = arguments[1]
  } else {
    filter = arguments[1]
    cb = arguments[2]
    if (typeof filter === 'undefined') {
      throw new Error('Filter given but is undefined')
    }
  }
  this[section].forEach(function (rec) {
    if (!filter || rec.type === filter) {
      cb(rec)
    }
  })
}
