#!/usr/bin/env node

/**
 * E2E tests for aquarion CLI.
 *
 * Starts the test server, runs aquarion with various configs,
 * and validates the results.
 *
 * Usage: node --test test/run.js
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const AQUARION = path.join(ROOT, 'index.js')
const INSTALL_DIR = path.join(__dirname, '_test_install')
const SERVER_DIR = path.join(__dirname, 'server')
const TMP_CONFIG = path.join(__dirname, '_test_config.json')

let serverProcess
let serverPort = 3456

function cleanInstallDir() {
  if (fs.existsSync(INSTALL_DIR)) {
    fs.rmSync(INSTALL_DIR, { recursive: true, force: true })
  }
}

function cleanTmpConfig() {
  if (fs.existsSync(TMP_CONFIG)) fs.unlinkSync(TMP_CONFIG)
}

function writeConfig(config) {
  fs.writeFileSync(TMP_CONFIG, JSON.stringify(config))
  return TMP_CONFIG
}

/** Run aquarion with a config object (written to temp file) */
function runWithConfig(config, extraArgs = []) {
  const cfgPath = writeConfig(config)
  return execFileSync('node', [AQUARION, cfgPath, ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  })
}

/** Run aquarion with raw CLI args (for testing CLI edge cases) */
function runRaw(args) {
  return execFileSync('node', [AQUARION, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  })
}

/** Run aquarion with a raw inline JSON string arg */
function runInline(jsonStr, extraArgs = []) {
  return execFileSync('node', [AQUARION, jsonStr, ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  })
}

function runExpectFail(args) {
  try {
    execFileSync('node', [AQUARION, ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    })
    assert.fail('Expected aquarion to fail but it succeeded')
  } catch (err) {
    return err
  }
}

function waitForServer(port, timeoutMs = 10000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        res.resume()
        resolve()
      })
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Server did not start in time'))
        } else {
          setTimeout(check, 300)
        }
      })
      req.setTimeout(1000, () => {
        req.destroy()
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Server did not start in time'))
        } else {
          setTimeout(check, 300)
        }
      })
    }
    check()
  })
}


describe('aquarion E2E tests', () => {

  before(async () => {
    // Install server dependencies if needed
    if (!fs.existsSync(path.join(SERVER_DIR, 'node_modules'))) {
      execFileSync('npm', ['install'], { cwd: SERVER_DIR, stdio: 'ignore', shell: true })
    }

    // Start test server on custom port
    serverProcess = spawn('node', ['index.js'], {
      cwd: SERVER_DIR,
      env: { ...process.env, PORT: String(serverPort) },
      stdio: 'pipe',
    })

    serverProcess.stderr.on('data', (d) => {
      // Uncomment for debugging: console.error('[server stderr]', d.toString())
    })

    await waitForServer(serverPort)
  })

  after(() => {
    if (serverProcess) serverProcess.kill()
    cleanInstallDir()
    cleanTmpConfig()
  })

  beforeEach(() => {
    cleanInstallDir()
    cleanTmpConfig()
  })


  describe('CLI basics', () => {

    it('should show usage when no arguments given', () => {
      try {
        execFileSync('node', [AQUARION], {
          cwd: ROOT, encoding: 'utf8', timeout: 5000,
        })
        assert.fail('Should have exited with error')
      } catch (err) {
        assert.ok(err.stderr.includes('Usage'), 'Should show usage message')
      }
    })

    it('should fail on invalid config file path', () => {
      const err = runExpectFail(['nonexistent.json'])
      assert.ok(err.stderr.includes('Failed to read config file'),
        'Should report config read failure')
    })

    it('should fail on invalid JSON string', () => {
      const err = runExpectFail(['{not valid json}'])
      assert.ok(err.stderr.includes('Failed to parse config'),
        'Should report parse failure')
    })

  })


  describe('download and install', () => {

    it('should download, unzip, and install from a config file', () => {
      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        installDirectory: INSTALL_DIR,
      })

      assert.ok(output.includes('Downloading'), 'Should show download message')
      assert.ok(output.includes('Unzip complete'), 'Should show unzip message')
      assert.ok(fs.existsSync(INSTALL_DIR), 'Install directory should exist')
      assert.ok(fs.existsSync(path.join(INSTALL_DIR, 'index.js')),
        'Installed app should contain index.js')
      assert.ok(fs.existsSync(path.join(INSTALL_DIR, 'second.js')),
        'Installed app should contain second.js')
      assert.ok(fs.existsSync(path.join(INSTALL_DIR, 'randomFile.txt')),
        'Installed app should contain randomFile.txt')
    })

    it('should skip download if already installed', () => {
      fs.mkdirSync(INSTALL_DIR, { recursive: true })

      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        installDirectory: INSTALL_DIR,
      })

      assert.ok(output.includes('Already installed'), 'Should skip download')
    })

    it('should re-download with --update flag', () => {
      fs.mkdirSync(INSTALL_DIR, { recursive: true })

      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        installDirectory: INSTALL_DIR,
      }, ['--update'])

      assert.ok(output.includes('Downloading'), 'Should download with --update')
      assert.ok(fs.existsSync(path.join(INSTALL_DIR, 'index.js')),
        'Should have installed files')
    })

    it('should re-download with update flag (no dashes)', () => {
      fs.mkdirSync(INSTALL_DIR, { recursive: true })

      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        installDirectory: INSTALL_DIR,
      }, ['update'])

      assert.ok(output.includes('Downloading'), 'Should download with update')
    })

  })


  describe('inline JSON config', () => {

    it('should accept inline JSON as config argument', () => {
      const jsonStr = JSON.stringify({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        installDirectory: INSTALL_DIR,
      })

      const output = runInline(jsonStr)
      assert.ok(output.includes('Downloading'), 'Should download from inline config')
      assert.ok(fs.existsSync(path.join(INSTALL_DIR, 'index.js')),
        'Should install from inline config')
    })

  })


  describe('flush option', () => {

    it('should empty install directory before installing when flush is true', () => {
      fs.mkdirSync(INSTALL_DIR, { recursive: true })
      fs.writeFileSync(path.join(INSTALL_DIR, 'sentinel.txt'), 'should be removed')

      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        installDirectory: INSTALL_DIR,
        flush: true,
      }, ['--update'])

      assert.ok(output.includes('Flushing'), 'Should flush directory')
      assert.ok(!fs.existsSync(path.join(INSTALL_DIR, 'sentinel.txt')),
        'Sentinel file should be removed')
      assert.ok(fs.existsSync(path.join(INSTALL_DIR, 'index.js')),
        'New files should be installed')
    })

  })


  describe('getCredentials formats', () => {

    it('should handle string format credentials', () => {
      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        getCredentials: 'api_key=test123',
        installDirectory: INSTALL_DIR,
      })
      assert.ok(output.includes('Downloading'), 'Should work with string credentials')
    })

    it('should handle key-value array format', () => {
      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        getCredentials: ['api_key', 'test123'],
        installDirectory: INSTALL_DIR,
      })
      assert.ok(output.includes('Downloading'), 'Should work with array credentials')
    })

    it('should handle array-of-arrays format', () => {
      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        getCredentials: [['api_key', 'test123'], ['extra', 'param']],
        installDirectory: INSTALL_DIR,
      })
      assert.ok(output.includes('Downloading'), 'Should work with nested array credentials')
    })

    it('should handle object format', () => {
      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        getCredentials: { api_key: 'test123', extra: 'param' },
        installDirectory: INSTALL_DIR,
      })
      assert.ok(output.includes('Downloading'), 'Should work with object credentials')
    })

  })


  describe('auth headers', () => {

    it('should send authHeader when configured', () => {
      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        authHeader: 'Bearer test-token-123',
        installDirectory: INSTALL_DIR,
      })
      assert.ok(output.includes('Downloading'), 'Should download with auth header')
    })

    it('should send basic auth when basicCredentials configured', () => {
      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        basicCredentials: 'user:password',
        installDirectory: INSTALL_DIR,
      })
      assert.ok(output.includes('Downloading'), 'Should download with basic auth')
    })

  })


  describe('postInstall commands', () => {

    it('should run a single postInstall command', () => {
      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        installDirectory: INSTALL_DIR,
        postInstall: 'echo post-install-marker',
      })
      assert.ok(output.includes('post-install-marker'),
        'Should run postInstall command and show output')
      assert.ok(output.includes('postInstall commands executed'),
        'Should confirm postInstall success')
    })

    it('should run multiple postInstall commands', () => {
      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        installDirectory: INSTALL_DIR,
        postInstall: ['echo first-marker', 'echo second-marker'],
      })
      assert.ok(output.includes('first-marker'), 'Should run first command')
      assert.ok(output.includes('second-marker'), 'Should run second command')
    })

  })


  describe('runCommand', () => {

    it('should execute runCommand after install', () => {
      const output = runWithConfig({
        remote: `http://localhost:${serverPort}/download`,
        timeout: 30,
        installDirectory: INSTALL_DIR,
        runCommand: 'echo app-running-marker',
      })
      assert.ok(output.includes('Running application'), 'Should show run message')
      assert.ok(output.includes('app-running-marker'), 'Should execute runCommand')
    })

  })


  describe('error handling', () => {

    it('should fail when remote is missing and download needed', () => {
      const cfgPath = writeConfig({ installDirectory: INSTALL_DIR })
      const err = runExpectFail([cfgPath])
      assert.ok(err.stderr.includes('remote'),
        'Should complain about missing remote')
    })

    it('should fail on unreachable server', () => {
      const cfgPath = writeConfig({
        remote: 'http://localhost:19999/download',
        timeout: 3,
        installDirectory: INSTALL_DIR,
      })
      const err = runExpectFail([cfgPath])
      assert.ok(err.status !== 0, 'Should exit with error')
    })

  })

})
