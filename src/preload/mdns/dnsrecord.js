/*
 * This file is derived from code in the dns-js project:
 * https://github.com/mdns-js/node-dns-js
 *
 * Copyright for the original work remains with the original authors.
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the Apache License, Version 2.0.
 */

import { BufferConsumer } from './bufferconsumer.js'
import { MalformedPacket } from './errors.js'

/**
 * DNSRecord is a record inside a DNS packet; e.g. a QUESTION, or an ANSWER,
 * AUTHORITY, or ADDITIONAL record. Note that QUESTION records are special,
 * and do not have ttl or data.
 * @class
 * @param {string} name
 * @param {number} type
 * @param {number} cl - class
 * @param {number} [optTTL] - time to live in seconds
 */
export class DNSRecord {
  constructor(name, type, cl, optTTL) {
    this.name = name
    this.type = type
    this.class = cl

    if (type === 0 || typeof type === 'undefined') {
      throw new MalformedPacket('Record.type is empty')
    }

    if (cl === 0) {
      throw new MalformedPacket('Record.class is empty')
    }

    this.ttl = typeof optTTL !== 'undefined' ? optTTL : DNSRecord.TTL
    this.isQD = arguments.length === 3
  }

  get typeName() {
    return DNSRecord.TypeName[this.type]
  }

  get className() {
    return DNSRecord.ClassName[this.class & 0x7fff]
  }

  get flag() {
    return (this.class & 0x8000) >> 15
  }

  static write(out, rec) {
    if (rec.type === 0 || rec.class === 0) {
      throw new Error('Bad record with empty type and/or class')
    }

    out.name(rec.name).short(rec.type).short(rec.class)
    if (rec.isQD) {
      return out
    }

    out.long(rec.ttl)

    var startPos = out.tell()
    out.short(0xffff) //reserve some length

    switch (rec.type) {
      case DNSRecord.Type.A:
        writeA(out, rec.address)
        break
      case DNSRecord.Type.NS:
      case DNSRecord.Type.CNAME:
      case DNSRecord.Type.PTR:
        out.name(rec.data)
        break
      case DNSRecord.Type.MX:
        //asMx(consumer, rec);
        break
      case DNSRecord.Type.TXT:
        for (var key in rec.data) {
          if (Object.prototype.hasOwnProperty.call(rec.data, key)) {
            // properly encode this
            out.name(key + '=' + rec.data[key], true)
            out.offset--
          }
        }
        break
      case DNSRecord.Type.AAAA:
        //asAAAA(consumer, rec);
        break
      case DNSRecord.Type.SRV:
        out
          .short(rec.priority & 0xffff)
          .short(rec.weight & 0xffff)
          .short(rec.port & 0xffff)
          .name(rec.target)
        break
      case DNSRecord.Type.SOA:
        out
          .name(rec.primary)
          .name(rec.admin)
          .long(rec.serial)
          .long(rec.refresh)
          .long(rec.retry)
          .long(rec.expiration)
          .long(rec.minimum)
        break
      default:
        throw new Error('Not implemented recordtype')
    }
    var endPos = out.tell()
    //update with correct size
    var correctSize = endPos - startPos - 2
    out.seek(startPos).short(correctSize).seek(endPos)

    return out
  }
  static parse(consumer) {
    if (consumer instanceof Buffer) {
      consumer = new BufferConsumer(consumer)
      consumer.seek(0)
    }

    var rec = new DNSRecord(
      consumer.name(),
      consumer.short(), // type
      consumer.short(), // class
      consumer.long() //ttlgf
    )

    var dataSize = consumer.short()

    switch (rec.type) {
      case DNSRecord.Type.A:
        asA(consumer, rec)
        break
      case DNSRecord.Type.NS:
      case DNSRecord.Type.CNAME:
      case DNSRecord.Type.PTR:
        rec.data = asName(consumer)
        break
      case DNSRecord.Type.MX:
        asMx(consumer, rec)
        break
      case DNSRecord.Type.TXT:
        rec.data = asTxt(consumer, consumer.tell() + dataSize)
        break
      case DNSRecord.Type.AAAA:
        asAAAA(consumer, rec)
        break
      case DNSRecord.Type.SRV:
        asSrv(consumer, rec)
        break
      case DNSRecord.Type.SOA:
        asSoa(consumer, rec)
        break
      case DNSRecord.Type.OPT:
        asOpt(consumer, rec)
        break
      case DNSRecord.Type.TLSA:
        asTLSA(consumer, rec, dataSize)
        break
      default:
        rec.data = new BufferConsumer(consumer.slice(dataSize))
    }

    return rec
  }
  static parseQuestion(consumer) {
    if (consumer instanceof Buffer) {
      consumer = new BufferConsumer(consumer)
    }
    var r = new DNSRecord(
      consumer.name(),
      consumer.short(), // type
      consumer.short() // class
    )

    return r
  }
}

/**
 * Enum for record type values
 * @readonly
 * @enum {number}
 */
DNSRecord.Type = {
  A: 0x01, // 1
  NS: 0x02, //2
  CNAME: 0x05, //5
  SOA: 0x06, //6
  PTR: 0x0c, // 12
  MX: 0x0f, //15
  TXT: 0x10, // 16
  AAAA: 28, // 0x16
  SRV: 0x21, // 33
  OPT: 0x29, //41 RFC6981 -needed for EDNS
  NSEC: 0x2f, //47
  TLSA: 0x34, //52 RFC6698 - associate TLS server certificate.
  ANY: 0xff
}

/**
 * Enum for record class values
 * @readonly
 * @enum {number}
 */
DNSRecord.Class = {
  IN: 0x01,
  ANY: 0xff,
  FLUSH: 0x8000,
  IS_QM: 0x8000
}

DNSRecord.TTL = 3600 // one hour default TTL
DNSRecord.TypeName = {}
DNSRecord.ClassName = {}

var typekey

for (typekey in DNSRecord.Type) {
  if (Object.prototype.hasOwnProperty.call(DNSRecord.Type, typekey)) {
    DNSRecord.TypeName[DNSRecord.Type[typekey]] = typekey
  }
}

for (typekey in DNSRecord.Class) {
  if (Object.prototype.hasOwnProperty.call(DNSRecord.Class, typekey)) {
    DNSRecord.ClassName[DNSRecord.Class[typekey]] = typekey
  }
}

function writeA(out, ip) {
  var parts = ip.split('.')
  for (var i = 0; i < 4; i++) {
    out.byte(parts[i])
  }
}

function asName(consumer) {
  return consumer.name(true)
}

function asSrv(consumer, record) {
  record.priority = consumer.short()
  record.weight = consumer.short()
  record.port = consumer.short()
  record.target = consumer.name()
}

function asMx(consumer, record) {
  record.priority = consumer.short()
  record.exchange = asName(consumer)
}

function asTxt(consumer, endAt) {
  var items = consumer.name(false, endAt)

  return items
}

function asA(consumer, record) {
  var data = ''
  for (var i = 0; i < 3; i++) {
    data += consumer.byte() + '.'
  }
  data += consumer.byte()
  record.address = data
}

/*
 * Parse data into a IPV6 address string
 * @returns {string}
 */
function asAAAA(consumer, packet) {
  var data = ''
  for (var i = 0; i < 7; i++) {
    data += consumer.short().toString(16) + ':'
  }
  data += consumer.short().toString(16)
  packet.address = data
}

function asSoa(consumer, packet) {
  packet.primary = consumer.name(true)
  packet.admin = consumer.name(true)
  packet.serial = consumer.long()
  packet.refresh = consumer.long()
  packet.retry = consumer.long()
  packet.expiration = consumer.long()
  packet.minimum = consumer.long()
}

function asOpt(consumer, packet) {
  //if at end of buffer there is no optional data.
  var opt = {
    code: 0,
    data: [],
    rcode: 0,
    version: 0,
    do: 0,
    z: 0
  }

  if (!consumer.isEOF()) {
    opt.code = consumer.short()
    opt.data = consumer.slice(consumer.short())
  }

  opt.rcode = (packet.ttl & 0xff000000) >> 24
  opt.version = (packet.ttl & 0x00ff0000) >> 16
  opt.do = (packet.ttl & 0x00008000) >> 15
  opt.z = packet.ttl & 0x00001fff

  packet.opt = opt
}

function asTLSA(consumer, packet, dataSize) {
  packet.usage = consumer.byte()
  packet.selector = consumer.byte()
  packet.matchingtype = consumer.byte()
  packet.buff = consumer.slice(dataSize - 3) //size - 3 because of 3 bytes above
}
