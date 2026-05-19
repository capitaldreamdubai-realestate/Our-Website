import { Globe, MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaYoutube } from 'react-icons/fa6'
import { useCms } from '@/contexts/CmsContext'
import type { FloatingSocialPlatform } from '@/lib/socialFloatingLinks'
import { whatsappHref } from '../lib/whatsapp'

const COMPANY_WHATSAPP = '+971 50 108 3541'

export function FloatingWhatsappButton() {
  const { siteSettings } = useCms()
  const [socialOpen, setSocialOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const href = whatsappHref(COMPANY_WHATSAPP)
  if (!href) return null
  const socialLinks = siteSettings.floatingSocialLinks

  useEffect(() => {
    if (!socialOpen) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (containerRef.current?.contains(target)) return
      setSocialOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSocialOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [socialOpen])

  function iconFor(platform: FloatingSocialPlatform) {
    if (platform === 'instagram') return <FaInstagram className="text-[17px]" />
    if (platform === 'tiktok') return <FaTiktok className="text-[16px]" />
    if (platform === 'linkedin') return <FaLinkedinIn className="text-[16px]" />
    if (platform === 'facebook') return <FaFacebookF className="text-[16px]" />
    if (platform === 'youtube') return <FaYoutube className="text-[16px]" />
    return <Globe className="size-[18px]" strokeWidth={2} />
  }

  function platformButtonClass(platform: FloatingSocialPlatform) {
    if (platform === 'instagram') return 'bg-[#E4405F] hover:bg-[#d63a57]'
    if (platform === 'tiktok') return 'bg-[#111111] hover:bg-black'
    if (platform === 'linkedin') return 'bg-[#0A66C2] hover:bg-[#0959a9]'
    if (platform === 'facebook') return 'bg-[#1877F2] hover:bg-[#166fe1]'
    if (platform === 'youtube') return 'bg-[#FF0000] hover:bg-[#e00000]'
    return 'bg-[#155AA8] hover:bg-[#124c8b]'
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 right-5 z-[120] flex flex-col items-center gap-3 sm:bottom-6 sm:right-6"
    >
      {socialLinks.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <div
            className={`flex w-[3.7rem] flex-col items-center gap-2 overflow-hidden rounded-[1.9rem] bg-white px-2.5 shadow-lg shadow-black/20 transition-all duration-300 ${
              socialOpen ? 'max-h-96 py-3 opacity-100' : 'max-h-0 py-0 opacity-0'
            }`}
            aria-hidden={!socialOpen}
          >
            {socialLinks.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${item.platform}`}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-[transform,background-color] duration-300 ease-out hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155AA8]/50 ${platformButtonClass(
                  item.platform,
                )}`}
              >
                {iconFor(item.platform)}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSocialOpen((v) => !v)}
            aria-expanded={socialOpen}
            aria-label={socialOpen ? 'Hide social links' : 'Show social links'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#155AA8] shadow-lg shadow-black/20 transition-[transform,background-color,color] duration-300 ease-out hover:scale-105 hover:bg-[#155AA8] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155AA8]/40"
          >
            <span className="text-xl font-semibold leading-none">@</span>
          </button>
        </div>
      ) : null}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="group relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-[transform,background-color] duration-300 ease-out hover:scale-105 hover:bg-[#1ebe5d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366]/60 animate-ping"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -inset-1 rounded-full border border-[#25D366]/35"
          aria-hidden
        />
        <MessageCircle className="relative z-10 size-7" strokeWidth={2.2} />
      </a>
    </div>
  )
}
