import React from 'react'

interface ScoreBadgeProps {
  score: number
}

const ScoreBadge = ({ score }: ScoreBadgeProps) => {
  const normalizedScore = Number.isFinite(score) ? score : 0
  const isStrong = normalizedScore > 70
  const isGood = normalizedScore > 49

  const badgeClasses = isStrong
    ? 'bg-badge-green text-green-600'
    : isGood
    ? 'bg-badge-yellow text-yellow-600'
    : 'bg-badge-red text-red-600'

  const label = isStrong ? 'Strong' : isGood ? 'Good Start' : 'Needs Work'

  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses}`}>
      {label}
    </div>
  )
}

export default ScoreBadge
