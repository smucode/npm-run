const R = require('ramda')
const inquirer = require('inquirer')
const { spawn } = require('child_process')
const fs = require('fs')

const run = (command, env = process.env) => {
  const proc = spawn('npm', ['run', command], { env })
  proc.stdout.on('data', log)
  proc.stderr.on('data', log)
}

const log = data => process.stdout.write(data.toString())

const exit = msg => {
  console.error(msg)
  process.exit(1)
}

const parsePackageJson = file => {
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
  try {
    const cfg = fs.readFileSync('./.npmrunrc')
    const parsed = JSON.parse(cfg.toString())
    return { ...defaultConfig, ...parsed }
  } catch (e) {
    console.log('unable to read .npmrunrc: ' + e.message)
    return defaultConfig
  }
}

const readPackageJson = () => {
  try {
    return fs.readFileSync('./package.json')
  } catch (e) {
    exit(`package.json not found in ${process.cwd()}`)
  }
}

const updateScriptObj = (obj, tokens, command) => {
  const [token, ...rest] = tokens
  if (!token) return obj

  const current = obj[token] || { command: '', children: {} }

  if (rest.length) {
    const children = updateScriptObj(current.children, rest, command)
    return {
      ...obj,
      [token]: { ...current, children }
    }
  } else {
    return {
      ...obj,
      [token]: { ...current, command }
    }
  }
}

const config = readConfig()

const packageJson = R.pipe(readPackageJson, parsePackageJson)()

const scripts = R.pipe(
  R.keys(),
  R.reduce((obj, command) => {
    const tokens = config.delimiter
      ? command.split(config.delimiter)
      : [command]
    return updateScriptObj(obj, tokens, command)
  }, {})
)(packageJson.scripts)

const cli = async scripts => {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'command',
      pageSize: 10,
      choices: R.pipe(R.keys, x => x.sort())(scripts),
      message: `Select which ${packageJson.name}@${packageJson.version} script to run:`
    }
  ])
  const current = scripts[answer.command]

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

cli(scripts)
