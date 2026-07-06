function AppHeader({ nickname, onLogout, onOpenProfile }) {
  return (
    <header className="app-header">
      <div className="app-logo">YAB</div>
      <div className="app-user">{nickname}</div>
      <div className="app-header-actions">
        <button className="logout-button" type="button" onClick={onOpenProfile}>
          프로필
        </button>
        <button className="logout-button" type="button" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </header>
  )
}

export default AppHeader
