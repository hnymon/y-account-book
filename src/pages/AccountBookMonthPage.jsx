import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const MIN_ENTRY_ROWS = 14

const formatMonth = (month) => {
  const [year, monthNumber] = month.split('-')
  return `${year}년 ${Number(monthNumber)}월`
}

const formatCurrency = (amount) => {
  return `${amount.toLocaleString('ko-KR')}원`
}

const formatAmountInput = (amount) => {
  if (amount === '' || amount === null || amount === undefined) {
    return ''
  }

  return Number(amount || 0).toLocaleString('ko-KR')
}

const parseAmountInput = (value) => {
  const digits = value.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  return Number(digits)
}

const createEmptyTransaction = (type, month) => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  date: `${month}-01`,
  amount: '',
  description: '',
  category: '',
  category_id: '',
})

const isEmptyTransaction = (transaction) => {
  return (
    !transaction.date &&
    !transaction.amount &&
    !transaction.description.trim() &&
    !transaction.category_id
  )
}

const normalizeTransactions = (items) => {
  return items.filter((item) => !isEmptyTransaction(item))
}

const getSummaryRows = (categories, transactions) => {
  const sortedCategories = [...categories].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  )
  const knownRows = sortedCategories.map((category) => ({
    category: category.name,
    total: transactions
      .filter((transaction) => transaction.category_id === category.id)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
  }))
  const unassignedTotal = transactions
    .filter((transaction) => !transaction.category_id)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

  if (unassignedTotal > 0) {
    knownRows.push({ category: '미배정', total: unassignedTotal })
  }

  return knownRows
}

function SummaryTable({ title, categories, transactions }) {
  const rows = useMemo(
    () => getSummaryRows(categories, transactions),
    [categories, transactions],
  )
  const total = rows.reduce((sum, row) => sum + row.total, 0)

  return (
    <section className="summary-section" aria-labelledby={`${title}-summary`}>
      <div className="summary-title-row">
        <h2 id={`${title}-summary`}>{title}</h2>
        <strong>{formatCurrency(total)}</strong>
      </div>
      <div className="summary-list">
        {rows.map((row) => (
          <div className="summary-row" key={row.category}>
            <span>{row.category}</span>
            <strong>{formatCurrency(row.total)}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function TransactionTable({
  categories,
  month,
  title,
  transactions,
  type,
  onChange,
}) {
  const [rowCount, setRowCount] = useState(() =>
    Math.max(MIN_ENTRY_ROWS, transactions.length + 5),
  )
  const rows = [
    ...transactions,
    ...Array.from({
      length: Math.max(rowCount - transactions.length, 0),
    }).map(() => null),
  ]

  const handleChange = (index, field, value) => {
    const nextTransactions = [...transactions]
    const current =
      nextTransactions[index] || createEmptyTransaction(type, month)

    const nextTransaction = {
      ...current,
      [field]: field === 'amount' ? parseAmountInput(value) : value,
    }

    nextTransactions[index] = nextTransaction
    onChange(type, normalizeTransactions(nextTransactions))
  }

  return (
    <section className="transaction-section" aria-labelledby={`${type}-title`}>
      <h2 id={`${type}-title`}>{title}</h2>
      <div className="transaction-table">
        <div className="transaction-head">
          <span>날짜</span>
          <span>금액</span>
          <span>설명</span>
          <span>카테고리</span>
        </div>
        {rows.map((transaction, index) => {
          const row = transaction || {
            date: '',
            amount: '',
            description: '',
            category: '',
            category_id: '',
          }

          return (
            <div
              className="transaction-row"
              key={transaction?.id || `${type}-empty-${index}`}
            >
              <input
                aria-label={`${title} 날짜`}
                type="date"
                value={row.date}
                onChange={(event) =>
                  handleChange(index, 'date', event.target.value)
                }
              />
              <input
                aria-label={`${title} 금액`}
                inputMode="numeric"
                type="text"
                value={formatAmountInput(row.amount)}
                onChange={(event) =>
                  handleChange(index, 'amount', event.target.value)
                }
              />
              <input
                aria-label={`${title} 설명`}
                type="text"
                value={row.description}
                onChange={(event) =>
                  handleChange(index, 'description', event.target.value)
                }
              />
              <select
                aria-label={`${title} 카테고리`}
                value={row.category_id || ''}
                onChange={(event) =>
                  handleChange(index, 'category_id', event.target.value)
                }
              >
                <option value="">선택</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
      <button
        className="add-rows-button"
        type="button"
        onClick={() => setRowCount((current) => current + 10)}
      >
        + 10개 추가
      </button>
    </section>
  )
}

function AccountBookMonthPage({
  accountBooks,
  categoryTypes,
  transactions,
  onChangeTransactions,
}) {
  const { accountBookId, month } = useParams()
  const [activeTab, setActiveTab] = useState('summary')
  const accountBook = accountBooks.find(
    (item) => item.account_book_id === accountBookId,
  )
  const monthTransactions = transactions[accountBookId]?.[month] || {
    expense: [],
    income: [],
  }

  if (!accountBook) {
    return (
      <main className="empty-page">
        <p>가계부를 찾을 수 없습니다.</p>
        <Link className="secondary-button" to="/account-books">
          목록으로
        </Link>
      </main>
    )
  }

  const handleChangeTransactions = (type, nextTransactions) => {
    onChangeTransactions(accountBookId, month, {
      ...monthTransactions,
      [type]: nextTransactions,
    })
  }

  return (
    <main className="month-page">
      <section className="month-workspace" aria-labelledby="month-title">
        <div className="month-workspace-heading">
          <div>
            <p className="create-eyebrow">{accountBook.name}</p>
            <h1 id="month-title">{formatMonth(month)}</h1>
          </div>
          <Link
            className="secondary-button"
            to={`/account-books/${accountBook.account_book_id}`}
          >
            월 선택으로
          </Link>
        </div>

        <div className="month-tabs" role="tablist" aria-label="월별 작성 탭">
          <button
            className={activeTab === 'summary' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
          >
            요약
          </button>
          <button
            className={activeTab === 'write' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'write'}
            onClick={() => setActiveTab('write')}
          >
            작성
          </button>
        </div>

        {activeTab === 'summary' ? (
          <div className="summary-grid">
            <SummaryTable
              categories={categoryTypes.expense}
              title="지출"
              transactions={monthTransactions.expense}
            />
            <SummaryTable
              categories={categoryTypes.income}
              title="수입"
              transactions={monthTransactions.income}
            />
          </div>
        ) : (
          <div className="transaction-grid">
            <TransactionTable
              categories={categoryTypes.expense}
              month={month}
              title="지출"
              transactions={monthTransactions.expense}
              type="expense"
              onChange={handleChangeTransactions}
            />
            <TransactionTable
              categories={categoryTypes.income}
              month={month}
              title="수입"
              transactions={monthTransactions.income}
              type="income"
              onChange={handleChangeTransactions}
            />
          </div>
        )}
      </section>
    </main>
  )
}

export default AccountBookMonthPage
