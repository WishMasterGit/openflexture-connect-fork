import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseCliOptions } from '../src/main/cli_options.js'

describe('parseCliOptions', () => {
  it('uses defaults when no arguments are supplied', () => {
    assert.deepEqual(parseCliOptions([]), {
      url: null,
      maximise: false
    })
  })

  it('builds a URL from host and port', () => {
    assert.deepEqual(parseCliOptions(['--host', 'localhost', '--port', '5000']), {
      url: 'http://localhost:5000/index.html',
      maximise: false
    })
  })

  it('supports the maximise flag', () => {
    assert.equal(parseCliOptions(['--maximise']).maximise, true)
  })

  it('accepts an IPv4 address', () => {
    assert.equal(
      parseCliOptions(['--host', '192.168.1.10', '--port', '5000']).url,
      'http://192.168.1.10:5000/index.html'
    )
  })

  it('rejects a missing host or port', () => {
    assert.throws(
      () => parseCliOptions(['--host', 'localhost']),
      /--host and --port must be supplied together/
    )

    assert.throws(
      () => parseCliOptions(['--port', '5000']),
      /--host and --port must be supplied together/
    )
  })

  it('rejects an invalid hostname', () => {
    assert.throws(
      () => parseCliOptions(['--host', 'invalid host', '--port', '8080']),
      /Expected a hostname or IP address/
    )
  })

  it('rejects invalid ports', () => {
    for (const port of ['abc', '0', '65536', '-1']) {
      assert.throws(() => parseCliOptions(['--host', 'localhost', '--port', port]))
    }
  })

  it('rejects unknown options', () => {
    assert.throws(() => parseCliOptions(['--unknown']))
  })
})
