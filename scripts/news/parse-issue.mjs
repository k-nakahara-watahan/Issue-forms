import fs from "node:fs"
import path from "node:path"

const issueBody = process.env.ISSUE_BODY ?? ""
const issueNumber = Number(process.env.ISSUE_NUMBER)

const tmpDir = ".tmp"
const outputFile = path.join(tmpDir, "news-request.json")
const errorFile = path.join(tmpDir, "news-error.md")

fs.mkdirSync(tmpDir, { recursive: true })

function fail(message) {
  const text = [
    "## ❌ NEWSを処理できませんでした",
    "",
    message,
    "",
    "入力内容をご確認ください",
  ].join("\n")

  fs.writeFileSync(errorFile, text)
  console.error(message)
  process.exit(1)
}

function parseIssueForm(body) {
  const sections = new Map()

  const normalized =
    `${body.trim()}\n\n### __END__\n\n`

  const pattern =
    /^### (.+?)\r?\n\r?\n([\s\S]*?)(?=\r?\n### )/gm

  for (const match of normalized.matchAll(pattern)) {
    const label = match[1].trim()
    const value = match[2].trim()

    if (label !== "__END__") {
      sections.set(label, value)
    }
  }

  return sections
}

function cleanOptional(value = "") {
  const normalized = value.trim()

  if (
    normalized === "_No response_" ||
    normalized === "No response"
  ) {
    return ""
  }

  return normalized
}

if (!issueNumber) {
  fail("Issue番号を取得できませんでした")
}

const fields = parseIssueForm(issueBody)

const date = cleanOptional(fields.get("公開日"))
const title = cleanOptional(fields.get("NEWSタイトル"))
const body = cleanOptional(fields.get("本文"))
const link = cleanOptional(fields.get("リンク先"))
const confirmation = cleanOptional(fields.get("確認"))

if (!date) {
  fail("公開日が入力されていません")
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  fail("公開日は YYYY-MM-DD 形式で入力してください")
}

const parsedDate = new Date(`${date}T00:00:00Z`)

if (
  Number.isNaN(parsedDate.getTime()) ||
  parsedDate.toISOString().slice(0, 10) !== date
) {
  fail("存在しない公開日が入力されています")
}

if (!title) {
  fail("NEWSタイトルが入力されていません")
}

if (title.length > 120) {
  fail("NEWSタイトルは120文字以内にしてください")
}

if (!body) {
  fail("本文が入力されていません")
}

if (body.length > 10000) {
  fail("本文は10000文字以内にしてください")
}

if (link) {
  const relativeUrl = link.startsWith("/")

  if (!relativeUrl) {
    try {
      const url = new URL(link)

      if (url.protocol !== "https:") {
        fail("リンク先はHTTPS URLを指定してください")
      }
    } catch {
      fail("リンク先URLの形式が正しくありません")
    }
  }
}

if (!/\[[xX]\]/.test(confirmation)) {
  fail("確認チェックが入っていません")
}

const id =
  `news-${date.replaceAll("-", "")}-${issueNumber}`

const news = {
  id,
  date,
  title,
  body,
  link,
  issueNumber,
}

fs.writeFileSync(
  outputFile,
  JSON.stringify(news, null, 2) + "\n"
)

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `news_id=${id}\n`
  )

  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `news_title=${title.replaceAll("\n", " ")}\n`
  )
}

console.log(news)
