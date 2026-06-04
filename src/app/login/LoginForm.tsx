'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'

const initialState = { error: '' }

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">이메일</label>
        <input
          type="email"
          name="email"
          placeholder="admin@example.com"
          required
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8CC63F]"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">비밀번호</label>
        <input
          type="password"
          name="password"
          required
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8CC63F]"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-lg text-white font-bold text-sm disabled:opacity-60"
        style={{ backgroundColor: '#8CC63F' }}
      >
        {isPending ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
