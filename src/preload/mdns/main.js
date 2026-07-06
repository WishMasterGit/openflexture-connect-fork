/*
 * This file is derived from code in the mdns-js project:
 * https://github.com/mdns-js/node-mdns-js
 *
 * Copyright for the original work remains with the original authors.
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the Apache License, Version 2.0.
 */

import { ServiceType, makeServiceType, protocolHelper } from './service_type.js'
import { Networking } from './networking.js'

import { Browser } from './browser.js'

const networking = new Networking()

function createBrowser(serviceType = ServiceType.wildcard) {
  return new Browser(networking, serviceType)
}

function excludeInterface(iface) {
  if (networking.started) {
    throw new Error('can not exclude interfaces after start')
  }

  if (iface === '0.0.0.0') {
    networking.INADDR_ANY = false
  } else {
    const err = new Error('Not a supported interface')
    err.interface = iface
    throw err
  }
}

const tcp = protocolHelper('tcp')
const udp = protocolHelper('udp')

export { Browser, createBrowser, excludeInterface, ServiceType, makeServiceType, tcp, udp }
