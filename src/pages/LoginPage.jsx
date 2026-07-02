import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const toAuthEmail = (userId) => `${userId}@y-account-book.com`

function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedUserId = userId.trim()

    setErrorMessage('')
    setIsSubmitting(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: toAuthEmail(trimmedUserId),
      password,
    })

    setIsSubmitting(false)

    if (error) {
      console.error('Supabase login error:', error)
      setErrorMessage('아이디 또는 비밀번호를 확인해 주세요.')
      return
    }

    const nextPath = onLogin({
      id: data.user.id,
      userId: trimmedUserId,
      nickname: trimmedUserId,
    })

    navigate(nextPath, { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-header">
          <h1 id="login-title">Y Account Book</h1>
          <p>나만의 가계부에 로그인하세요</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="user-id">
            ID
            <input
              id="user-id"
              name="userId"
              type="text"
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
            />
          </label>

          <label htmlFor="password">
            PW
            <input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <div className="form-options">
            <label className="remember" htmlFor="remember">
              <input id="remember" name="remember" type="checkbox" />
              로그인 유지
            </label>
          </div>

          {errorMessage && <p className="form-error">{errorMessage}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="signup-link">
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
