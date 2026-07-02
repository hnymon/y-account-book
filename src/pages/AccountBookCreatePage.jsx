import { useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { Link } from 'react-router-dom'

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

const getInitialMonth = () => {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

const formatMonthValue = (year, month) => {
  return `${year}-${String(month).padStart(2, '0')}`
}

function AccountBookCreatePage({ onCreate }) {
  const [{ year, month }, setSelectedMonth] = useState(getInitialMonth)

  const handleSubmit = (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const startMonth = formatMonthValue(year, month)

    onCreate({
      name: formData.get('bookName'),
      start_month: startMonth,
      months: [{ month: startMonth, income: 0, expense: 0 }],
    })
  }

  return (
    <main className="create-page">
      <section className="create-card" aria-labelledby="create-title">
        <Link className="create-close-button" to="/account-books" aria-label="목록으로">
          <FaTimes aria-hidden="true" />
        </Link>

        <h1 id="create-title">가계부 생성</h1>

        <form className="create-form" onSubmit={handleSubmit}>
          <label htmlFor="book-name">
            가계부 이름
            <input
              id="book-name"
              name="bookName"
              type="text"
              placeholder="예: 우리집 가계부"
              required
            />
          </label>

          <fieldset className="month-picker">
            <legend>첫 기록 월</legend>
            <div className="year-control">
              <button
                type="button"
                aria-label="이전 연도"
                onClick={() =>
                  setSelectedMonth((selected) => ({
                    ...selected,
                    year: selected.year - 1,
                  }))
                }
              >
                &lt;
              </button>
              <strong>{year}년</strong>
              <button
                type="button"
                aria-label="다음 연도"
                onClick={() =>
                  setSelectedMonth((selected) => ({
                    ...selected,
                    year: selected.year + 1,
                  }))
                }
              >
                &gt;
              </button>
            </div>

            <div className="month-grid">
              {MONTHS.map((monthNumber) => (
                <button
                  className={monthNumber === month ? 'selected' : ''}
                  key={monthNumber}
                  type="button"
                  onClick={() =>
                    setSelectedMonth((selected) => ({
                      ...selected,
                      month: monthNumber,
                    }))
                  }
                >
                  {monthNumber}월
                </button>
              ))}
            </div>
          </fieldset>

          <button className="submit-button" type="submit">
            가계부 생성
          </button>
        </form>
      </section>
    </main>
  )
}

export default AccountBookCreatePage
