import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const toAuthEmail = (userId) => `${userId}@y-account-book.com`

const isAlreadyRegisteredError = (error) => {
  const message = error?.message?.toLowerCase() || ''

  return (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('already been registered') ||
    message.includes('user already')
  )
}

function SignupPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordCheck, setPasswordCheck] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedUserId = userId.trim()

    setErrorMessage('')

    if (!trimmedUserId) {
      setErrorMessage('아이디를 입력해 주세요.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('비밀번호는 6자 이상 입력해 주세요.')
      return
    }

    if (password !== passwordCheck) {
      setErrorMessage('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsSubmitting(true)

    const { data, error } = await supabase.auth.signUp({
      email: toAuthEmail(trimmedUserId),
      password,
      options: {
        data: {
          login_id: trimmedUserId,
          nickname: trimmedUserId,
        },
      },
    })

    setIsSubmitting(false)

    if (error || data.user?.identities?.length === 0) {
      console.error('Supabase signup error:', error)
      setErrorMessage(
        isAlreadyRegisteredError(error) || data.user?.identities?.length === 0
          ? '이미 사용 중인 아이디입니다.'
          : '회원가입 중 오류가 발생했습니다.',
      )
      return
    }

    alert('회원가입이 완료되었습니다. 로그인해 주세요.')
    navigate('/login', { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="signup-title">
        <div className="login-header">
          <h1 id="signup-title">Y Account Book</h1>
          <p>새 계정을 만들어 시작하세요</p>
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
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label htmlFor="password-check">
            PW 확인
            <input
              id="password-check"
              name="passwordCheck"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              value={passwordCheck}
              onChange={(event) => setPasswordCheck(event.target.value)}
              required
            />
          </label>

          {errorMessage && <p className="form-error">{errorMessage}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="signup-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </section>
    </main>
  )
}

export default SignupPage
