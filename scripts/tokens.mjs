import { DatabaseSync } from "node:sqlite"
import { homedir } from "node:os"
import { join } from "node:path"

const dbPath = join(homedir(), ".local", "share", "opencode", "opencode.db")
const cwd = process.cwd().replace(/\\/g, "/")

const db = new DatabaseSync(dbPath, { readOnly: true })

const session =
  db
    .prepare(
      "select id, title, directory, tokens_input, tokens_output, tokens_reasoning, tokens_cache_read from session where directory = ? order by time_updated desc limit 1",
    )
    .get(cwd) ??
  db
    .prepare(
      "select id, title, directory, tokens_input, tokens_output, tokens_reasoning, tokens_cache_read from session order by time_updated desc limit 1",
    )
    .get()

if (!session) {
  console.log("no sessions found in", dbPath)
  process.exit(0)
}

const rows = db.prepare("select data from message where session_id = ? order by time_created").all(session.id)

let last = null
for (const row of rows) {
  const data = JSON.parse(row.data)
  const t = data.tokens
  if (t && (t.input || t.output || t.reasoning || (t.cache && t.cache.read))) last = t
}

const t = last ?? { input: 0, output: 0, reasoning: 0, cache: { read: 0 } }
const cacheRead = t.cache?.read ?? 0
const turnTotal = (t.input ?? 0) + (t.output ?? 0) + (t.reasoning ?? 0) + cacheRead
const sessionTotal = session.tokens_input + session.tokens_output + session.tokens_reasoning + session.tokens_cache_read

const fmt = (n) => n.toLocaleString("en-US")

console.log(`session  : ${session.id}  (${session.directory})`)
console.log(`title    : ${session.title}`)
console.log("")
console.log("ultimo turno")
console.log(`  input        ${fmt(t.input ?? 0)}`)
console.log(`  cache read   ${fmt(cacheRead)}`)
console.log(`  output       ${fmt(t.output ?? 0)}`)
console.log(`  reasoning    ${fmt(t.reasoning ?? 0)}`)
console.log(`  total        ${fmt(turnTotal)}`)
console.log("")
console.log("sesion acumulada")
console.log(`  input        ${fmt(session.tokens_input)}`)
console.log(`  cache read   ${fmt(session.tokens_cache_read)}`)
console.log(`  output       ${fmt(session.tokens_output)}`)
console.log(`  reasoning    ${fmt(session.tokens_reasoning)}`)
console.log(`  total        ${fmt(sessionTotal)}`)
