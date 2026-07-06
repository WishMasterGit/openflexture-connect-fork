/*
 * This file is derived from code in the mdns-js project:
 * https://github.com/mdns-js/node-mdns-js
 *
 * Copyright for the original work remains with the original authors.
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the Apache License, Version 2.0.
 */

import { ServiceType } from './service_type.js'
import { DNSRecord } from './dnsrecord.js'

import { DNSPacket } from './dnspacket.js'

const Record = DNSRecord

function decodeSection(packet, sectionName, obj) {
  if (!Object.hasOwn(packet, sectionName)) {
    throw new Error('Section missing from packet:' + sectionName)
  }

  if (typeof obj === 'undefined') {
    throw new Error('Argument obj is missing')
  }

  var records = packet[sectionName].length
  var processed = 0
  if (packet[sectionName].length === 0) {
    return false
  }

  packet.each(sectionName, function (rec) {
    processed++
    switch (rec.type) {
      case Record.Type.A:
        obj.host = rec.name
        break
      case Record.Type.PTR:
        obj.type = obj.type || []

        if (packet.header.qr === 1 && rec.name.indexOf('_service') === 0) {
          if (rec.data) {
            obj.type.push(new ServiceType(rec.data.replace('.local', '')))
          } else {
            processed--
          }
        } else if (rec.name.indexOf('_') === 0) {
          //probably a service of some kind
          obj.type.push(new ServiceType(rec.name.replace('.local', '')))
        }
        break
      case Record.Type.TXT:
        if (!obj.txt) {
          obj.txt = []
        }
        obj.txt = obj.txt.concat(rec.data)
        break
      case Record.Type.SRV:
        obj.port = rec.port
        obj.fullname = rec.name
        break
      case Record.Type.NSEC: //just ignore for now. Sent by chromecast for example
        processed--
        break
      default:
        processed--
    }
  })
  return records > 0 && processed > 0
}

function decodeMessage(message) {
  var packets

  try {
    packets = DNSPacket.parse(message)
  } catch {
    return
  }
  if (!(packets instanceof Array)) {
    packets = [packets]
  }
  return decodePackets(packets)
}

const decodePackets = (packets) => {
  var queryOnly = false
  var data = {
    addresses: []
  }
  var query = []
  data.query = query

  packets.forEach(function (packet) {
    //skip query only
    if (
      queryOnly ||
      (packet.answer.length === 0 &&
        packet.authority.length === 0 &&
        packet.additional.length === 0)
    ) {
      data = null
      queryOnly = true
      return
    }
    decodeSection(packet, 'answer', data)
    decodeSection(packet, 'authority', data)
    decodeSection(packet, 'additional', data)

    packet.question.forEach(function (rec) {
      if (rec.type === DNSRecord.Type.PTR) {
        query.push(rec.name)
      }
    })
  })

  return data
}

export { decodeMessage, decodePackets, decodeSection }
