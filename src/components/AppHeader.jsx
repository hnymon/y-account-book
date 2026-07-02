function AppHeader({ nickname, onLogout }) {
  return (
    <header className="app-header">
      <div className="app-logo">YAB</div>
      <div className="app-user">{nickname}</div>
      <button className="logout-button" type="button" onClick={onLogout}>
        로그아웃
      </button>
    </header>
  )
}

export default AppHeader
