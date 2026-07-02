import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function SupabaseTestPage() {
  const [sessionText, setSessionText] = useState('확인 중...')
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    const testSupabase = async () => {
      const { data, error } = await supabase.auth.getSession()

      console.log('Supabase session:', data)
      console.log('Supabase error:', error)

      if (error) {
        setErrorText(error.message)
        setSessionText('연결 실패')
        return
      }

      setSessionText(data.session ? '로그인 세션 있음' : '연결 성공 / 로그인 세션 없음')
      setErrorText('')
    }

    testSupabase()
  }, [])

  return (
    <div style={{ padding: '40px' }}>
      <h1>Supabase 연결 테스트</h1>

      <p>
        <strong>상태:</strong> {sessionText}
      </p>

      {errorText && (
        <p style={{ color: 'red' }}>
          <strong>에러:</strong> {errorText}
        </p>
      )}

      <p>브라우저 개발자도구 콘솔도 같이 확인하면 됨.</p>
    </div>
  )
}

export default SupabaseTestPage