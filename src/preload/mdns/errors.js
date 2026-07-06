/*
 * This file is derived from code in the dns-js project:
 * https://github.com/mdns-js/node-dns-js
 *
 * Copyright for the original work remains with the original authors.
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the Apache License, Version 2.0.
 */

export class MalformedPacket extends Error {
  constructor(message) {
    super(message)
    this.name = 'MalformedPacket'
  }
}
