export type TourSceneView = {
  title: string
  zone: string
  grade: string
  image: string
  thumb: string
  capture: string
}

const GRADES = ['daylight', 'interior', 'sunset'] as const
const DEHAZE = 0.28
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

export function mountTourViewer(
  root: HTMLElement,
  options: { title: string; scenes: TourSceneView[] },
): () => void {
  const scenes = options.scenes
  root.replaceChildren()

  const canvas = document.createElement('canvas')
  canvas.id = 'view'
  canvas.setAttribute('aria-label', `Interactive 360 degree ${options.title} panorama`)

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
  const galleryButton = document.createElement('button')
  galleryButton.id = 'gallery'
  galleryButton.type = 'button'
  galleryButton.setAttribute('aria-expanded', 'false')
  galleryButton.textContent = 'Explore views'
  const allVillas = document.createElement('a')
  allVillas.href = '/tours'
  allVillas.textContent = 'All villas'
  const fullButton = document.createElement('button')
  fullButton.id = 'full'
  fullButton.type = 'button'
  fullButton.textContent = 'Fullscreen'
  tools.append(galleryButton, allVillas, fullButton)
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
  hint.innerHTML =
    '<span class="hint-orb" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18"/><ellipse cx="24" cy="24" rx="8" ry="18"/><ellipse cx="24" cy="24" rx="18" ry="7"/><path d="M6 24h36M24 6v36"/></svg></span><span class="hint-copy"><strong class="hint-desktop">Drag to look around</strong><strong class="hint-mobile">Swipe to look around</strong><span class="hint-desktop">Scroll to zoom</span><span class="hint-mobile">Use + and − to zoom</span></span>'

  const controls = document.createElement('nav')
  controls.className = 'controls'
  controls.setAttribute('aria-label', 'Tour controls')
  const prev = button('prev', 'Previous view')
  const zoomOut = button('out', '−', 'Zoom out')
  const reset = button('reset', '↺', 'Reset direction')
  const zoomIn = button('in', '+', 'Zoom in')
  const next = button('next', 'Next view')
  controls.append(prev, zoomOut, reset, zoomIn, next)

  const panel = document.createElement('aside')
  panel.id = 'panel'
  panel.hidden = true
  const panelHead = document.createElement('div')
  panelHead.className = 'panelhead'
  const panelCopy = document.createElement('div')
  const panelTitle = document.createElement('h2')
  panelTitle.textContent = `Explore ${options.title}`
  const panelMeta = document.createElement('p')
  panelMeta.textContent = `${scenes.length} viewpoints · Capture sequence`
  panelCopy.append(panelTitle, panelMeta)
  const close = button('close', '✕', 'Close views')
  panelHead.append(panelCopy, close)
  const views = document.createElement('div')
  views.id = 'views'
  panel.append(panelHead, views)

  root.append(canvas, header, loading, errorBox, location, hint, controls, panel)

  let yaw = 0
  let pitch = 0
  let fov = 110
  let current = 0
  let request = 0
  let textureReady = false
  const viewButtons: HTMLButtonElement[] = []

  function fail(message: string) {
    errorBox.textContent = message
    errorBox.hidden = false
    loading.hidden = true
  }

  function label(index: number): [string, string] {
    const scene = scenes[index]
    return [scene?.zone || 'Exterior', scene?.title || 'View']
  }

  function showPanel(show: boolean) {
    panel.hidden = !show
    galleryButton.setAttribute('aria-expanded', String(show))
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
    viewButtons.forEach((item, buttonIndex) => {
      const selected = buttonIndex === index
      item.classList.toggle('active', selected)
      if (selected) item.setAttribute('aria-current', 'true')
      else item.removeAttribute('aria-current')
    })
    const url = `${window.location.pathname}${window.location.search}#view=${index + 1}`
    window.history.replaceState(null, '', url)
  }

  scenes.forEach((scene, index) => {
    const item = document.createElement('button')
    item.type = 'button'
    const image = document.createElement('img')
    image.src = scene.thumb
    image.alt = ''
    image.loading = 'lazy'
    const caption = document.createElement('span')
    caption.textContent = `${index + 1}. ${label(index)[1]}`
    item.append(image, caption)
    item.onclick = () => {
      load(index)
      showPanel(false)
    }
    views.append(item)
    viewButtons.push(item)
  })

  let draw = () => {}
  let load = (index: number) => {
    if (!scenes.length) return
    current = Math.max(0, Math.min(scenes.length - 1, index))
    remember(current)
  }

  const gl = canvas.getContext('webgl', { alpha: false })
  try {
    if (!gl) mountFallback()
    else mountWebGl(gl)
  } catch {
    fail('This browser cannot display panoramas. Please try Chrome or Safari.')
  }

  galleryButton.onclick = () => showPanel(panel.hidden)
  close.onclick = () => showPanel(false)
  prev.onclick = () => load(current - 1)
  next.onclick = () => load(current + 1)
  zoomIn.onclick = () => {
    fov = Math.max(40, fov - 10)
    draw()
  }
  zoomOut.onclick = () => {
    fov = Math.min(110, fov + 10)
    draw()
  }
  reset.onclick = () => {
    yaw = 0
    pitch = 0
    fov = 110
    draw()
  }
  fullButton.onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await root.requestFullscreen()
    } catch {
      fullButton.textContent = 'Fullscreen unavailable'
    }
  }

  let drag: [number, number] | null = null
  const onPointerDown = (event: PointerEvent) => {
    drag = [event.clientX, event.clientY]
    canvas.setPointerCapture(event.pointerId)
    hint.style.opacity = '0'
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!drag) return
    yaw -= (event.clientX - drag[0]) * 0.004
    pitch = Math.max(-1.45, Math.min(1.45, pitch + (event.clientY - drag[1]) * 0.004))
    drag = [event.clientX, event.clientY]
    draw()
  }
  const onPointerUp = () => {
    drag = null
  }
  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    fov = Math.max(40, Math.min(110, fov + event.deltaY * 0.04))
    draw()
  }
  const onResize = () => draw()
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') showPanel(false)
    if (!panel.hidden) return
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
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('wheel', onWheel)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKey)
    root.replaceChildren()
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

    draw = () => {
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
      context.uniform1f(uniforms.fov, (fov * Math.PI) / 180)
      context.drawArrays(context.TRIANGLES, 0, 6)
    }

    load = (index: number) => {
      if (!scenes.length) return
      const nextIndex = Math.max(0, Math.min(scenes.length - 1, index))
      const token = ++request
      loading.hidden = false
      errorBox.hidden = true
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => {
        if (token !== request) return
        try {
          context.activeTexture(context.TEXTURE0)
          context.bindTexture(context.TEXTURE_2D, texture)
          context.texImage2D(context.TEXTURE_2D, 0, context.RGB, context.RGB, context.UNSIGNED_BYTE, image)
          textureReady = true
          current = nextIndex
          yaw = 0
          pitch = 0
          fov = 110
          draw()
          loading.hidden = true
          remember(nextIndex)
        } catch {
          fail('This panorama could not load. Please try another view.')
        }
      }
      image.onerror = () => {
        if (token === request) fail('Could not load this view. Check your connection and choose another view.')
      }
      image.src = scenes[nextIndex].image
    }

    const start = Number(window.location.hash.match(/view=(\d+)/)?.[1] || 1)
    lutsReady
      .then(() => load(Math.max(0, Math.min(scenes.length - 1, start - 1))))
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
        const key = [width, height, fov].join(',')
        if (key !== lastKey) {
          lastKey = key
          canvas.width = width
          canvas.height = height
          frame = context.createImageData(width, height)
          rays = new Float32Array(width * height * 3)
          const tan = Math.tan((fov * Math.PI) / 360)
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
      loading.hidden = false
      errorBox.hidden = true
      void loadImage(scenes[nextIndex].image)
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
          yaw = 0
          pitch = 0
          fov = 110
          textureReady = true
          draw()
          loading.hidden = true
          remember(nextIndex)
        })
        .catch(() => {
          if (token === request) fail('Could not load this view. Check your connection and choose another view.')
        })
    }

    const start = Number(window.location.hash.match(/view=(\d+)/)?.[1] || 1)
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
      .then(() => load(Math.max(0, Math.min(scenes.length - 1, start - 1))))
      .catch(() => fail('The tour could not load. Please refresh to try again.'))
  }
}

function button(id: string, text: string, label?: string) {
  const element = document.createElement('button')
  element.id = id
  element.type = 'button'
  element.textContent = text
  if (label) element.setAttribute('aria-label', label)
  return element
}
