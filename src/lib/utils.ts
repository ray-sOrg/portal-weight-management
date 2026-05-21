import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKg(value: number) {
  return `${value.toFixed(1)} kg`
}

export function kgToJin(value: number) {
  return value * 2
}

export function jinToKg(value: number) {
  return value / 2
}

export function formatJin(value: number) {
  return `${kgToJin(value).toFixed(1)} 斤`
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export function formatFullDate(value: string | Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export function todayISO() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
