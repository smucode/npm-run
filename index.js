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

const parse = file => {
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

const read = () => {
  try {
    return fs.readFileSync('./package.json')
  } catch (e) {
    exit(`package.json not found in ${process.cwd()}`)
  }
}

const packageJson = R.pipe(read, parse)()

;(async () => {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'command',
      pageSize: 10,
      choices: R.keys(packageJson.scripts),
      message: `Select which ${packageJson.name}@${packageJson.version} script to run:`
    }
  ])
  run(answer.command)
})()
