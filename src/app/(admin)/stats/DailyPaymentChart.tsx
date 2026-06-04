'use client'

import { useState } from 'react'

export type DailyPaymentPoint = {
  date: string
  amount: number
}

function formatMMDD(dateStr: string) {
  const [, month, day] = dateStr.split('-')
  return `${month}/${day}`
}

function formatFullDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${year}.${month}.${day}`
}

type DailyPaymentChartProps = {
  data: DailyPaymentPoint[]
}

export default function DailyPaymentChart({ data }: DailyPaymentChartProps) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  return (
    <section
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        border: '1px solid #E0DDD8',
        marginTop: 16,
      }}
    >
      <h3
        style={{
          color: '#1A1A1A',
          fontSize: 18,
          fontWeight: 900,
          margin: '0 0 20px',
        }}
      >
        최근 30일 일별 결제액
      </h3>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 3,
          position: 'relative',
        }}
      >
        {data.map((point) => {
          const barHeightPx = Math.max(
            Math.round((point.amount / maxAmount) * 160),
            point.amount > 0 ? 4 : 2
          )
          const isHovered = hoveredDate === point.date

          return (
            <div
              key={point.date}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 0,
                position: 'relative',
              }}
              onMouseEnter={() => setHoveredDate(point.date)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: barHeightPx + 28,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#1A1A1A',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '6px 8px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    pointerEvents: 'none',
                    textAlign: 'center',
                    lineHeight: 1.4,
                  }}
                >
                  <div>{formatFullDate(point.date)}</div>
                  <div>{point.amount.toLocaleString()}원</div>
                </div>
              )}

              <div
                style={{
                  width: '100%',
                  maxWidth: 28,
                  height: barHeightPx,
                  backgroundColor: '#8CC63F',
                  borderRadius: '4px 4px 0 0',
                  transition: 'opacity 0.15s',
                  opacity: isHovered ? 1 : 0.85,
                  cursor: 'default',
                }}
              />

              <span
                style={{
                  color: '#9CA3AF',
                  fontSize: 9,
                  fontWeight: 600,
                  marginTop: 6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {formatMMDD(point.date)}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
