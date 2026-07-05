/*
 * This file is derived from code in the mdns-js project:
 * https://github.com/mdns-js/node-mdns-js
 *
 * Copyright for the original work remains with the original authors.
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the Apache License, Version 2.0.
 */

import { EventEmitter } from 'node:events'

import { DNSRecord } from './dnsrecord.js'
import { DNSPacket } from './dnspacket.js'
import { ServiceType } from './service_type.js'
import { decodePackets } from './decoder.js'

/**
 * Return whether these objects are equal if JSON.stringify is applied
 */
function stringsEqual(input1, input2) {
  return JSON.stringify(input1) === JSON.stringify(input2)
}

/**
 * mDNS Browser class
 * @class
 * @param {string|ServiceType} serviceType - The service type to browse for.
 * @fires Browser#update
 */
export class Browser extends EventEmitter {
  constructor(networking, serviceType) {
    super()
    const notString = typeof serviceType !== 'string'
    const notType = !(serviceType instanceof ServiceType)
    if (notString && notType) {
      throw new Error('argument must be instance of ServiceType or valid string')
    }
    this.serviceType = serviceType
    this.networking = networking

    this.connections = {}

    networking.addUsage(this, () => {
      this.emit('ready')
    })

    // bind(this) is required as we pass the method as a callback.
    this.onMessageListener = this.onMessage.bind(this)
    networking.on('packets', this.onMessageListener)
  }

  /**
   * Process the data from a single host
   */
  onMessage(packets, remote, connection) {
    const data = decodePackets(packets)

    // Return if there is no date
    if (!data || typeof data.type === 'undefined') {
      return
    }

    let isNew = false

    const iface = connection.networkInterface
    // If this is a new interface make a blank Object
    if (!(iface in this.connections)) {
      this.connections[iface] = { services: {}, addresses: {} }
    }

    // Store some connection and address details
    data.interfaceIndex = connection.interfaceIndex
    data.networkInterface = connection.networkInterface
    data.addresses.push(remote.address)

    // Loop through each service type this host defines
    data.type.forEach((type) => {
      let serviceKey = type.toString()
      // If the service key is new, add it to services and mark that there is new data
      if (!(serviceKey in this.connections[iface].services)) {
        isNew = true
        this.connections[iface].services[serviceKey] = {
          type,
          addresses: []
        }
      }

      // Now loop through each address of this host
      data.addresses.forEach((adr) => {
        // Update the connection addresses in this.connections
        isNew = this._update_connection_address(adr, serviceKey, iface, data) || isNew
      })
    })

    // Emit the decoded service information if a new data was discovered
    if (isNew) {
      this.emit('update', data)
    }
  }

  /**
   * For a given address and serviceKey on a particular interface, update anything
   * in this.connections that is not up to date.
   *
   * @returns {Boolean} Whether anything was updated or new
   */
  _update_connection_address(adr, serviceKey, iface, data) {
    let isNew = false
    // Add  any missing addresses to the service and mark that there is new data
    if (!this.connections[iface].services[serviceKey].addresses.includes(adr)) {
      this.connections[iface].services[serviceKey].addresses.push(adr)
      isNew = true
    }

    // If the address is new for the connection save it and mark that there is new data
    if (!(adr in this.connections[iface].addresses)) {
      isNew = true
      this.connections[iface].addresses[adr] = { address: adr }
    }

    // If the service key is not defined for this address save it and mark that there is new data
    if (this.connections[iface].addresses[adr][serviceKey] === undefined) {
      isNew = true
      this.connections[iface].addresses[adr][serviceKey] = {}
    }

    // Finally for port, host, and txt. If they need setting or updating then do so
    // and mark that there is new data
    if (!stringsEqual(this.connections[iface].addresses[adr][serviceKey].port, data.port)) {
      isNew = true
      this.connections[iface].addresses[adr][serviceKey].port = data.port
    }
    if (!stringsEqual(this.connections[iface].addresses[adr][serviceKey].host, data.host)) {
      isNew = true
      this.connections[iface].addresses[adr][serviceKey].host = data.host
    }
    if (!stringsEqual(this.connections[iface].addresses[adr][serviceKey].txt, data.txt)) {
      isNew = true
      this.connections[iface].addresses[adr][serviceKey].txt = data.txt
    }
    return isNew
  }

  stop() {
    this.networking.removeUsage(this)
    this.networking.removeListener('packets', this.onMessageListener)
    this.connections = {}
  }

  discover() {
    const packet = new DNSPacket()
    packet.question.push(
      new DNSRecord(this.serviceType.toString() + '.local', DNSRecord.Type.PTR, 1)
    )
    this.networking.send(packet)
  }
}
