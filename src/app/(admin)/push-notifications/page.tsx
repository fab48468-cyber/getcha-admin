import PushNotificationForm from './PushNotificationForm'

export default function PushNotificationPage() {
  return (
    <div>
      <h2 style={{ color: '#1A1A1A', fontSize: 24, fontWeight: 900, margin: '0 0 20px' }}>
        푸시 알림 발송
      </h2>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          padding: 20,
          maxWidth: 600,
        }}
      >
        <PushNotificationForm />
      </div>
    </div>
  )
}
