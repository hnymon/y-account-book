import { useMemo, useState } from 'react'
import {
  FaCheck,
  FaPen,
  FaPlus,
  FaTimes,
  FaTrash,
} from 'react-icons/fa'
import { Link, useNavigate, useParams } from 'react-router-dom'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1)

const formatMonth = (month) => {
  const [year, monthNumber] = month.split('-')
  return `${year}년 ${Number(monthNumber)}월`
}

const formatCurrency = (amount) => {
  return `${amount.toLocaleString('ko-KR')}원`
}

const parseMonth = (month) => {
  const [year, monthNumber] = month.split('-').map(Number)
  return { year, month: monthNumber }
}

const formatMonthValue = (year, month) => {
  return `${year}-${String(month).padStart(2, '0')}`
}

const cloneCategoryTypes = (categoryTypes) => ({
  expense: categoryTypes.expense.map((item) => ({ ...item })),
  income: categoryTypes.income.map((item) => ({ ...item })),
})

const isSameCategoryTypes = (left, right) => {
  return JSON.stringify(left) === JSON.stringify(right)
}

const moveItem = (items, fromIndex, toIndex) => {
  if (toIndex < 0 || toIndex >= items.length) {
    return items
  }

  const nextItems = [...items]
  const [item] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, item)

  return nextItems
}

const getSavedOrderCategoryTypes = (savedCategoryTypes, draftCategoryTypes) => {
  const result = { expense: [], income: [] }

  for (const type of ['expense', 'income']) {
    const savedById = new Map(
      savedCategoryTypes[type].map((category) => [category.id, category]),
    )

    result[type] = draftCategoryTypes[type]
      .map((category) => savedById.get(category.id))
      .filter(Boolean)
  }

  return result
}

function CategoryColumn({
  addingId,
  editingId,
  items,
  savingId,
  title,
  type,
  onAdd,
  onCancelEdit,
  onChangeName,
  onDelete,
  onEdit,
  onMove,
  onSaveEdit,
}) {
  return (
    <section className="category-column" aria-labelledby={`${type}-title`}>
      <div className="category-column-header">
        <h2 id={`${type}-title`}>{title}</h2>
        <button type="button" onClick={() => onAdd(type)}>
          + 추가
        </button>
      </div>

      <div className="category-type-list">
        {items.map((item, index) => {
          const isEditing = editingId === item.id
          const isAdding = addingId === item.id
          const hasAddingItem = items.some((currentItem) => currentItem.id === addingId)
          const isFirstMovableItem = hasAddingItem ? index <= 1 : index === 0

          return (
            <div className="category-type-row" key={item.id}>
              {isEditing ? (
                <input
                  aria-label={`${title} 항목명`}
                  value={item.name}
                  onChange={(event) =>
                    onChangeName(type, item.id, event.target.value)
                  }
                />
              ) : (
                <span>{item.name}</span>
              )}

              <div className="category-row-actions">
                {isEditing ? (
                  <>
                    <button
                      className="text-action"
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => onSaveEdit(type, item, index)}
                    >
                      저장
                    </button>
                    <button
                      className="text-action"
                      type="button"
                      disabled={savingId === item.id}
                      onClick={onCancelEdit}
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="text-action"
                      type="button"
                      disabled={Boolean(savingId)}
                      onClick={() => onEdit(type, item)}
                    >
                      수정
                    </button>
                    <button
                      className="text-action"
                      type="button"
                      disabled={Boolean(savingId)}
                      onClick={() => onDelete(type, item.id)}
                    >
                      삭제
                    </button>
                  </>
                )}
                <div className="category-order-actions" aria-label="순서 변경">
                  <button
                    className="category-order-button"
                    type="button"
                    aria-label={`${item.name} 위로 이동`}
                    disabled={Boolean(savingId) || isAdding || isFirstMovableItem}
                    onClick={() => onMove(type, index, -1)}
                  >
                    ▲
                  </button>
                  <button
                    className="category-order-button"
                    type="button"
                    aria-label={`${item.name} 아래로 이동`}
                    disabled={
                      Boolean(savingId) || isAdding || index === items.length - 1
                    }
                    onClick={() => onMove(type, index, 1)}
                  >
                    ▼
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CategoryManageModal({
  accountBookId,
  categoryTypes,
  onClose,
  onCreateCategory,
  onDeleteCategory,
  onSave,
  onUpdateCategory,
}) {
  const [draftCategoryTypes, setDraftCategoryTypes] = useState(() =>
    cloneCategoryTypes(categoryTypes),
  )
  const [editingId, setEditingId] = useState(null)
  const [addingId, setAddingId] = useState(null)
  const [editingBackup, setEditingBackup] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const hasChanges = !isSameCategoryTypes(categoryTypes, draftCategoryTypes)

  const restoreEditingBackup = (current) => {
    if (!editingBackup) {
      return current
    }

    return {
      ...current,
      [editingBackup.type]: current[editingBackup.type].map((item) =>
        item.id === editingBackup.id
          ? { ...item, name: editingBackup.name }
          : item,
      ),
    }
  }

  const handleAdd = (type) => {
    if (addingId) {
      return
    }

    const id = `${type}-${Date.now()}`

    setDraftCategoryTypes((current) => {
      const restored = restoreEditingBackup(current)

      return {
        ...restored,
        [type]: [
          {
            id,
            name: '새 항목',
          },
          ...restored[type],
        ],
      }
    })
    setEditingId(id)
    setAddingId(id)
    setEditingBackup(null)
  }

  const handleChangeName = (type, id, name) => {
    setDraftCategoryTypes((current) => ({
      ...current,
      [type]: current[type].map((item) =>
        item.id === id ? { ...item, name } : item,
      ),
    }))
  }

  const handleMove = (type, index, direction) => {
    setDraftCategoryTypes((current) => {
      const toIndex = index + direction
      const hasAddingItem = current[type].some((item) => item.id === addingId)

      if (
        hasAddingItem &&
        toIndex === 0 &&
        current[type][index]?.id !== addingId
      ) {
        return current
      }

      return {
        ...current,
        [type]: moveItem(current[type], index, toIndex),
      }
    })
  }

  const handleDelete = async (type, id) => {
    setSavingId(id)

    try {
      await onDeleteCategory(accountBookId, type, id)

      setDraftCategoryTypes((current) => ({
        ...current,
        [type]: current[type].filter((item) => item.id !== id),
      }))

      if (editingId === id) {
        setEditingId(null)
        setAddingId(null)
        setEditingBackup(null)
      }
    } catch {
      // App-level handler shows the user-facing error.
    } finally {
      setSavingId(null)
    }
  }

  const handleEdit = (type, item) => {
    if (addingId) {
      return
    }

    setEditingId(item.id)
    setEditingBackup({
      id: item.id,
      name: item.name,
      type,
    })
  }

  const handleCancelEdit = () => {
    if (addingId && editingId === addingId) {
      setDraftCategoryTypes((current) => ({
        expense: current.expense.filter((item) => item.id !== addingId),
        income: current.income.filter((item) => item.id !== addingId),
      }))
    } else {
      setDraftCategoryTypes((current) => restoreEditingBackup(current))
    }

    setEditingId(null)
    setAddingId(null)
    setEditingBackup(null)
  }

  const handleSaveEdit = async (type, item, index) => {
    const nextName = item.name.trim()

    if (!nextName) {
      return
    }

    setSavingId(item.id)

    try {
      const nextCategory = {
        ...item,
        name: nextName,
        type,
        display_order: index,
      }
      const savedCategory =
        addingId === item.id
          ? await onCreateCategory(accountBookId, nextCategory)
          : await onUpdateCategory(accountBookId, item.id, nextCategory)

      setDraftCategoryTypes((current) => ({
        ...current,
        [type]: current[type].map((category) =>
          category.id === item.id ? savedCategory : category,
        ),
      }))
      setEditingId(null)
      setAddingId(null)
      setEditingBackup(null)
    } catch {
      // App-level handler shows the user-facing error.
    } finally {
      setSavingId(null)
    }
  }

  const handleClose = () => {
    if (
      hasChanges &&
      !window.confirm('수정사항이 있습니다. 저장하지 않고 닫으시겠습니까?')
    ) {
      return
    }

    onClose()
  }

  const handleSave = async () => {
    setSavingId('order')

    try {
      await onSave(getSavedOrderCategoryTypes(categoryTypes, draftCategoryTypes))
      onClose()
    } catch {
      // App-level handler shows the user-facing error.
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="category-modal"
        aria-labelledby="category-modal-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="category-modal-header">
          <h1 id="category-modal-title">수입/지출 관리</h1>
          <div className="category-modal-actions">
            <button type="button" onClick={handleSave}>
              저장
            </button>
            <button type="button" onClick={handleClose}>
              닫기
            </button>
          </div>
        </div>

        <div className="category-modal-body">
          <CategoryColumn
            addingId={addingId}
            editingId={editingId}
            items={draftCategoryTypes.expense}
            savingId={savingId}
            title="지출"
            type="expense"
            onAdd={handleAdd}
            onCancelEdit={handleCancelEdit}
            onChangeName={handleChangeName}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onMove={handleMove}
            onSaveEdit={handleSaveEdit}
          />
          <CategoryColumn
            addingId={addingId}
            editingId={editingId}
            items={draftCategoryTypes.income}
            savingId={savingId}
            title="수입"
            type="income"
            onAdd={handleAdd}
            onCancelEdit={handleCancelEdit}
            onChangeName={handleChangeName}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onMove={handleMove}
            onSaveEdit={handleSaveEdit}
          />
        </div>
      </section>
    </div>
  )
}

function AccountBookDetailPage({
  accountBooks,
  categoryTypes,
  onAddMonth,
  onCreateCategoryType,
  onDeleteCategoryType,
  onDeleteMonth,
  onSaveCategoryTypes,
  onUpdateCategoryType,
  onUpdateMonth,
}) {
  const { accountBookId } = useParams()
  const navigate = useNavigate()
  const [editingMonth, setEditingMonth] = useState(null)
  const [draftMonth, setDraftMonth] = useState(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const accountBook = accountBooks.find(
    (item) => item.account_book_id === accountBookId,
  )

  const monthRecords = useMemo(() => {
    if (!accountBook) {
      return []
    }

    return [...accountBook.months].sort((a, b) => b.month.localeCompare(a.month))
  }, [accountBook])

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

  const handleEdit = (month) => {
    setEditingMonth(month)
    setDraftMonth(parseMonth(month))
  }

  const handleCancelEdit = () => {
    setEditingMonth(null)
    setDraftMonth(null)
  }

  const handleSaveEdit = () => {
    const nextMonth = formatMonthValue(draftMonth.year, draftMonth.month)
    onUpdateMonth(accountBook.account_book_id, editingMonth, nextMonth)
    handleCancelEdit()
  }

  const handleOpenMonth = (month) => {
    navigate(`/account-books/${accountBook.account_book_id}/months/${month}`)
  }

  return (
    <main className="detail-page">
      <section className="detail-panel" aria-labelledby="detail-title">
        <div className="detail-heading">
          <div>
            <p className="create-eyebrow">선택한 가계부</p>
            <h1 id="detail-title">{accountBook.name}</h1>
          </div>
          <div className="detail-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
            >
              수입/지출 관리
            </button>
            <Link className="secondary-button" to="/account-books">
              목록으로
            </Link>
          </div>
        </div>

        <button
          className="wide-add-button"
          type="button"
          onClick={() => onAddMonth(accountBook.account_book_id)}
        >
          <FaPlus aria-hidden="true" />
          추가
        </button>

        <div className="monthly-record-list">
          {monthRecords.map((monthRecord) => {
            const isEditing = editingMonth === monthRecord.month

            return (
              <article
                className={`monthly-record-row${isEditing ? '' : ' clickable'}`}
                key={monthRecord.month}
                role={isEditing ? undefined : 'link'}
                tabIndex={isEditing ? undefined : 0}
                onClick={
                  isEditing ? undefined : () => handleOpenMonth(monthRecord.month)
                }
                onKeyDown={(event) => {
                  if (
                    !isEditing &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault()
                    handleOpenMonth(monthRecord.month)
                  }
                }}
              >
                <div className="record-month">
                  {isEditing ? (
                    <div className="month-edit-control">
                      <input
                        aria-label="연도"
                        type="number"
                        value={draftMonth.year}
                        onChange={(event) =>
                          setDraftMonth((draft) => ({
                            ...draft,
                            year: Number(event.target.value),
                          }))
                        }
                      />
                      <select
                        aria-label="월"
                        value={draftMonth.month}
                        onChange={(event) =>
                          setDraftMonth((draft) => ({
                            ...draft,
                            month: Number(event.target.value),
                          }))
                        }
                      >
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month} value={month}>
                            {month}월
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    formatMonth(monthRecord.month)
                  )}
                </div>
                <div className="record-money">
                  <span>수입</span>
                  <strong>{formatCurrency(monthRecord.income)}</strong>
                </div>
                <div className="record-money">
                  <span>지출</span>
                  <strong>{formatCurrency(monthRecord.expense)}</strong>
                </div>
                <div className="record-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="저장"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleSaveEdit()
                        }}
                      >
                        <FaCheck aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="취소"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleCancelEdit()
                        }}
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
                        onClick={(event) => {
                          event.stopPropagation()
                          handleEdit(monthRecord.month)
                        }}
                      >
                        <FaPen aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="삭제"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDeleteMonth(
                            accountBook.account_book_id,
                            monthRecord.month,
                          )
                        }}
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

      {isCategoryModalOpen && (
        <CategoryManageModal
          accountBookId={accountBook.account_book_id}
          categoryTypes={categoryTypes}
          onClose={() => setIsCategoryModalOpen(false)}
          onCreateCategory={onCreateCategoryType}
          onDeleteCategory={onDeleteCategoryType}
          onSave={onSaveCategoryTypes}
          onUpdateCategory={onUpdateCategoryType}
        />
      )}
    </main>
  )
}

export default AccountBookDetailPage
