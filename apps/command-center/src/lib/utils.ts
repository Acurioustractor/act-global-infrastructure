import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffInDays = Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays}d ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mo ago`
  return `${Math.floor(diffInDays / 365)}y ago`
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getTemperatureColor(temperature: unknown): string {
  if (!temperature || typeof temperature !== 'string') return 'text-blue-400'
  switch (temperature.toLowerCase()) {
    case 'hot':
      return 'text-red-400'
    case 'warm':
      return 'text-orange-400'
    case 'cool':
    default:
      return 'text-blue-400'
  }
}

export function getTemperatureBg(temperature: unknown): string {
  if (!temperature || typeof temperature !== 'string') return 'bg-blue-500/20'
  switch (temperature.toLowerCase()) {
    case 'hot':
      return 'bg-red-500/20'
    case 'warm':
      return 'bg-orange-500/20'
    case 'cool':
    default:
      return 'bg-blue-500/20'
  }
}

export function getLCAAColor(stage: string): string {
  switch (stage?.toLowerCase()) {
    case 'listen':
      return 'text-listen-400'
    case 'curiosity':
      return 'text-curiosity-400'
    case 'action':
      return 'text-action-400'
    case 'art':
      return 'text-art-400'
    default:
      return 'text-text-secondary'
  }
}

// GHL deep links
const GHL_LOCATION_ID = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || ''

export function ghlContactUrl(ghlId: string): string {
  return `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}/contacts/detail/${ghlId}`
}

export function ghlEmailMarketingUrl(): string {
  return `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}/marketing/emails`
}

export function getLCAABg(stage: string): string {
  switch (stage?.toLowerCase()) {
    case 'listen':
      return 'bg-listen/10'
    case 'curiosity':
      return 'bg-curiosity/10'
    case 'action':
      return 'bg-action/10'
    case 'art':
      return 'bg-art/10'
    default:
      return 'bg-bg-elevated'
  }
}
