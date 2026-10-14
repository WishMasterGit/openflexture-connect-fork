import { Command, InvalidArgumentError } from 'commander'
import { isIP } from 'node:net'

function parseHostname(value) {
  const hostname = value.trim()

  if (!hostname || /\s/.test(hostname) || /[/:?#@\\]/.test(hostname)) {
    throw new InvalidArgumentError(
      'Expected a hostname or IP address, e.g. localhost or 192.168.1.10'
    )
  }

  // Accept IPv4 and IPv6 addresses.
  if (isIP(hostname)) {
    return hostname
  }

  // Validate hostname using URL parser
  try {
    const url = new URL(`http://${hostname}`)

    if (url.hostname !== hostname || hostname.includes('.')) {
      // Continue with DNS hostname validation below.
    }

    // A series of checks. If any are true, parsing has failed
    if (
      url.hostname !== hostname ||
      hostname.length > 253 ||
      hostname
        .split('.')
        .some(
          (label) =>
            !label ||
            label.length > 63 ||
            label.startsWith('-') ||
            label.endsWith('-') ||
            !/^[a-zA-Z0-9-]+$/.test(label)
        )
    ) {
      throw new Error('Invalid hostname')
    }
  } catch {
    throw new InvalidArgumentError(
      'Expected a valid hostname or IP address, e.g. localhost or microscope.local'
    )
  }

  return hostname
}

function parsePort(value) {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError('Port must be a number')
  }

  const port = Number(value)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new InvalidArgumentError('Port must be between 1 and 65535')
  }

  return port
}

export function parseCliOptions(args) {
  const program = new Command()

  program.exitOverride((err) => {
    if (err.code === 'commander.helpDisplayed') {
      process.exit(0)
    }

    throw err
  })

  program
    .name('openflexure-connect')
    .description('The program for finding and connecting to OpenFlexure Microscopes')
    .option('--host <hostname>', 'hostname or IPv4 address of the microscope', parseHostname)
    .option('--port <port>', 'HTTP port of the microscope', parsePort)
    .option('--maximise', 'open the all windows maximised')
    .allowExcessArguments(false)

  program.parse(args, { from: 'user' })

  const options = program.opts()

  if ((options.host === undefined) !== (options.port === undefined)) {
    throw new Error('--host and --port must be supplied together')
  }

  const url =
    options.host !== undefined ? `http://${options.host}:${options.port}/index.html` : null

  return {
    url,
    maximise: options.maximise ?? false
  }
}
