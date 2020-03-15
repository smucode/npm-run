import * as R from 'ramda'
import { prompt } from 'inquirer'
import { spawn } from 'child_process'
import { readFileSync, existsSync } from 'fs'

const configFilename = '.npmrunrc'

const run = (command: string, env = process.env) => {
  const proc = spawn('npm', ['run', command], { env })
  proc.stdout.on('data', b => log(b.toString()))
  proc.stderr.on('data', b => log(b.toString()))
}

const log = (data: string) => process.stdout.write(data)

const exit = (msg: string) => {
  console.error(msg)
  process.exit(1)
}

const parsePackageJson = (file: string) => {
  try {
    const parsed = JSON.parse(file)
    if (!R.keys(parsed.scripts || {}).length) {
      return exit(`scripts section of package.json is empty`)
    }
    return parsed
  } catch (e) {
    exit(`unable to parse package.json: ${e}`)
  }
}

const defaultConfig = {
  delimiter: ':'
}

const readConfig = () => {
  if (!existsSync(configFilename)) {
    return defaultConfig
  }
  try {
    const cfg = readFileSync(configFilename)
    const parsed = JSON.parse(cfg.toString())
    return { ...defaultConfig, ...parsed }
  } catch (e) {
    console.log('unable to read .npmrunrc: ' + e.message)
    console.log('using default: ' + JSON.stringify(defaultConfig, null, 2))
    return defaultConfig
  }
}

const readPackageJson = () => {
  try {
    return readFileSync('./package.json').toString()
  } catch (e) {
    exit(`package.json not found in ${process.cwd()}`)
  }
}

const updateScriptObj = (
  commands: Commands,
  tokens: string[],
  command: string
) => {
  const [token, ...rest] = tokens
  if (!token) return commands

  const current = commands[token] || { command: '', children: {} }

  if (rest.length) {
    const children = updateScriptObj(current.children, rest, command)
    return {
      ...commands,
      [token]: { ...current, children }
    }
  } else {
    return {
      ...commands,
      [token]: { ...current, command }
    }
  }
}

const config = readConfig()

const packageJson = R.pipe(readPackageJson, parsePackageJson)()

const commands = R.pipe(
  R.keys,
  R.reduce((obj, command) => {
    const tokens = config.delimiter
      ? command.split(config.delimiter)
      : [command]
    return updateScriptObj(obj, tokens, command)
  }, {})
)(packageJson.scripts)

interface Commands {
  [index: string]: Command
}

interface Command {
  command: string
  children: Commands
}

const cli = async (commands: Commands) => {
  const answer = await prompt([
    {
      type: 'list',
      name: 'command',
      pageSize: 10,
      choices: R.pipe(R.keys, x => x.sort())(commands),
      message: `${packageJson.name}@${packageJson.version}`
    }
  ])
  const current = commands[answer.command]

  if (R.isEmpty(current.children)) {
    run(current.command)
  } else {
    console.log(current.command)
    cli({
      ...current.children,
      ...(current.command
        ? {
            ['<' + answer.command + '>']: {
              command: current.command,
              children: {}
            }
          }
        : {})
    })
  }
}

cli(commands)
