import { useEffect, useState } from 'react'

function ProfileModal({ profile, currentUser, onClose, onSave }) {
  const [nickname, setNickname] = useState(
    profile?.nickname || currentUser?.nickname || '',
  )
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const loginId = currentUser?.userId || profile?.login_id || ''

  useEffect(() => {
    setNickname(profile?.nickname || currentUser?.nickname || '')
    setNewPassword('')
    setNewPasswordConfirm('')
    setErrorMessage('')
  }, [currentUser, profile])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedNickname = nickname.trim()
    const shouldChangePassword = newPassword || newPasswordConfirm

    if (!trimmedNickname) {
      setErrorMessage('닉네임을 입력해 주세요.')
      return
    }

    if (trimmedNickname.length > 20) {
      setErrorMessage('닉네임은 20자 이하로 입력해 주세요.')
      return
    }

    if (shouldChangePassword) {
      if (!newPassword || !newPasswordConfirm) {
        setErrorMessage('새 비밀번호와 확인을 모두 입력해 주세요.')
        return
      }

      if (newPassword !== newPasswordConfirm) {
        setErrorMessage('비밀번호가 일치하지 않습니다.')
        return
      }

      if (newPassword.length < 6) {
        setErrorMessage('비밀번호는 6자 이상 입력해 주세요.')
        return
      }
    }

    setErrorMessage('')
    setIsSaving(true)

    try {
      await onSave({
        nickname: trimmedNickname,
        newPassword: newPassword ? newPassword : null,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="category-modal profile-modal"
        aria-labelledby="profile-modal-title"
        role="dialog"
        aria-modal="true"
      >
        <form className="profile-modal-form" onSubmit={handleSubmit}>
          <div className="category-modal-header">
            <h1 id="profile-modal-title">프로필 설정</h1>
            <div className="category-modal-actions">
              <button type="submit" disabled={isSaving}>
                {isSaving ? '저장 중...' : '저장'}
              </button>
              <button type="button" onClick={onClose}>
                닫기
              </button>
            </div>
          </div>

          <div className="category-modal-body">
            <div className="category-column">
              <label htmlFor="profile-login-id">
                ID
                <input
                  id="profile-login-id"
                  name="loginId"
                  type="text"
                  value={loginId}
                  readOnly
                />
              </label>
            </div>

            <div className="category-column">
              <label htmlFor="profile-nickname">
                닉네임
                <input
                  id="profile-nickname"
                  name="nickname"
                  type="text"
                  maxLength={20}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                />
              </label>
            </div>

            <div className="category-column">
              <label htmlFor="profile-password">
                PW
                <input
                  id="profile-password"
                  name="newPassword"
                  type="password"
                  placeholder="새 비밀번호"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
            </div>

            <div className="category-column">
              <label htmlFor="profile-password-confirm">
                PW check
                <input
                  id="profile-password-confirm"
                  name="newPasswordConfirm"
                  type="password"
                  placeholder="새 비밀번호 확인"
                  value={newPasswordConfirm}
                  onChange={(event) =>
                    setNewPasswordConfirm(event.target.value)
                  }
                />
              </label>
              {errorMessage && <p className="form-error">{errorMessage}</p>}
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ProfileModal
