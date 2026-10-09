/**
 * After `vite build`, snapshots each sitemap URL into dist/<route>/index.html
 * so Hostinger can serve HTML without waiting for JavaScript.
 *
 * Uses installed Google Chrome when Playwright's Chromium download is absent.
 * Set SKIP_PRERENDER=1 to build the SPA shell without snapshots.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chromium, type Browser } from 'playwright'
import { preview } from 'vite'

const DIST = resolve(process.cwd(), 'dist')
const PORT = 4173
const ORIGIN = `http://127.0.0.1:${PORT}`

function pathsFromSitemap(xml: string): string[] {
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    match[1].replace(/&amp;/g, '&'),
  )
  const paths = locs.map((loc) => new URL(loc).pathname)
  const rest = paths.filter((path) => path !== '/')
  return paths.includes('/') ? [...rest, '/'] : rest
}

function outputFile(routePath: string): string {
  if (routePath === '/') return resolve(DIST, 'index.html')
  return resolve(DIST, routePath.replace(/^\//, ''), 'index.html')
}

const SHELL_TITLE = 'Capital Dreams Dubai Real Estate | UAE'
const SHELL_DESCRIPTION =
  'Capital Dreams Dubai real estate in the UAE. Homes, investments, and advisory services for buyers, sellers, and investors.'
const SHELL_CANONICAL = 'https://capitaldreamdubai.com/'
const SHELL_IMAGE = 'https://capitaldreamdubai.com/LOGO%20NO%20ICON.png'

function dropShellDuplicates(source: string): string {
  let html = source
  const drop = (pattern: RegExp, isShell: (tag: string) => boolean) => {
    const matches = [...html.matchAll(pattern)]
    if (matches.length < 2) return
    const shell = matches.filter((match) => isShell(match[0]))
    const specific = matches.filter((match) => !isShell(match[0]))
    const remove = specific.length > 0 ? shell : shell.slice(1)
    for (const match of remove) html = html.replace(match[0], '')
  }

  drop(/<title>[\s\S]*?<\/title>/g, (tag) => tag === `<title>${SHELL_TITLE}</title>`)
  drop(
    /<meta name="description" content="[^"]*">/g,
    (tag) => tag === `<meta name="description" content="${SHELL_DESCRIPTION}">`,
  )
  drop(
    /<link rel="canonical" href="[^"]*">/g,
    (tag) => tag === `<link rel="canonical" href="${SHELL_CANONICAL}">`,
  )
  drop(
    /<meta property="og:title" content="[^"]*">/g,
    (tag) => tag.includes(`content="${SHELL_TITLE}"`),
  )
  drop(
    /<meta name="twitter:title" content="[^"]*">/g,
    (tag) => tag.includes(`content="${SHELL_TITLE}"`),
  )
  drop(
    /<meta property="og:description" content="[^"]*">/g,
    (tag) => tag.includes(`content="${SHELL_DESCRIPTION}"`),
  )
  drop(
    /<meta name="twitter:description" content="[^"]*">/g,
    (tag) => tag.includes(`content="${SHELL_DESCRIPTION}"`),
  )
  drop(
    /<meta property="og:url" content="[^"]*">/g,
    (tag) => tag.includes(`content="${SHELL_CANONICAL}"`),
  )
  drop(
    /<meta property="og:image" content="[^"]*">/g,
    (tag) => tag.includes(`content="${SHELL_IMAGE}"`),
  )
  drop(
    /<meta name="twitter:image" content="[^"]*">/g,
    (tag) => tag.includes(`content="${SHELL_IMAGE}"`),
  )
  drop(/<meta property="og:type" content="[^"]*">/g, (tag) => tag.includes('content="website"'))
  drop(
    /<meta name="twitter:card" content="[^"]*">/g,
    (tag) => tag.includes('content="summary_large_image"'),
  )
  drop(
    /<meta property="og:site_name" content="[^"]*">/g,
    (tag) => tag.includes('content="Capital Dreams Dubai"'),
  )
  return html
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch {
    return await chromium.launch({ headless: true })
  }
}

async function snapshot(browser: Browser, routePath: string): Promise<'written' | 'skipped'> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await page.route('**/*googletagmanager.com/**', (route) => route.abort())
    await page.route('**/*google-analytics.com/**', (route) => route.abort())
    await page.route('**/*doubleclick.net/**', (route) => route.abort())
    await page.route('**/*youtube.com/**', (route) => route.abort())
    await page.route('**/*youtu.be/**', (route) => route.abort())
    const url = routePath === '/' ? `${ORIGIN}/` : `${ORIGIN}${routePath}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForSelector('main[data-prerender-ready="true"] h1', {
      timeout: 25_000,
      state: 'attached',
    })
    const landed = new URL(page.url()).pathname.replace(/\/$/, '') || '/'
    const expected = routePath.replace(/\/$/, '') || '/'
    if (landed !== expected) {
      console.warn(`Skipped ${routePath} (browser landed on ${landed})`)
      return 'skipped'
    }
    let html = await page.content()
    html = dropShellDuplicates(html)
    if (!/^<!doctype html>/i.test(html)) html = `<!DOCTYPE html>\n${html}`
    const file = outputFile(routePath)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, html)
    return 'written'
  } finally {
    await page.close()
  }
}

async function removeSkippedFromSitemaps(skipped: string[]) {
  if (skipped.length === 0) return
  const skippedSet = new Set(skipped.map((path) => path.replace(/\/$/, '') || '/'))
  const files = [resolve(DIST, 'sitemap.xml'), resolve(process.cwd(), 'public/sitemap.xml')]
  for (const file of files) {
    const xml = await readFile(file, 'utf8')
    const next = xml
      .split('\n')
      .filter((line) => {
        const match = line.match(/<loc>([^<]+)<\/loc>/)
        if (!match) return true
        const path = new URL(match[1].replace(/&amp;/g, '&')).pathname.replace(/\/$/, '') || '/'
        return !skippedSet.has(path)
      })
      .join('\n')
    await writeFile(file, next)
  }
  console.log(`Removed ${skipped.length} redirected URLs from the sitemap.`)
}

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items]
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (item === undefined) return
      await worker(item)
    }
  })
  await Promise.all(runners)
}

async function main() {
  if (process.env.SKIP_PRERENDER === '1') {
    console.log('SKIP_PRERENDER=1, leaving the SPA shell.')
    return
  }

  const xml = await readFile(resolve(DIST, 'sitemap.xml'), 'utf8')
  const routes = pathsFromSitemap(xml)
  if (routes.length === 0) throw new Error('Sitemap has no URLs to prerender.')

  const server = await preview({
    preview: { host: '127.0.0.1', port: PORT, strictPort: true },
  })
  const browser = await launchBrowser()
  const failures: string[] = []
  const skipped: string[] = []

  try {
    await pool(routes, 3, async (routePath) => {
      try {
        const result = await snapshot(browser, routePath)
        if (result === 'skipped') {
          skipped.push(routePath)
          return
        }
        console.log(`Prerendered ${routePath}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(`${routePath}: ${message}`)
        console.error(`Failed ${routePath}: ${message}`)
      }
    })
  } finally {
    await browser.close()
    await server.close()
  }

  await removeSkippedFromSitemaps(skipped)

  if (failures.length > 0) {
    console.error(`Prerender failed for ${failures.length} route(s).`)
    process.exit(1)
  }
  console.log(`Prerendered ${routes.length - skipped.length} routes.`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
