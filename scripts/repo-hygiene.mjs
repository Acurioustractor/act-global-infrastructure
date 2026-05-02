#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim()
}

function lines(value) {
  return value ? value.split('\n').filter(Boolean) : []
}

function safeGit(args) {
  try {
    return git(args)
  } catch (error) {
    return error.stderr?.toString().trim() || error.message
  }
}

const branch = safeGit(['branch', '--show-current'])
const upstream = safeGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
const status = lines(safeGit(['status', '--short']))
const trackedModified = status.filter((line) => !line.startsWith('??'))
const untracked = status.filter((line) => line.startsWith('??'))
const staged = status.filter((line) => line[0] !== ' ' && !line.startsWith('??'))
const aheadBehind = upstream.includes('fatal') ? 'no upstream' : safeGit(['rev-list', '--left-right', '--count', 'HEAD...@{u}'])
const worktrees = lines(safeGit(['worktree', 'list']))
const merged = lines(safeGit(['branch', '--merged', 'origin/main'])).map((line) => line.replace(/^[*+ ]+/, ''))
const unmerged = lines(safeGit(['branch', '--no-merged', 'origin/main'])).map((line) => line.replace(/^[*+ ]+/, ''))

console.log('# Repo Hygiene Report')
console.log('')
console.log(`Branch: ${branch || '(detached)'}`)
console.log(`Upstream: ${upstream.includes('fatal') ? '(none)' : upstream}`)
console.log(`Ahead/behind: ${aheadBehind}`)
console.log('')
console.log(`Status: ${status.length === 0 ? 'clean' : 'dirty'}`)
console.log(`Staged: ${staged.length}`)
console.log(`Modified tracked: ${trackedModified.length}`)
console.log(`Untracked visible: ${untracked.length}`)
console.log(`Worktrees: ${worktrees.length}`)
console.log('')

if (trackedModified.length > 0) {
  console.log('## Modified tracked files')
  for (const line of trackedModified.slice(0, 40)) console.log(`- ${line}`)
  if (trackedModified.length > 40) console.log(`- ...${trackedModified.length - 40} more`)
  console.log('')
}

if (untracked.length > 0) {
  console.log('## Untracked visible files')
  for (const line of untracked.slice(0, 40)) console.log(`- ${line}`)
  if (untracked.length > 40) console.log(`- ...${untracked.length - 40} more`)
  console.log('')
}

console.log('## Local branches merged to origin/main')
for (const name of merged.filter((item) => item && item !== branch)) console.log(`- ${name}`)
console.log('')

console.log('## Local branches not merged to origin/main')
for (const name of unmerged.filter(Boolean)) console.log(`- ${name}`)
console.log('')

if (status.length > 0) {
  console.log('Next: commit, stash, ignore generated files, or move unfinished work to a named WIP branch before starting unrelated work.')
  process.exitCode = 1
}
