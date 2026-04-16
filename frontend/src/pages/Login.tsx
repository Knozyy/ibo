import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/auth/login', { username, password })
      setToken(res.data.access_token)
      navigate('/')
    } catch {
      setError('Kullanıcı adı veya şifre hatalı.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f3ff] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#003ec7] mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <polygon points="9,6 20,12 9,18" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0d1117]" style={{ letterSpacing: '-0.02em' }}>
            VideoPortal
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">Yönetici girişi</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8" style={{ boxShadow: '0px 12px 32px rgba(17, 28, 45, 0.06)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5 tracking-wide uppercase" style={{ fontSize: '0.6875rem' }}>
                Kullanıcı Adı
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#f0f3ff] text-[#0d1117] text-sm px-3.5 py-2.5 rounded-lg outline-none transition-all focus:ring-0"
                style={{
                  borderBottom: '2px solid transparent',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderBottomColor = '#003ec7')}
                onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5 tracking-wide uppercase" style={{ fontSize: '0.6875rem' }}>
                Şifre
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#f0f3ff] text-[#0d1117] text-sm px-3.5 py-2.5 rounded-lg outline-none transition-all"
                style={{
                  borderBottom: '2px solid transparent',
                }}
                onFocus={(e) => (e.target.style.borderBottomColor = '#003ec7')}
                onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-lg">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 4v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="7" cy="10" r="0.75" fill="currentColor" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white text-sm font-medium py-2.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading ? '#003ec7' : 'linear-gradient(135deg, #003ec7 0%, #0052ff 100%)',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Giriş yapılıyor…
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
