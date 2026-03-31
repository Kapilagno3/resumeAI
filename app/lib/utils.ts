export const formatSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const formatted = unitIndex === 0 ? `${Math.round(value)}` : `${value.toFixed(1)}`
  return `${formatted} ${units[unitIndex]}`
}

export const generateUUID=()=>crypto.randomUUID();