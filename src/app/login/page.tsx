import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black">
            <span style={{ color: '#8CC63F' }}>GETCHA</span>{' '}
            <span style={{ color: '#8B5CF6' }}>ADMIN</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">관리자 전용 로그인</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
