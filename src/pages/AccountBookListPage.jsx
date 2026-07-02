import { useState } from 'react'
import { FaCheck, FaPen, FaTimes, FaTrash } from 'react-icons/fa'
import { Link } from 'react-router-dom'

const formatMonth = (month) => {
  const [year, monthNumber] = month.split('-')
  return `${year}년 ${Number(monthNumber)}월`
}

const getLatestMonth = (months) => {
  if (!months.length) {
    return null
  }

  return [...months].sort((a, b) => b.month.localeCompare(a.month))[0].month
}

const truncateName = (name) => {
  if (name.length <= 10) {
    return name
  }

  return `${name.slice(0, 10)}...`
}

function AccountBookListPage({
  accountBooks,
  onDeleteAccountBook,
  onUpdateAccountBookName,
}) {
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')

  const handleEdit = (accountBook) => {
    setEditingId(accountBook.account_book_id)
    setDraftName(accountBook.name)
  }

  const handleCancel = () => {
    setEditingId(null)
    setDraftName('')
  }

  const handleSave = (accountBookId) => {
    const nextName = draftName.trim()

    if (!nextName) {
      return
    }

    onUpdateAccountBookName(accountBookId, nextName)
    handleCancel()
  }

  return (
    <main className="list-page">
      <section className="list-section" aria-labelledby="list-title">
        <div className="list-heading">
          <div>
            <p className="create-eyebrow">가계부 목록</p>
            <h1 id="list-title">관리할 가계부를 선택해 주세요</h1>
          </div>
          <Link className="secondary-button" to="/account-books/new">
            새 가계부
          </Link>
        </div>

        <div className="account-book-list">
          {accountBooks.map((accountBook) => {
            const latestMonth =
              getLatestMonth(accountBook.months) || accountBook.start_month
            const isEditing = editingId === accountBook.account_book_id

            return (
              <article className="account-book-card" key={accountBook.account_book_id}>
                {isEditing ? (
                  <div className="account-book-card-link">
                    <input
                      className="account-book-name-input"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      aria-label="가계부 이름"
                    />
                    <strong>
                      최근 {latestMonth ? formatMonth(latestMonth) : '없음'}
                    </strong>
                  </div>
                ) : (
                  <Link
                    className="account-book-card-link"
                    to={`/account-books/${accountBook.account_book_id}`}
                  >
                    <span title={accountBook.name}>
                      {truncateName(accountBook.name)}
                    </span>
                    <strong>
                      최근 {latestMonth ? formatMonth(latestMonth) : '없음'}
                    </strong>
                  </Link>
                )}

                <div className="account-book-card-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="저장"
                        onClick={() => handleSave(accountBook.account_book_id)}
                      >
                        <FaCheck aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="취소"
                        onClick={handleCancel}
                      >
                        <FaTimes aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="수정"
                        onClick={() => handleEdit(accountBook)}
                      >
                        <FaPen aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="삭제"
                        onClick={() =>
                          onDeleteAccountBook(accountBook.account_book_id)
                        }
                      >
                        <FaTrash aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default AccountBookListPage
