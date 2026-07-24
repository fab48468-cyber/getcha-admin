export const COURIER_OPTIONS = [
  'CJ대한통운',
  '한진택배',
  '롯데택배',
  '우체국택배',
  '로젠택배',
] as const

export type CourierOption = (typeof COURIER_OPTIONS)[number]

export const TRACKING_URL_BUILDERS: Record<
  CourierOption,
  (trackingNumber: string) => string
> = {
  CJ대한통운: (trackingNumber) =>
    `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${trackingNumber}`,
  한진택배: (trackingNumber) =>
    `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${trackingNumber}`,
  롯데택배: (trackingNumber) =>
    `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${trackingNumber}`,
  우체국택배: (trackingNumber) =>
    `https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?POST_CODE=${trackingNumber}`,
  로젠택배: (trackingNumber) =>
    `https://www.ilogen.com/iLogenHomePage/TRACE/TraceInfo.do?slipno=${trackingNumber}`,
}

export function isPredefinedCourier(value: string | null) {
  return COURIER_OPTIONS.includes(value as CourierOption)
}

export function buildTrackingUrl(courierCompany: string, trackingNumber: string) {
  const trimmedNumber = trackingNumber.trim()
  if (!trimmedNumber) return ''

  const builder = TRACKING_URL_BUILDERS[courierCompany as CourierOption]
  return builder ? builder(trimmedNumber) : ''
}
