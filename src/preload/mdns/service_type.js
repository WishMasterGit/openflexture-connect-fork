/*
 * This file is derived from code in the mdns-js project:
 * https://github.com/mdns-js/node-mdns-js
 *
 * Copyright for the original work remains with the original authors.
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the Apache License, Version 2.0.
 */

/** @module ServiceType */

/*
  Subtypes can be found in section 7.1 of RFC6763
  https://tools.ietf.org/html/rfc6763#section-7.1

  According to RFC6763, subtypes can be any arbitrary utf-8 or ascii string
  and not required to begin with underscore. So leave alone
*/
var MAX_STRING = 20
/**
 * ServiceType class
 * @class
 */
function ServiceType(/* ... */) {
  this.name = ''
  this.protocol = ''
  this.subtypes = []
  var args
  if (arguments.length === 1) {
    args = Array.isArray(arguments[0]) ? arguments[0] : [arguments[0]]
  } else if (arguments.length > 1) {
    args = Array.prototype.slice.call(arguments)
  }
  if (args) {
    if (args.length === 1) {
      if (typeof args[0] === 'string') {
        this.fromString(args[0])
        // } else if (Array.isArray(args[0])) {
        //   this.fromArray(args[0]);
      } else if (typeof args[0] === 'object') {
        this.fromJSON(args[0])
      } else {
        throw new Error('argument must be a string, array or object')
      }
    } else if (args.length >= 2) {
      this.fromArray(args)
    } else {
      // zero arguments
      // uninitialized ServiceType ... fine with me
    }
  }
}

ServiceType.wildcard = '_services._dns-sd._udp'

ServiceType.prototype.isWildcard = function isWildcard() {
  return this.toString() === ServiceType.wildcard
}

ServiceType.prototype.toString = function () {
  var typeString = _u(this.name) + '.' + _u(this.protocol)
  if (this.fullyQualified) {
    typeString += '.'
  }
  if (this.subtypes.length > 0) {
    var subtypes = this.subtypes.slice(0) //clone not pointer
    subtypes.unshift(typeString)
    typeString = subtypes.join(',')
  }
  return typeString
}

ServiceType.prototype.fromString = function fromString(text) {
  text = text.replace(/.local$/, '')

  //take care of possible empty subtypes
  if (text.charAt(0) === '_') {
    text = text.replace(/^_sub/, '._sub') //fix for bad apple
  }

  var isWildcard = text === ServiceType.wildcard
  var subtypes = text.split(',')

  if (subtypes.length === 1) {
    subtypes = text.split('._sub').reverse()
  }

  var primaryString = subtypes.shift()
  var serviceTokens = primaryString.split('.')
  var serviceType = serviceTokens.shift()
  var protocol

  if (isWildcard) {
    serviceType += '.' + serviceTokens.shift()
  }
  if (primaryString[0] !== '_' || primaryString[0] === '_services') {
    serviceType = serviceTokens.shift()
  }

  protocol = serviceTokens.shift()
  //make tcp default if not already defined
  if (typeof protocol === 'undefined') {
    protocol = '_tcp'
  }
  checkProtocolU(protocol)
  if (!isWildcard) {
    checkFormat(serviceType)
  }

  if (serviceTokens.length === 1 && serviceTokens[0] === '') {
    // trailing dot
    this.fullyQualified = true
  } else if (serviceTokens.length > 0) {
    throw new Error(
      'trailing tokens "' + serviceTokens.join('.') + '" in ' + 'service type string "' + text + '"'
    )
  }

  this.name = serviceType.substr(1)
  this.protocol = protocol.substr(1)
  this.subtypes = subtypes //subtypes.map(function (t) { return t.substr(1); });
}

ServiceType.prototype.toArray = function toArray() {
  return [this.name, this.protocol].concat(this.subtypes)
}

ServiceType.prototype.fromArray = function fromArray(array) {
  var serviceType = _uu(array.shift())
  var protocol = _uu(array.shift())
  var subtypes = array.map(function (t) {
    return _uu(t)
  })

  checkLengthAndCharset(serviceType)
  checkProtocol(protocol)
  subtypes.forEach(function (t) {
    checkLengthAndCharset(t)
  })

  this.name = serviceType
  this.protocol = protocol
  this.subtypes = subtypes
}

ServiceType.prototype.fromJSON = function fromJSON(obj) {
  if (!('name' in obj)) {
    throw new Error('required property name is missing')
  }
  if (!('protocol' in obj)) {
    throw new Error('required property protocol is missing')
  }

  var serviceType = _uu(obj.name)
  var protocol = _uu(obj.protocol)
  var subtypes =
    'subtypes' in obj
      ? obj.subtypes.map(function (t) {
          return _uu(t)
        })
      : []

  checkLengthAndCharset(serviceType)
  checkProtocol(protocol)
  subtypes.forEach(function (t) {
    checkLengthAndCharset(t)
  })

  this.name = serviceType
  this.protocol = protocol
  this.subtypes = subtypes
  if ('fullyQualified' in obj) {
    this.fullyQualified = obj.fullyQualified
  }
}

ServiceType.prototype.matches = function matches(other) {
  return this.name === other.name && this.protocol === other.protocol
  // XXX handle subtypes
}

/**
 * creates a service type
 * @method
 * @returns {ServiceType}
 */
function makeServiceType() {
  if (arguments.length === 1 && arguments[0] instanceof ServiceType) {
    return arguments[0]
  }
  return new ServiceType(Array.prototype.slice.call(arguments))
}

/**
 * create protocol helpers
 * @param {string} protocol - tcp or udp
 * @returns {ServiceType}
 */
function protocolHelper(protocol) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    if (isProtocol(args[1])) {
      throw new Error('duplicate protocol "' + args[1] + '" in arguments')
    }
    args.splice(1, 0, protocol)
    return makeServiceType.apply(this, args)
  }
}

function isProtocol(str) {
  return str === 'tcp' || str === '_tcp' || str === 'udp' || str === '_udp'
}

function _u(str) {
  return '_' + str
}
function _uu(str) {
  return str[0] === '_' ? str.substr(1) : str
}

var CHARSET_REGEX = /[^-a-zA-Z0-9]/
function checkLengthAndCharset(str) {
  if (str.length === 0) {
    throw new Error('type ' + str + ' must not be empty')
  }
  if (str.length > MAX_STRING) {
    throw new Error('type ' + str + ' has more than ' + MAX_STRING + ' characters')
  }
  if (str.match(CHARSET_REGEX)) {
    throw new Error('type ' + str + ' may only contain alphanumeric ' + 'characters and hyphens')
  }
}

var FORMAT_REGEX = /_[-a-zA-Z0-9]+/
function checkFormat(str) {
  if (str.length === 0) {
    throw new Error('type string must not be empty')
  }
  if (str.length > MAX_STRING + 1) {
    // +1 is correct because we have a leading underscore
    throw new Error('type ' + _uu(str) + ' has more than ' + MAX_STRING + ' characters')
  }
  if (!str.match(FORMAT_REGEX)) {
    throw new Error(
      'type ' +
        str +
        ' must start with an underscore ' +
        'followed by alphanumeric characters and hyphens only'
    )
  }
}

function checkProtocolU(str) {
  if (!(str === '_tcp' || str === '_udp')) {
    throw new Error('protocol must be either "_tcp" or "_udp" but is "' + str + '"')
  }
}

function checkProtocol(str) {
  if (!(str === 'tcp' || str === 'udp')) {
    throw new Error('protocol must be either "tcp" or "udp" but is "' + str + '"')
  }
}

export { ServiceType, makeServiceType, protocolHelper }
