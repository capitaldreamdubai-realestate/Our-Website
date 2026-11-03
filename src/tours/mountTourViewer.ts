export type TourSceneView = {
  id?: string
  title: string
  zone: string
  grade: string
  image: string
  thumb: string
  capture: string
  initialYaw?: number | null
  initialPitch?: number | null
  initialFov?: number | null
}

export type TourStartView = { yaw: number; pitch: number; fov: number }

const GRADES = ['daylight', 'interior', 'sunset'] as const
const DEHAZE = 0.28
/** Vertical field of view in degrees. Landscape screens open at 75, portrait phones a little wider. */
const DEFAULT_FOV_LANDSCAPE = 75
const DEFAULT_FOV_PORTRAIT = 90
const MIN_FOV = 30
const MAX_FOV = 100
/** Never show more than this horizontally, so wide screens don't stretch at the edges. */
const MAX_HORIZONTAL_FOV = 120
const FADE_MS = 400
/** How long a switch may take before the loading notice appears. */
const LOADING_DELAY_MS = 250
const VERTEX = 'attribute vec2 pos; varying vec2 uv;void main(){uv=pos;gl_Position=vec4(pos,0.,1.);}'
const FRAGMENT = `precision highp float;varying vec2 uv;uniform sampler2D pano;uniform float aspect,yaw,pitch,fov,gradeEnabled,dehaze;uniform sampler2D colorLut;vec3 grade(vec3 c){float b=c.b*31.;float lo=floor(b),hi=min(lo+1.,31.);vec2 p1=vec2((lo*32.+c.r*31.+.5)/1024.,(c.g*31.+.5)/32.);vec2 p2=vec2((hi*32.+c.r*31.+.5)/1024.,(c.g*31.+.5)/32.);return mix(texture2D(colorLut,p1).rgb,texture2D(colorLut,p2).rgb,b-lo);}void main(){float t=tan(fov*.5);vec3 d=normalize(vec3(uv.x*aspect*t,uv.y*t,1.));float cp=cos(pitch),sp=sin(pitch);d=vec3(d.x,d.y*cp+d.z*sp,d.z*cp-d.y*sp);float cy=cos(yaw),sy=sin(yaw);d=vec3(d.x*cy+d.z*sy,d.y,d.z*cy-d.x*sy);vec2 p=vec2(fract(atan(d.x,d.z)/6.2831853+.5),.5-asin(clamp(d.y,-1.,1.))/3.14159265);vec3 c=texture2D(pano,p).rgb;float dark=min(c.r,min(c.g,c.b))/.96;float transmission=max(.70,1.-dehaze*dark);c=clamp((c-vec3(.96))/transmission+vec3(.96),0.,1.);float luminance=dot(c,vec3(.2126,.7152,.0722));c=clamp(mix(vec3(luminance),c,1.+dehaze*.18),0.,1.);gl_FragColor=vec4(mix(c,grade(c),gradeEnabled),1.);}`

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(src))
    image.src = src
  })
}

function gradeName(scene: TourSceneView | undefined): string {
  return GRADES.includes(scene?.grade as (typeof GRADES)[number]) ? scene!.grade : 'daylight'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function mountTourViewer(
  root: HTMLElement,
  options: {
    title: string
    scenes: TourSceneView[]
    /** Shown to signed-in editors only. Resolves true when the view was saved. */
    onSaveStartView?: (index: number, view: TourStartView) => Promise<boolean>
  },
): () => void {
  const scenes = options.scenes
  root.replaceChildren()

  const canvas = document.createElement('canvas')
  canvas.id = 'view'
  canvas.setAttribute('aria-label', `Interactive 360 degree ${options.title} panorama`)
  const fade = document.createElement('canvas')
  fade.className = 'fade'
  fade.setAttribute('aria-hidden', 'true')
  fade.hidden = true

  const header = document.createElement('header')
  const brand = document.createElement('div')
  brand.className = 'brand'
  const mark = document.createElement('img')
  mark.className = 'mark'
  mark.src = '/favicon.png'
  mark.alt = ''
  mark.setAttribute('aria-hidden', 'true')
  const brandText = document.createElement('div')
  brandText.append(document.createTextNode(options.title))
  const sub = document.createElement('span')
  sub.className = 'sub'
  sub.textContent = '360° WALKTHROUGH'
  brandText.append(sub)
  brand.append(mark, brandText)

  const tools = document.createElement('div')
  tools.className = 'tools'
  const allVillas = document.createElement('a')
  allVillas.href = '/tours'
  toolControl(
    allVillas,
    'All villas',
    toolIcon(['M4 20V11L12 5l8 6v9', 'M10 20v-6h4v6']),
  )
  const fullButton = document.createElement('button')
  fullButton.id = 'full'
  fullButton.type = 'button'
  const fullLabel = toolControl(
    fullButton,
    'Fullscreen',
    toolIcon(['M9 4H4v5', 'M15 4h5v5', 'M9 20H4v-5', 'M15 20h5v-5']),
  )
  tools.append(allVillas, fullButton)

  let saveButton: HTMLButtonElement | null = null
  let saveLabel: HTMLSpanElement | null = null
  if (options.onSaveStartView) {
    saveButton = document.createElement('button')
    saveButton.id = 'save-start'
    saveButton.type = 'button'
    saveLabel = toolControl(
      saveButton,
      'Set start view',
      toolIcon(['M12 3v4', 'M12 17v4', 'M3 12h4', 'M17 12h4', 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z']),
    )
    tools.prepend(saveButton)
  }
  header.append(brand, tools)

  const loading = document.createElement('div')
  loading.id = 'loading'
  loading.setAttribute('role', 'status')
  loading.textContent = 'Preparing your view…'
  const errorBox = document.createElement('div')
  errorBox.id = 'error'
  errorBox.setAttribute('role', 'alert')
  errorBox.hidden = true

  const location = document.createElement('section')
  location.className = 'location'
  const zoneEl = document.createElement('span')
  zoneEl.id = 'zone'
  const titleEl = document.createElement('h1')
  titleEl.id = 'title'
  titleEl.textContent = scenes[0]?.title || options.title
  const countEl = document.createElement('p')
  countEl.id = 'count'
  location.append(zoneEl, titleEl, countEl)

  const hint = document.createElement('div')
  hint.className = 'hint'
  hint.id = 'hint'
  hint.setAttribute('aria-hidden', 'true')
  hint.innerHTML =
    '<svg class="hint-icon hint-desktop" viewBox="0 0 48 32"><rect x="18" y="4" width="12" height="20" rx="6"/><path d="M24 8v4"/><path d="M12 14l-5 0M9.5 11.5 7 14l2.5 2.5"/><path d="M36 14l5 0M38.5 11.5 41 14l-2.5 2.5"/></svg>' +
    '<svg class="hint-icon hint-mobile" viewBox="0 0 48 32"><path d="M21 26v-12a2.5 2.5 0 0 1 5 0v6l5 1.2a3 3 0 0 1 2.2 3.4L32.4 28"/><path d="M11 10h-5M8.5 7.5 6 10l2.5 2.5"/><path d="M37 10h5M39.5 7.5 42 10l-2.5 2.5"/></svg>' +
    '<span class="hint-desktop">Click and drag<br>to explore</span><span class="hint-mobile">Swipe to explore</span>'

  const controls = document.createElement('nav')
  controls.className = 'controls'
  controls.setAttribute('aria-label', 'Tour controls')
  const prev = button('prev', '‹', 'Previous view')
  const zoomOut = button('out', '−', 'Zoom out')
  const reset = button('reset', '↺', 'Reset direction')
  const zoomIn = button('in', '+', 'Zoom in')
  const next = button('next', '›', 'Next view')
  const roomsToggle = button('rooms', '▾', 'Hide rooms')
  roomsToggle.setAttribute('aria-controls', 'strip')
  roomsToggle.setAttribute('aria-expanded', 'true')
  controls.append(prev, zoomOut, reset, zoomIn, next, roomsToggle)

  const strip = document.createElement('nav')
  strip.id = 'strip'
  strip.className = 'strip'
  strip.setAttribute('aria-label', 'Rooms')

  root.append(canvas, fade, header, loading, errorBox, location, hint, controls, strip)

  let yaw = 0
  let pitch = 0
  let fov = DEFAULT_FOV_LANDSCAPE
  let current = 0
  let request = 0
  let textureReady = false
  let loadingTimer = 0
  const stripButtons: HTMLButtonElement[] = []

  /** Decoded panoramas for the current view and its neighbours, so switching is instant. */
  const imageCache = new Map<string, Promise<HTMLImageElement>>()
  function cachedImage(src: string) {
    let image = imageCache.get(src)
    if (!image) {
      image = loadImage(src)
      image.catch(() => imageCache.delete(src))
      imageCache.set(src, image)
    }
    return image
  }
  function preloadAround(index: number) {
    const keep = new Set<string>()
    for (const offset of [0, 1, -1, 2]) {
      const scene = scenes[index + offset]
      if (!scene) continue
      keep.add(scene.image)
      void cachedImage(scene.image).catch(() => {})
    }
    for (const src of imageCache.keys()) if (!keep.has(src)) imageCache.delete(src)
  }

  function aspect() {
    return root.clientHeight ? root.clientWidth / root.clientHeight : 1
  }
  function defaultFov() {
    return aspect() < 1 ? DEFAULT_FOV_PORTRAIT : DEFAULT_FOV_LANDSCAPE
  }
  /** Vertical FOV actually rendered: the chosen zoom, capped so the horizontal span stays natural. */
  function effectiveFov() {
    const capped = (2 * Math.atan(Math.tan((MAX_HORIZONTAL_FOV * Math.PI) / 360) / aspect()) * 180) / Math.PI
    return Math.min(fov, capped)
  }
  function setFov(value: number) {
    fov = clamp(value, MIN_FOV, MAX_FOV)
    // Zooming out past the horizontal cap does nothing visible; keep fov at the cap so zoom-in responds at once.
    fov = Math.min(fov, Math.max(MIN_FOV, effectiveFov()))
  }
  function applyStart(index: number) {
    const scene = scenes[index]
    yaw = scene?.initialYaw ?? 0
    pitch = scene?.initialPitch ?? 0
    setFov(scene?.initialFov ?? defaultFov())
  }

  function fail(message: string) {
    window.clearTimeout(loadingTimer)
    errorBox.textContent = message
    errorBox.hidden = false
    loading.hidden = true
  }

  function beginLoading(token: number) {
    window.clearTimeout(loadingTimer)
    errorBox.hidden = true
    loadingTimer = window.setTimeout(() => {
      if (token === request) loading.hidden = false
    }, LOADING_DELAY_MS)
  }

  function endLoading() {
    window.clearTimeout(loadingTimer)
    loading.hidden = true
  }

  function label(index: number): [string, string] {
    const scene = scenes[index]
    return [scene?.zone || 'Exterior', scene?.title || 'View']
  }

  // Keep the controls sitting just above the strip, whatever its rendered height.
  const stripSize = new ResizeObserver(() => {
    root.style.setProperty('--strip-open-height', `${strip.offsetHeight}px`)
  })
  stripSize.observe(strip)

  let roomsHidden = false
  function showRooms(show: boolean) {
    roomsHidden = !show
    root.classList.toggle('strip-hidden', !show)
    roomsToggle.textContent = show ? '▾' : '▴'
    roomsToggle.setAttribute('aria-label', show ? 'Hide rooms' : 'Show rooms')
    roomsToggle.setAttribute('aria-expanded', String(show))
    if (show) stripButtons[current]?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }

  function remember(index: number) {
    const [zone, title] = label(index)
    zoneEl.textContent = zone.toUpperCase()
    titleEl.textContent = title
    const capture = scenes[index]?.capture
    countEl.textContent = capture
      ? `View ${index + 1} of ${scenes.length} · Capture ${capture}`
      : `View ${index + 1} of ${scenes.length}`
    prev.disabled = index === 0
    next.disabled = index === scenes.length - 1
    stripButtons.forEach((item, buttonIndex) => {
      const selected = buttonIndex === index
      item.classList.toggle('active', selected)
      if (selected) item.setAttribute('aria-current', 'true')
      else item.removeAttribute('aria-current')
    })
    if (!roomsHidden) {
      stripButtons[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
    const url = `${window.location.pathname}${window.location.search}#view=${index + 1}`
    window.history.replaceState(null, '', url)
  }

  function thumbButton(index: number, captionText: string) {
    const scene = scenes[index]
    const item = document.createElement('button')
    item.type = 'button'
    const image = document.createElement('img')
    image.src = scene.thumb
    image.alt = ''
    image.loading = 'lazy'
    const caption = document.createElement('span')
    caption.textContent = captionText
    item.append(image, caption)
    return item
  }

  let lastZone = ''
  scenes.forEach((_scene, index) => {
    const zone = label(index)[0]
    if (zone !== lastZone) {
      lastZone = zone
      const zoneLabel = document.createElement('span')
      zoneLabel.className = 'strip-zone'
      zoneLabel.textContent = zone
      strip.append(zoneLabel)
    }
    const thumb = thumbButton(index, label(index)[1])
    thumb.className = 'strip-thumb'
    thumb.setAttribute('aria-label', `${index + 1}. ${zone}: ${label(index)[1]}`)
    thumb.onclick = () => load(index)
    strip.append(thumb)
    stripButtons.push(thumb)
  })

  let draw = () => {}
  let load = (index: number) => {
    if (!scenes.length) return
    current = clamp(index, 0, scenes.length - 1)
    remember(current)
  }

  const gl = canvas.getContext('webgl', { alpha: false })
  try {
    if (!gl) mountFallback()
    else mountWebGl(gl)
  } catch {
    fail('This browser cannot display panoramas. Please try Chrome or Safari.')
  }

  prev.onclick = () => load(current - 1)
  next.onclick = () => load(current + 1)
  roomsToggle.onclick = () => showRooms(roomsHidden)
  zoomIn.onclick = () => {
    setFov(fov - 10)
    draw()
  }
  zoomOut.onclick = () => {
    setFov(fov + 10)
    draw()
  }
  reset.onclick = () => {
    applyStart(current)
    draw()
  }
  fullButton.onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await root.requestFullscreen()
    } catch {
      fullLabel.textContent = 'Fullscreen unavailable'
      fullButton.title = 'Fullscreen unavailable'
    }
  }
  let saveTimer = 0
  if (saveButton && saveLabel && options.onSaveStartView) {
    const save = options.onSaveStartView
    const saveText = saveLabel
    saveButton.onclick = async () => {
      const index = current
      const view = {
        yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)),
        pitch,
        fov: Math.round(fov),
      }
      saveText.textContent = 'Saving…'
      const ok = await save(index, view).catch(() => false)
      if (ok) {
        scenes[index].initialYaw = view.yaw
        scenes[index].initialPitch = view.pitch
        scenes[index].initialFov = view.fov
      }
      saveText.textContent = ok ? 'Start view saved' : 'Could not save'
      window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(() => {
        saveText.textContent = 'Set start view'
      }, 2500)
    }
  }

  const hintTimer = window.setTimeout(hideHint, 6000)
  function hideHint() {
    window.clearTimeout(hintTimer)
    hint.style.opacity = '0'
  }

  // One finger or mouse drags the view; two fingers pinch to zoom.
  const pointers = new Map<number, { x: number; y: number }>()
  let pinch: { distance: number; fov: number } | null = null
  let stripTimer = 0
  function pointerDistance() {
    const [a, b] = [...pointers.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  const onPointerDown = (event: PointerEvent) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    canvas.setPointerCapture(event.pointerId)
    hideHint()
    window.clearTimeout(stripTimer)
    root.classList.add('dragging')
    if (pointers.size === 2) pinch = { distance: pointerDistance(), fov }
  }
  const onPointerMove = (event: PointerEvent) => {
    const last = pointers.get(event.pointerId)
    if (!last) return
    const dx = event.clientX - last.x
    const dy = event.clientY - last.y
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size >= 2) {
      if (!pinch) return
      const distance = pointerDistance()
      if (distance > 0) setFov((pinch.fov * pinch.distance) / distance)
    } else {
      // Move the panorama at the same speed as the finger, whatever the zoom.
      const radiansPerPixel = ((effectiveFov() * Math.PI) / 180) / Math.max(1, root.clientHeight)
      yaw -= dx * radiansPerPixel
      pitch = clamp(pitch + dy * radiansPerPixel, -1.45, 1.45)
    }
    draw()
  }
  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId)
    if (pointers.size < 2) pinch = null
    if (pointers.size === 0) {
      window.clearTimeout(stripTimer)
      stripTimer = window.setTimeout(() => root.classList.remove('dragging'), 600)
    }
  }
  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    setFov(fov + event.deltaY * 0.04)
    draw()
  }
  const onResize = () => {
    setFov(fov)
    draw()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLElement && event.target.tagName === 'BUTTON') return
    if (event.key === 'ArrowLeft') yaw -= 0.1
    if (event.key === 'ArrowRight') yaw += 0.1
    if (event.key === 'ArrowUp') pitch = Math.min(1.45, pitch + 0.1)
    if (event.key === 'ArrowDown') pitch = Math.max(-1.45, pitch - 0.1)
    draw()
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKey)

  if (!scenes.length) fail('This villa has no active views.')

  return () => {
    window.clearTimeout(loadingTimer)
    window.clearTimeout(stripTimer)
    window.clearTimeout(saveTimer)
    window.clearTimeout(hintTimer)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('wheel', onWheel)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKey)
    stripSize.disconnect()
    imageCache.clear()
    root.style.removeProperty('--strip-open-height')
    root.replaceChildren()
  }

  function startIndex() {
    const start = Number(window.location.hash.match(/view=(\d+)/)?.[1] || 1)
    return clamp(start - 1, 0, Math.max(0, scenes.length - 1))
  }

  function mountWebGl(context: WebGLRenderingContext) {
    function shader(type: number, source: string) {
      const item = context.createShader(type)
      if (!item) throw new Error('Viewer failed to initialize')
      context.shaderSource(item, source)
      context.compileShader(item)
      if (!context.getShaderParameter(item, context.COMPILE_STATUS)) {
        throw new Error(context.getShaderInfoLog(item) || 'Viewer failed to initialize')
      }
      return item
    }

    const program = context.createProgram()
    if (!program) {
      fail('This browser cannot display panoramas. Please try Chrome or Safari.')
      return
    }
    context.attachShader(program, shader(context.VERTEX_SHADER, VERTEX))
    context.attachShader(program, shader(context.FRAGMENT_SHADER, FRAGMENT))
    context.linkProgram(program)
    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      fail('This browser cannot display panoramas. Please try Chrome or Safari.')
      return
    }
    context.useProgram(program)
    const buffer = context.createBuffer()
    context.bindBuffer(context.ARRAY_BUFFER, buffer)
    context.bufferData(
      context.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      context.STATIC_DRAW,
    )
    const position = context.getAttribLocation(program, 'pos')
    context.enableVertexAttribArray(position)
    context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0)
    const uniforms = {
      aspect: context.getUniformLocation(program, 'aspect'),
      yaw: context.getUniformLocation(program, 'yaw'),
      pitch: context.getUniformLocation(program, 'pitch'),
      fov: context.getUniformLocation(program, 'fov'),
      gradeEnabled: context.getUniformLocation(program, 'gradeEnabled'),
      dehaze: context.getUniformLocation(program, 'dehaze'),
    }
    const texture = context.createTexture()
    context.bindTexture(context.TEXTURE_2D, texture)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.REPEAT)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
    const luts: Record<string, WebGLTexture> = {}
    context.uniform1i(context.getUniformLocation(program, 'pano'), 0)
    context.uniform1i(context.getUniformLocation(program, 'colorLut'), 1)

    const lutsReady = Promise.all(
      GRADES.map(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const image = new Image()
            image.onload = () => {
              const lut = context.createTexture()
              if (!lut) {
                reject(new Error(name))
                return
              }
              context.activeTexture(context.TEXTURE1)
              context.bindTexture(context.TEXTURE_2D, lut)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
              context.texImage2D(context.TEXTURE_2D, 0, context.RGB, context.RGB, context.UNSIGNED_BYTE, image)
              luts[name] = lut
              context.activeTexture(context.TEXTURE0)
              resolve()
            }
            image.onerror = () => reject(new Error(name))
            image.src = `/tours/grades/${name}.png`
          }),
      ),
    )

    function render() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.round(root.clientWidth * ratio)
      const height = Math.round(root.clientHeight * ratio)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        context.viewport(0, 0, width, height)
      }
      if (!textureReady || width === 0 || height === 0) return
      const lut = luts[gradeName(scenes[current])] ?? luts.daylight
      if (!lut) return
      context.activeTexture(context.TEXTURE1)
      context.bindTexture(context.TEXTURE_2D, lut)
      context.activeTexture(context.TEXTURE0)
      context.uniform1f(uniforms.gradeEnabled, 1)
      context.uniform1f(uniforms.dehaze, DEHAZE)
      context.uniform1f(uniforms.aspect, width / height)
      context.uniform1f(uniforms.yaw, yaw)
      context.uniform1f(uniforms.pitch, pitch)
      context.uniform1f(uniforms.fov, (effectiveFov() * Math.PI) / 180)
      context.drawArrays(context.TRIANGLES, 0, 6)
    }

    let frame = 0
    draw = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        render()
      })
    }

    const fadeContext = fade.getContext('2d')
    /** Freeze the outgoing view on top so the next one can fade in underneath. */
    function holdFrame() {
      if (!fadeContext || !textureReady) return false
      window.clearTimeout(fadeTimer)
      render()
      fade.width = canvas.width
      fade.height = canvas.height
      fadeContext.drawImage(canvas, 0, 0)
      fade.style.transition = 'none'
      fade.style.opacity = '1'
      fade.hidden = false
      return true
    }
    let fadeTimer = 0
    function releaseFrame() {
      requestAnimationFrame(() => {
        fade.style.transition = `opacity ${FADE_MS}ms ease`
        fade.style.opacity = '0'
      })
      // A timer rather than transitionend, which never fires in a background tab.
      window.clearTimeout(fadeTimer)
      fadeTimer = window.setTimeout(() => {
        fade.hidden = true
      }, FADE_MS + 100)
    }

    load = (index: number) => {
      if (!scenes.length) return
      const nextIndex = clamp(index, 0, scenes.length - 1)
      const token = ++request
      beginLoading(token)
      cachedImage(scenes[nextIndex].image)
        .then((image) => {
          if (token !== request) return
          const fading = holdFrame()
          try {
            context.activeTexture(context.TEXTURE0)
            context.bindTexture(context.TEXTURE_2D, texture)
            context.texImage2D(context.TEXTURE_2D, 0, context.RGB, context.RGB, context.UNSIGNED_BYTE, image)
          } catch {
            fail('This panorama could not load. Please try another view.')
            return
          }
          textureReady = true
          current = nextIndex
          applyStart(nextIndex)
          render()
          endLoading()
          remember(nextIndex)
          if (fading) releaseFrame()
          preloadAround(nextIndex)
        })
        .catch(() => {
          if (token === request) fail('Could not load this view. Check your connection and choose another view.')
        })
    }

    const start = startIndex()
    preloadAround(start)
    lutsReady
      .then(() => load(start))
      .catch(() => fail('The tour could not load. Please refresh to try again.'))
  }

  function mountFallback() {
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      fail('This browser cannot display panoramas. Please try Chrome or Safari.')
      return
    }
    let pixels: Uint8ClampedArray | null = null
    let gradePixels: Uint8ClampedArray | null = null
    const sourceWidth = 2048
    const sourceHeight = 1024
    let frame: ImageData | null = null
    let rays: Float32Array | null = null
    let lastKey = ''
    let scheduled = false
    const lutData: Record<string, Uint8ClampedArray> = {}

    function colourPixels(source: Uint8ClampedArray, lut: Uint8ClampedArray, strength = 0) {
      const destination = new Uint8ClampedArray(source.length)
      for (let i = 0; i < source.length; i += 4) {
        let red = source[i] / 255
        let green = source[i + 1] / 255
        let blue = source[i + 2] / 255
        if (strength) {
          const transmission = Math.max(0.7, 1 - (strength * Math.min(red, green, blue)) / 0.96)
          red = Math.max(0, Math.min(1, (red - 0.96) / transmission + 0.96))
          green = Math.max(0, Math.min(1, (green - 0.96) / transmission + 0.96))
          blue = Math.max(0, Math.min(1, (blue - 0.96) / transmission + 0.96))
          const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
          red = Math.max(0, Math.min(1, luminance + (red - luminance) * (1 + strength * 0.18)))
          green = Math.max(0, Math.min(1, luminance + (green - luminance) * (1 + strength * 0.18)))
          blue = Math.max(0, Math.min(1, luminance + (blue - luminance) * (1 + strength * 0.18)))
        }
        const r = red * 31
        const g = green * 31
        const b = blue * 31
        const r0 = Math.floor(r)
        const g0 = Math.floor(g)
        const b0 = Math.floor(b)
        const dr = r - r0
        const dg = g - g0
        const db = b - b0
        let rr = 0
        let gg = 0
        let bb = 0
        for (let z = 0; z < 2; z += 1) {
          for (let y = 0; y < 2; y += 1) {
            for (let x = 0; x < 2; x += 1) {
              const weight = (x ? dr : 1 - dr) * (y ? dg : 1 - dg) * (z ? db : 1 - db)
              const idx =
                (Math.min(g0 + y, 31) * 1024 + Math.min(b0 + z, 31) * 32 + Math.min(r0 + x, 31)) * 4
              rr += lut[idx] * weight
              gg += lut[idx + 1] * weight
              bb += lut[idx + 2] * weight
            }
          }
        }
        destination[i] = rr
        destination[i + 1] = gg
        destination[i + 2] = bb
        destination[i + 3] = 255
      }
      return destination
    }

    draw = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        if (!pixels || !gradePixels) return
        const width = Math.min(800, root.clientWidth)
        const height = Math.round((width * root.clientHeight) / root.clientWidth)
        const viewFov = effectiveFov()
        const key = [width, height, viewFov].join(',')
        if (key !== lastKey) {
          lastKey = key
          canvas.width = width
          canvas.height = height
          frame = context.createImageData(width, height)
          rays = new Float32Array(width * height * 3)
          const tan = Math.tan((viewFov * Math.PI) / 360)
          const aspect = width / height
          let offset = 0
          for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
              const dx = ((x + 0.5) / width * 2 - 1) * aspect * tan
              const dy = (1 - (y + 0.5) / height * 2) * tan
              const len = Math.sqrt(dx * dx + dy * dy + 1)
              rays[offset] = dx / len
              rays[offset + 1] = dy / len
              rays[offset + 2] = 1 / len
              offset += 3
            }
          }
        }
        if (!frame || !rays) return
        const cy = Math.cos(yaw)
        const sy = Math.sin(yaw)
        const cp = Math.cos(pitch)
        const sp = Math.sin(pitch)
        const source = gradePixels
        const destination = frame.data
        let offset = 0
        for (let p = 0; p < destination.length; p += 4) {
          const x = rays[offset]
          const y = rays[offset + 1]
          const z = rays[offset + 2]
          offset += 3
          const yy = y * cp + z * sp
          const zz = z * cp - y * sp
          const xx = x * cy + zz * sy
          const zz2 = zz * cy - x * sy
          const u = (((Math.atan2(xx, zz2) / (2 * Math.PI) + 0.5) * sourceWidth) + sourceWidth) % sourceWidth
          const v = Math.max(
            0,
            Math.min(sourceHeight - 1, (0.5 - Math.asin(Math.max(-1, Math.min(1, yy))) / Math.PI) * sourceHeight),
          )
          const ix = Math.floor(u)
          const iy = Math.floor(v)
          const fx = u - ix
          const fy = v - iy
          const ix2 = (ix + 1) % sourceWidth
          const iy2 = Math.min(iy + 1, sourceHeight - 1)
          for (let channel = 0; channel < 3; channel += 1) {
            destination[p + channel] =
              (source[(iy * sourceWidth + ix) * 4 + channel] * (1 - fx) +
                source[(iy * sourceWidth + ix2) * 4 + channel] * fx) *
                (1 - fy) +
              (source[(iy2 * sourceWidth + ix) * 4 + channel] * (1 - fx) +
                source[(iy2 * sourceWidth + ix2) * 4 + channel] * fx) *
                fy
          }
          destination[p + 3] = 255
        }
        context.putImageData(frame, 0, 0)
      })
    }

    load = (index: number) => {
      if (!scenes.length) return
      const nextIndex = Math.max(0, Math.min(scenes.length - 1, index))
      const token = ++request
      beginLoading(token)
      void cachedImage(scenes[nextIndex].image)
        .then((image) => {
          if (token !== request) return
          const scratch = document.createElement('canvas')
          scratch.width = sourceWidth
          scratch.height = sourceHeight
          const scratchContext = scratch.getContext('2d')
          if (!scratchContext) throw new Error('canvas')
          scratchContext.drawImage(image, 0, 0, sourceWidth, sourceHeight)
          pixels = scratchContext.getImageData(0, 0, sourceWidth, sourceHeight).data
          const lut = lutData[gradeName(scenes[nextIndex])] ?? lutData.daylight
          gradePixels = lut ? colourPixels(pixels, lut, DEHAZE) : pixels
          current = nextIndex
          applyStart(nextIndex)
          textureReady = true
          draw()
          endLoading()
          remember(nextIndex)
          preloadAround(nextIndex)
        })
        .catch(() => {
          if (token === request) fail('Could not load this view. Check your connection and choose another view.')
        })
    }

    const start = startIndex()
    preloadAround(start)
    void Promise.all(
      GRADES.map(async (name) => {
        const image = await loadImage(`/tours/grades/${name}.png`)
        const scratch = document.createElement('canvas')
        scratch.width = 1024
        scratch.height = 32
        const scratchContext = scratch.getContext('2d')
        if (!scratchContext) throw new Error(name)
        scratchContext.drawImage(image, 0, 0)
        lutData[name] = scratchContext.getImageData(0, 0, 1024, 32).data
      }),
    )
      .then(() => load(start))
      .catch(() => fail('The tour could not load. Please refresh to try again.'))
  }
}

function toolIcon(paths: string[]) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.classList.add('tool-icon')
  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '1.75')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    svg.append(path)
  }
  return svg
}

function toolControl(element: HTMLElement, label: string, icon: SVGElement) {
  const text = document.createElement('span')
  text.className = 'tool-label'
  text.textContent = label
  element.append(icon, text)
  return text
}

function button(id: string, text: string, label?: string) {
  const element = document.createElement('button')
  element.id = id
  element.type = 'button'
  element.textContent = text
  if (label) element.setAttribute('aria-label', label)
  return element
}
