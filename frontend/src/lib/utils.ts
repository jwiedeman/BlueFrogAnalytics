import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Return a random Unsplash image URL.
 *
 * @param width Desired width of the image
 * @param height Desired height of the image
 */
export function randomUnsplash(width = 1200, height = 800): string {
  const sig = Math.floor(Math.random() * 10000)
  return `https://source.unsplash.com/random/${width}x${height}?sig=${sig}`
}
