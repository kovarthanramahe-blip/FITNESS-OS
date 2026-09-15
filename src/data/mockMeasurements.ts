import type { BodyMeasurement } from '@/types/progress'

function daysAgoDateString(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

let seedCounter = 0
function measurement(type: string, daysAgo: number, value: number, unit: 'cm' | 'in' = 'cm'): BodyMeasurement {
  seedCounter += 1
  return { id: `seed-measurement-${seedCounter}`, type, date: daysAgoDateString(daysAgo), value, unit }
}

export const mockMeasurements: BodyMeasurement[] = [
  measurement('Waist', 56, 86),
  measurement('Waist', 28, 84),
  measurement('Waist', 0, 82.5),

  measurement('Chest', 56, 98),
  measurement('Chest', 28, 99),
  measurement('Chest', 0, 100),

  measurement('Left Arm', 56, 34),
  measurement('Left Arm', 28, 34.5),
  measurement('Left Arm', 0, 35),

  measurement('Right Arm', 56, 34.2),
  measurement('Right Arm', 28, 34.8),
  measurement('Right Arm', 0, 35.2),

  measurement('Hips', 56, 99),
  measurement('Hips', 28, 98),
  measurement('Hips', 0, 97),
]
