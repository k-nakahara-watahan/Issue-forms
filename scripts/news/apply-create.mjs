import fs from "node:fs"

const requestPath = ".tmp/news-request.json"
const newsPath = "content/news.json"

const request = JSON.parse(
  fs.readFileSync(requestPath, "utf8")
)

const news = JSON.parse(
  fs.readFileSync(newsPath, "utf8")
)

if (news.some((item) => item.id === request.id)) {
  throw new Error(
    `NEWS ID ${request.id} は既に存在しています`
  )
}

news.push(request)

news.sort((a, b) => {
  if (a.date !== b.date) {
    return b.date.localeCompare(a.date)
  }

  return b.issueNumber - a.issueNumber
})

fs.writeFileSync(
  newsPath,
  JSON.stringify(news, null, 2) + "\n"
)

console.log(`Added ${request.id}`)
