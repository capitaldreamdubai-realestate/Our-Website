/**
 * Import a villa 360 export folder into the Capital Dreams Supabase project.
 *
 *   npm run import-villa -- "Opal_Gardens_D315"
 *   npm run import-villa -- "Opal_Gardens_D315" --replace-scenes
 *
 * The folder must contain export/scenes-with-settings.json (or public/scenes.json),
 * public/panoramas, and public/thumbs. Re-running uploads images again and
 * keeps CMS titles, order, and visibility unless --replace-scenes is set.
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { access, readFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import type { Database } from '../src/integrations/supabase/database.types'

config({ path: resolve(process.cwd(), '.env') })

const GRADES = new Set(['daylight', 'interior', 'sunset'])

type ExportScene = {
  image?: string
  thumb?: string
  capture?: number | string
  title?: string
  zone?: string
  grade?: string
  active?: boolean
}

const url = process.env.VITE_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const args = process.argv.slice(2).filter((arg) => arg !== '--')
const replaceScenes = args.includes('--replace-scenes')
const folderArg = args.find((arg) => !arg.startsWith('--'))

if (!folderArg) {
  console.error('Usage: npm run import-villa -- <villa-folder> [--replace-scenes]')
  process.exit(1)
}

if (!url || !url.startsWith('http')) {
  console.error('Set VITE_SUPABASE_URL in .env.')
  process.exit(1)
}

if (!serviceKey) {
  console.error(
    'Set SUPABASE_SERVICE_ROLE_KEY in .env to upload panoramas. Dashboard → Project Settings → API → service_role. Never prefix it with VITE_.',
  )
  process.exit(1)
}

const folder = resolve(process.cwd(), folderArg)
const folderName = basename(folder)
const slug = folderName
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
const folderTitle = folderName.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()

const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function exists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function readScenes(): Promise<ExportScene[]> {
  const settings = join(folder, 'export', 'scenes-with-settings.json')
  const catalog = join(folder, 'public', 'scenes.json')
  const path = (await exists(settings)) ? settings : catalog
  if (!(await exists(path))) {
    throw new Error(`No scenes file in ${folder}`)
  }
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${path} is not a scene list`)
  return parsed as ExportScene[]
}

function contentType(filename: string) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.png')) return 'image/png'
  return 'image/jpeg'
}

async function upload(absolutePath: string, storagePath: string) {
  const bytes = await readFile(absolutePath)
  const { error } = await supabase.storage.from('cms-media').upload(storagePath, bytes, {
    contentType: contentType(absolutePath),
    upsert: true,
    cacheControl: '31536000',
  })
  if (error) throw new Error(`${storagePath}: ${error.message}`)
  const { data } = supabase.storage.from('cms-media').getPublicUrl(storagePath)
  const { error: rowError } = await supabase.from('cms_media').upsert(
    {
      storage_path: storagePath,
      public_url: data.publicUrl,
      folder: `tours/${slug}`,
      original_filename: basename(absolutePath),
      mime_type: contentType(absolutePath),
      file_size_bytes: bytes.byteLength,
      kind: 'image',
    },
    { onConflict: 'storage_path' },
  )
  if (rowError) throw new Error(rowError.message)
  return data.publicUrl
}

const scenes = await readScenes()
console.log(`Importing ${scenes.length} views for ${folderTitle} (${slug})`)

type Prepared = {
  sourceKey: string
  title: string
  zone: string
  grade: 'daylight' | 'interior' | 'sunset'
  imageUrl: string
  thumbUrl: string
  active: boolean
  capture: string | null
  sortOrder: number
}

const prepared: Prepared[] = []
for (let index = 0; index < scenes.length; index += 1) {
  const scene = scenes[index]
  if (!scene.image || !scene.thumb) throw new Error(`Scene ${index} is missing image paths`)
  const imagePath = join(folder, 'public', scene.image)
  const thumbPath = join(folder, 'public', scene.thumb)
  if (!(await exists(imagePath)) || !(await exists(thumbPath))) {
    throw new Error(`Missing files for ${scene.image}`)
  }
  const sourceKey = basename(scene.image)
  const imageUrl = await upload(imagePath, `tours/${slug}/panoramas/${sourceKey}`)
  const thumbUrl = await upload(thumbPath, `tours/${slug}/thumbs/${basename(scene.thumb)}`)
  const grade = GRADES.has(scene.grade ?? '') ? (scene.grade as Prepared['grade']) : 'interior'
  prepared.push({
    sourceKey,
    title: (scene.title || `View ${index + 1}`).trim().slice(0, 120),
    zone: (scene.zone || 'Interior').trim() || 'Interior',
    grade,
    imageUrl,
    thumbUrl,
    active: scene.active !== false,
    capture: scene.capture == null ? null : String(scene.capture),
    sortOrder: index,
  })
  if ((index + 1) % 5 === 0 || index === scenes.length - 1) {
    console.log(`Uploaded ${index + 1}/${scenes.length}`)
  }
}

const { data: existing } = await supabase
  .from('virtual_tours')
  .select('id')
  .eq('slug', slug)
  .maybeSingle()

let tourId = existing?.id
if (!tourId) {
  const { count } = await supabase.from('virtual_tours').select('id', { count: 'exact', head: true })
  const { data, error } = await supabase
    .from('virtual_tours')
    .insert({
      slug,
      title: folderTitle,
      summary: null,
      published: true,
      sort_order: count ?? 0,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message || 'Could not create the villa')
  tourId = data.id
  console.log(`Created villa ${folderTitle}`)
} else {
  console.log(`Updating existing villa ${slug}`)
}

const { data: existingScenes, error: sceneReadError } = await supabase
  .from('virtual_tour_scenes')
  .select('id, source_key')
  .eq('tour_id', tourId)
if (sceneReadError) throw new Error(sceneReadError.message)
const byKey = new Map((existingScenes ?? []).map((row) => [row.source_key, row.id]))

for (const scene of prepared) {
  const existingId = byKey.get(scene.sourceKey)
  if (!existingId) {
    const { error } = await supabase.from('virtual_tour_scenes').insert({
      tour_id: tourId,
      source_key: scene.sourceKey,
      title: scene.title,
      zone: scene.zone,
      grade: scene.grade,
      image_url: scene.imageUrl,
      thumb_url: scene.thumbUrl,
      active: scene.active,
      capture: scene.capture,
      sort_order: scene.sortOrder,
    })
    if (error) throw new Error(error.message)
    continue
  }
  const { error } = await supabase
    .from('virtual_tour_scenes')
    .update(
      replaceScenes
        ? {
            title: scene.title,
            zone: scene.zone,
            grade: scene.grade,
            image_url: scene.imageUrl,
            thumb_url: scene.thumbUrl,
            active: scene.active,
            capture: scene.capture,
            sort_order: scene.sortOrder,
          }
        : {
            zone: scene.zone,
            grade: scene.grade,
            image_url: scene.imageUrl,
            thumb_url: scene.thumbUrl,
            capture: scene.capture,
          },
    )
    .eq('id', existingId)
  if (error) throw new Error(error.message)
}

console.log(`Done. ${prepared.length} views for /tours/${slug}`)
