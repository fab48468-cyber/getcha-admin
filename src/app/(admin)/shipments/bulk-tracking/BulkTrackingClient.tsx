'use client'

import Link from 'next/link'
import Papa from 'papaparse'
import { useMemo, useState, useTransition } from 'react'
import {
  executeBulkTrackingAction,
  validateBulkTrackingAction,
  type BulkTrackingExecuteResult,
  type BulkTrackingInputRow,
} from './actions'

const EXPECTED_HEADERS = ['shipment_id', '택배사', '송장번호'] as const
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ParsedClientRow = BulkTrackingInputRow & {
  clientStatus: 'ok' | 'invalid_uuid' | 'empty_fields' | 'duplicate_in_file'
  clientMessage: string
}

type DisplayVerdict = {
  shipment_id: string
  courier_company: string
  tracking_number: string
  status: string
  reason: string
  message: string
  recipient_name: string | null
}

type Phase = 'upload' | 'preview' | 'result'

function downloadBlob(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadTemplate() {
  downloadBlob('shipments_tracking_template.csv', '\uFEFFshipment_id,택배사,송장번호\r\n')
}

function escapeCsvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function VerdictBadge({
  label,
  ok,
}: {
  label: string
  ok: boolean
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: ok ? '#EEFBD0' : '#FEE2E2',
        color: ok ? '#5B8B1E' : '#DC2626',
        border: ok ? '1px solid #B7E46B' : '1px solid #FCA5A5',
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {label}
    </span>
  )
}

export default function BulkTrackingClient() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [parseError, setParseError] = useState('')
  const [clientRows, setClientRows] = useState<ParsedClientRow[]>([])
  const [verdicts, setVerdicts] = useState<DisplayVerdict[]>([])
  const [executeResult, setExecuteResult] = useState<BulkTrackingExecuteResult | null>(null)
  const [actionError, setActionError] = useState('')
  const [isPending, startTransition] = useTransition()

  const okCount = useMemo(
    () => verdicts.filter((verdict) => verdict.status === 'ok').length,
    [verdicts]
  )
  const excludedCount = verdicts.length - okCount

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setParseError('')
    setActionError('')
    setVerdicts([])
    setExecuteResult(null)
    setPhase('upload')

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const fields = results.meta.fields ?? []
        const headersMatch =
          fields.length === EXPECTED_HEADERS.length &&
          EXPECTED_HEADERS.every((header, index) => fields[index] === header)

        if (!headersMatch) {
          setParseError(
            `헤더가 올바르지 않습니다. 기대: ${EXPECTED_HEADERS.join(', ')}`
          )
          setClientRows([])
          return
        }

        const seenIds = new Set<string>()
        const parsed: ParsedClientRow[] = results.data.map((row) => {
          const shipmentId = String(row.shipment_id ?? '').trim()
          const courierCompany = String(row['택배사'] ?? '').trim()
          const trackingNumber = String(row['송장번호'] ?? '')
            .trim()
            .replace(/\s+/g, '')

          if (!UUID_RE.test(shipmentId)) {
            return {
              shipment_id: shipmentId,
              courier_company: courierCompany,
              tracking_number: trackingNumber,
              clientStatus: 'invalid_uuid',
              clientMessage: 'shipment_id UUID 형식이 아닙니다',
            }
          }

          if (!courierCompany || !trackingNumber) {
            return {
              shipment_id: shipmentId,
              courier_company: courierCompany,
              tracking_number: trackingNumber,
              clientStatus: 'empty_fields',
              clientMessage: '택배사 또는 송장번호가 비어 있습니다',
            }
          }

          if (seenIds.has(shipmentId)) {
            return {
              shipment_id: shipmentId,
              courier_company: courierCompany,
              tracking_number: trackingNumber,
              clientStatus: 'duplicate_in_file',
              clientMessage: '파일 내 shipment_id 중복',
            }
          }

          seenIds.add(shipmentId)
          return {
            shipment_id: shipmentId,
            courier_company: courierCompany,
            tracking_number: trackingNumber,
            clientStatus: 'ok',
            clientMessage: '형식 통과',
          }
        })

        setClientRows(parsed)
      },
      error(error) {
        setParseError(error.message)
        setClientRows([])
      },
    })
  }

  function handleValidate() {
    const validRows = clientRows
      .filter((row) => row.clientStatus === 'ok')
      .map(({ shipment_id, courier_company, tracking_number }) => ({
        shipment_id,
        courier_company,
        tracking_number,
      }))

    if (validRows.length === 0) {
      setActionError('서버 검증할 유효 행이 없습니다.')
      return
    }

    startTransition(async () => {
      const result = await validateBulkTrackingAction(validRows)
      if (result.error) {
        setActionError(result.error)
        return
      }

      const clientExcluded = clientRows.filter((row) => row.clientStatus !== 'ok')
      const merged: DisplayVerdict[] = [
        ...clientExcluded.map((row) => ({
          shipment_id: row.shipment_id,
          courier_company: row.courier_company,
          tracking_number: row.tracking_number,
          status: row.clientStatus,
          reason: row.clientStatus,
          message: row.clientMessage,
          recipient_name: null,
        })),
        ...result.verdicts,
      ]

      setVerdicts(merged)
      setActionError('')
      setPhase('preview')
    })
  }

  function handleExecute() {
    const okRows = verdicts
      .filter((verdict) => verdict.status === 'ok')
      .map(({ shipment_id, courier_company, tracking_number }) => ({
        shipment_id,
        courier_company,
        tracking_number,
      }))

    if (okRows.length === 0) return

    const confirmed = window.confirm(`처리 가능 ${okRows.length}건을 발송 처리합니다.`)
    if (!confirmed) return

    startTransition(async () => {
      const result = await executeBulkTrackingAction(okRows)
      if (result.error) {
        setActionError(result.error)
        return
      }
      setExecuteResult(result)
      setActionError('')
      setPhase('result')
    })
  }

  function downloadFailedCsv() {
    if (!executeResult || executeResult.failed.length === 0) return

    const failedMap = new Map(executeResult.failed.map((item) => [item.id, item]))
    const sourceRows = verdicts.filter((verdict) => failedMap.has(verdict.shipment_id))

    const lines = [
      EXPECTED_HEADERS.map((header) => escapeCsvField(header)).join(','),
      ...sourceRows.map((row) =>
        [
          row.shipment_id,
          row.courier_company,
          row.tracking_number,
        ]
          .map(escapeCsvField)
          .join(',')
      ),
    ]

    downloadBlob('shipments_tracking_failed.csv', `\uFEFF${lines.join('\r\n')}`)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <Link
          href="/shipments"
          style={{
            color: '#8B5CF6',
            fontSize: 14,
            fontWeight: 800,
            textDecoration: 'none',
            alignSelf: 'center',
          }}
        >
          ← 배송 목록
        </Link>
      </div>

      <section
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <button
            type="button"
            onClick={downloadTemplate}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#1A1A1A',
              border: '1px solid #E0DDD8',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            양식 다운로드
          </button>
          <label
            style={{
              backgroundColor: '#8CC63F',
              color: '#1A1A1A',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            CSV 선택
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>
          shipment_id는 CSV 내보내기 파일의 1열을 그대로 사용
        </p>
      </section>

      {(parseError || actionError) && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 10,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {parseError || actionError}
        </div>
      )}

      {clientRows.length > 0 && phase === 'upload' && (
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E0DDD8',
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ marginBottom: 12, color: '#1A1A1A', fontSize: 14, fontWeight: 900 }}>
            파싱 결과 {clientRows.length}행 · 형식 통과{' '}
            {clientRows.filter((row) => row.clientStatus === 'ok').length}행
          </div>
          <button
            type="button"
            onClick={handleValidate}
            disabled={isPending}
            style={{
              backgroundColor: isPending ? '#E5E7EB' : '#8CC63F',
              color: isPending ? '#9CA3AF' : '#1A1A1A',
              border: 'none',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 900,
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending ? '검증 중...' : '검증'}
          </button>
        </section>
      )}

      {phase === 'preview' && (
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E0DDD8',
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ marginBottom: 12, color: '#1A1A1A', fontSize: 14, fontWeight: 900 }}>
            처리 가능 {okCount}건 / 제외 {excludedCount}건
          </div>
          <button
            type="button"
            onClick={handleExecute}
            disabled={okCount === 0 || isPending}
            style={{
              backgroundColor: okCount === 0 || isPending ? '#E5E7EB' : '#8CC63F',
              color: okCount === 0 || isPending ? '#9CA3AF' : '#1A1A1A',
              border: 'none',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 900,
              cursor: okCount === 0 || isPending ? 'not-allowed' : 'pointer',
              marginBottom: 16,
            }}
          >
            {isPending ? '처리 중...' : `${okCount}건 발송 처리`}
          </button>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#F9F9F9' }}>
                <tr>
                  {['판정', 'shipment_id', '수령인', '택배사', '송장번호', '사유'].map((header) => (
                    <th
                      key={header}
                      style={{
                        color: '#6B7280',
                        fontSize: 12,
                        fontWeight: 800,
                        padding: '12px 14px',
                        textAlign: 'left',
                        borderBottom: '1px solid #E0DDD8',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {verdicts.map((verdict, index) => {
                  const ok = verdict.status === 'ok'
                  return (
                    <tr key={`${verdict.shipment_id}-${index}`}>
                      <td style={{ padding: 14, borderBottom: '1px solid #F0EEEA' }}>
                        <VerdictBadge label={ok ? 'ok' : verdict.reason} ok={ok} />
                      </td>
                      <td style={{ padding: 14, borderBottom: '1px solid #F0EEEA', fontSize: 13 }}>
                        {verdict.shipment_id || '-'}
                      </td>
                      <td style={{ padding: 14, borderBottom: '1px solid #F0EEEA', fontSize: 13 }}>
                        {verdict.recipient_name || '-'}
                      </td>
                      <td style={{ padding: 14, borderBottom: '1px solid #F0EEEA', fontSize: 13 }}>
                        {verdict.courier_company || '-'}
                      </td>
                      <td style={{ padding: 14, borderBottom: '1px solid #F0EEEA', fontSize: 13 }}>
                        {verdict.tracking_number || '-'}
                      </td>
                      <td style={{ padding: 14, borderBottom: '1px solid #F0EEEA', fontSize: 13 }}>
                        {verdict.message}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {phase === 'result' && executeResult && (
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E0DDD8',
            padding: 20,
          }}
        >
          <div style={{ marginBottom: 12, color: '#1A1A1A', fontSize: 14, fontWeight: 900 }}>
            성공 {executeResult.succeeded}건 · 실패 {executeResult.failed.length}건
          </div>

          {executeResult.failed.length > 0 && (
            <button
              type="button"
              onClick={downloadFailedCsv}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
                border: '1px solid #E0DDD8',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 900,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              실패 행 CSV 재다운로드
            </button>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {executeResult.failed.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #FECACA',
                  backgroundColor: '#FEF2F2',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {item.id} · {item.reason}: {item.message}
              </div>
            ))}
            {executeResult.succeeded > 0 && executeResult.failed.length === 0 && (
              <div style={{ color: '#5B8B1E', fontSize: 14, fontWeight: 800 }}>
                모든 행이 발송 처리되었습니다.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
