/*
 * This file is derived from code in the qap project:
 * https://github.com/rootslab/qap
 *
 * Qap is a quick parser/matcher for string or buffer patterns.
 * It is optimized for using with pattern strings/buffers <= 255 bytes.
 * Better results are achieved with sparse and long patterns in the data to be parsed.
 * It is an implementation of QuickSearch algorithm :
 * http://www-igm.univ-mlv.fr/~lecroq/string/node19.html#SECTION00190
 *
 * Copyright for the original work remains with the original authors.
 *
 * Copyright(c) 2013-present Guglielmo Ferri <44gatti@gmail.com>
 * MIT Licensed
 *
 * Portions of this file have been modernised for this openflexure use, while
 * unchanged portions remain subject to the MIT License.
 */

function lookupTable(p) {
  var m = p.length,
    t = m > 255 ? [] : new Buffer(256),
    i = 255,
    j = 0
  for (; i >= 0; t[i] = 0, i--);
  for (; m > 0; t[p[j++]] = m--);
  return t
}

function convert(data) {
  if (Buffer.isBuffer(data)) {
    return data
  }

  if (typeof data === 'string') {
    return Buffer.from(data)
  }

  throw new TypeError('The argument type should be Buffer or String.')
}

export class Qap {
  constructor(pattern) {
    this.set(pattern)
  }

  set(pattern) {
    var me = this
    me.p = convert(pattern)
    me.plkb = lookupTable(me.p)
    return me.p
  }

  parse(data, start, rlimit, array) {
    var me = this,
      d = convert(data),
      plkb = me.plkb,
      p = me.p,
      m = p.length,
      n = d.length,
      ixs = Array.isArray(array) ? array : [],
      j = start || 0,
      ok = 1,
      z = 0,
      x = p[0],
      pos = 0 + j,
      y = d[pos],
      i = m + j,
      c = d[i],
      offset = n - m,
      l = rlimit || Infinity
    for (; j <= offset; i = j + m, c = d[i], z = 0, ok = 1, pos = j, x = p[0], y = d[pos]) {
      for (; z < m; z++, pos++, x = p[z], y = d[pos]) {
        if (x === y) continue
        else {
          ok = 0
          break
        }
      }
      if (ok && ixs.push(j) >= l) break
      j += plkb[c] || m + 1
    }
    return ixs
  }
}
