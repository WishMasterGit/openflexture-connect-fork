/*
 * This file is derived from code in the mdns-js project:
 * https://github.com/mdns-js/node-mdns-js
 *
 * Copyright for the original work remains with the original authors.
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the Apache License, Version 2.0.
 */

import util from 'node:util'
import { EventEmitter } from 'node:events'
import os from 'node:os'
import dgram from 'node:dgram'

import { DNSPacket } from 'dns-js'

var MDNS_MULTICAST = '224.0.0.251'

export class Networking {
  constructor(options) {
    this.options = options || {}
    this.created = 0
    this.connections = []
    this.started = false
    this.users = []
    this.INADDR_ANY = typeof this.options.INADDR_ANY === 'undefined' ? true : this.options.INADDR_ANY
  }
  start() {
    var interfaces = os.networkInterfaces()
    var ifaceFilter = this.options.networkInterface
    var index = 0
    for (var key in interfaces) {
      if (Object.hasOwn(interfaces, key) &&
        (typeof ifaceFilter === 'undefined' || key === ifaceFilter)) {
        for (var i = 0; i < interfaces[key].length; i++) {
          var iface = interfaces[key][i]
          //no localhost
          if (iface.internal) {
            continue
          }
          //no IPv6 addresses
          if (iface.address.indexOf(':') !== -1) {
            continue
          }
          this.createSocket(index++, key, iface.address, 0, this.bindToAddress.bind(this))
        }
      }
    }
    // apple-tv always replies back using multicast,
    // regardless of the source of the query, it is answering back.
    if (this.INADDR_ANY) {
      this.createSocket(index++, 'pseudo multicast', '0.0.0.0', 5353, this.bindToAddress.bind(this))
    }
  }
  stop() {
    this.connections.forEach(closeEach)
    this.connections = []
    this.created = 0
    this.started = false

    function closeEach(connection) {
      var socket = connection.socket
      socket.close()
      socket.unref()
    }
  }
  createSocket(interfaceIndex,
    networkInterface,
    address,
    port,
    next) {
    let sock = dgram.createSocket({ type: 'udp4', reuseAddr: true })

    sock.on('error', function (err) {
      next(err, interfaceIndex, networkInterface, sock)
    })
    this.created++

    sock.bind(port, address, function (err) {
      if (!err && port === 5353) {
        sock.addMembership(MDNS_MULTICAST)
        sock.setMulticastTTL(255)
        sock.setMulticastLoopback(true)
      }
      next(err, interfaceIndex, networkInterface, sock)
    })
  }
  bindToAddress(err, interfaceIndex, networkInterface, sock) {
    if (err) {
      return
    }

    var connection = {
      socket: sock,
      interfaceIndex: interfaceIndex,
      networkInterface: networkInterface,
      counters: {
        sent: 0,
        received: 0
      }
    }

    this.connections.push(connection)
    var self = this

    sock.on('message', function (message, remote) {
      var packets
      connection.counters.received++
      try {
        packets = DNSPacket.parse(message)
        if (!(packets instanceof Array)) {
          packets = [packets]
        }
      } catch {
        //partial, skip it
        return
      }

      self.emit('packets', packets, remote, connection)
    })

    sock.on('error', self.onError.bind(self))

    sock.on('close', function () { })

    if (this.created === this.connections.length) {
      this.emit('ready', this.connections.length)
    }
  }
  onError(err) {
    this.emit('error', err)
  }
  send(packet, next) {
    var buf = DNSPacket.toBuffer(packet)
    const netwk = this
    this.connections.forEach(onEach)
    onSent()
    function onEach(connection) {
      var sock = connection.socket
      // if the user did not specially asked for the pseudo interface
      // skip sending message on that interface.
      if (sock.address().address === '0.0.0.0' && !netwk.INADDR_ANY) {
        onSent()
      } else {
        sock.send(buf, 0, buf.length, 5353, '224.0.0.251', () => {
          onSent()
        })
      }
    }

    var sent = -1
    function onSent() {
      if (next !== undefined) {
        sent++
        if (this.connections === undefined || sent === this.connections.length) {
          next()
        }
      }
    }
  }
  startRequest(callback) {
    if (this.started) {
      return process.nextTick(callback())
    }
    this.start()
    this.once('ready', function () {
      if (typeof callback === 'function') {
        callback()
      }
    })
  }
  stopRequest() {
    if (this.users.length === 0) {
      this.stop()
    }
  }
  addUsage(browser, next) {
    this.users.push(browser)
    this.startRequest(next)
  }
  removeUsage(browser) {
    var index = this.users.indexOf(browser)
    if (index > -1) {
      this.users.splice(index, 1)
    }
    // TODO should also clear stale state out of addresses table
    this.connections.forEach(function (c) {
      if (c.services && c.services[browser.serviceType.toString()]) {
        delete c.services[browser.serviceType.toString()]
      }
    })
    this.stopRequest()
  }
}

util.inherits(Networking, EventEmitter)











