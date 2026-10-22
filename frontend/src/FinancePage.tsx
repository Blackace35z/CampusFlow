
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import {
  createPayment,
  deletePayment,
  fetchPayments,
  fetchPaymentSummary,
  fetchStudents,
  updatePayment,
} from './api'
import type {
  NewPayment,
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentSummary,
  Student,
} from './api'

type PaymentForm = {
  student_id: string
  amount: string
  due_date: string
  payment_date: string
  status: PaymentStatus
  payment_method: PaymentMethod | ''
  description: string
}

const emptyForm: PaymentForm = {
  student_id: '',
  amount: '',
  due_date: '',
  payment_date: '',
  status: 'pending',
  payment_method: '',
  description: '',
}

const statusStyles: Record<PaymentStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  overdue: 'bg-rose-50 text-rose-700 ring-rose-600/15',
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

function formatMoney(value: string | number, currency = 'TND'): string {
  const amount = Number(value)

  return new Intl.NumberFormat('en-TN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function formatDate(value: string | null): string {
  if (!value) return '—'

  const date = new Date(`${value.slice(0, 10)}T12:00:00`)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStudentName(payment: Payment): string {
  return payment.student_name?.trim() || `Student #${payment.student_id}`
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function getToday(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getEffectiveStatus(payment: Payment): PaymentStatus {
  if (
    payment.status === 'pending' &&
    payment.due_date &&
    payment.due_date < getToday()
  ) {
    return 'overdue'
  }

  return payment.status
}

function FinancePage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [form, setForm] = useState<PaymentForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const [paymentData, summaryData, studentData] = await Promise.all([
        fetchPayments(),
        fetchPaymentSummary(),
        fetchStudents(),
      ])

      setPayments(paymentData)
      setSummary(summaryData)
      setStudents(studentData)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load financial data.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase()

    return payments
      .filter((payment) => {
        const matchesSearch =
          !query ||
          [
            getStudentName(payment),
            payment.student_email,
            payment.description ?? '',
            payment.course_name ?? '',
            payment.payment_method ?? '',
            String(payment.id),
          ]
            .join(' ')
            .toLowerCase()
            .includes(query)

        const effectiveStatus = getEffectiveStatus(payment)
        const matchesStatus =
          statusFilter === 'all' || effectiveStatus === statusFilter

        return matchesSearch && matchesStatus
      })
      .sort((first, second) => {
        const firstDate = first.created_at
          ? new Date(first.created_at).getTime()
          : 0
        const secondDate = second.created_at
          ? new Date(second.created_at).getTime()
          : 0

        return secondDate - firstDate
      })
  }, [payments, search, statusFilter])

  const openCreateModal = () => {
    setEditingPayment(null)
    setForm({
      ...emptyForm,
      due_date: getToday(),
    })
    setFormError(null)
    setNotice(null)
    setModalOpen(true)
  }

  const openEditModal = (payment: Payment) => {
    setEditingPayment(payment)
    setForm({
      student_id: String(payment.student_id),
      amount: payment.amount,
      due_date: payment.due_date ?? '',
      payment_date: payment.payment_date ?? '',
      status: payment.status,
      payment_method: payment.payment_method ?? '',
      description: payment.description ?? '',
    })
    setFormError(null)
    setNotice(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return

    setModalOpen(false)
    setEditingPayment(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    const amount = Number(form.amount)
    const studentId = Number(form.student_id)

    if (!Number.isInteger(studentId) || studentId <= 0) {
      setFormError('Please select a student.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter an amount greater than zero.')
      return
    }

    if (Math.round(amount * 1000) / 1000 !== amount) {
      setFormError('The amount can have at most three decimal places.')
      return
    }

    if (form.status === 'paid' && !form.payment_date) {
      setFormError('A payment date is required when marking a payment as paid.')
      return
    }

    if (
      form.status === 'overdue' &&
      (!form.due_date || form.due_date >= getToday())
    ) {
      setFormError('An overdue payment must have a due date in the past.')
      return
    }

    if (
      form.payment_date &&
      form.payment_date > getToday()
    ) {
      setFormError('The payment date cannot be in the future.')
      return
    }

    const payload: NewPayment = {
      student_id: studentId,
      amount,
      currency: 'TND',
      due_date: form.due_date || null,
      payment_date: form.payment_date || null,
      status: form.status,
      payment_method: form.payment_method || null,
      description: form.description.trim() || null,
    }

    setSaving(true)

    try {
      if (editingPayment) {
        await updatePayment(editingPayment.id, payload)
      } else {
        await createPayment(payload)
      }

      setModalOpen(false)
      setEditingPayment(null)
      setForm(emptyForm)
      setNotice(
        editingPayment
          ? 'Payment updated successfully.'
          : 'Payment recorded successfully.',
      )

      await loadData(true)
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save this payment.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    setError(null)
    setNotice(null)

    try {
      await deletePayment(deleteTarget.id)
      setDeleteTarget(null)
      setNotice('Payment deleted successfully.')
      await loadData(true)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete this payment.',
      )
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = () => {
    const headers = [
      'Payment ID',
      'Student',
      'Student Email',
      'Course',
      'Amount',
      'Currency',
      'Status',
      'Payment Method',
      'Due Date',
      'Payment Date',
      'Description',
    ]

    const rows = filteredPayments.map((payment) => [
      payment.id,
      getStudentName(payment),
      payment.student_email,
      payment.course_name ?? '',
      payment.amount,
      payment.currency,
      getEffectiveStatus(payment),
      payment.payment_method ?? '',
      payment.due_date ?? '',
      payment.payment_date ?? '',
      payment.description ?? '',
    ])

    const escapeCell = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(','))
      .join('\r\n')

    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `campusflow-payments-${getToday()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const paidCount = summary?.paid_count ?? 0
  const pendingCount = summary?.pending_count ?? 0
  const overdueCount = summary?.overdue_count ?? 0
  const currency = summary?.currency ?? 'TND'

  const metrics = [
    {
      label: 'Collected revenue',
      value: formatMoney(summary?.collected_revenue ?? '0', currency),
      detail: `${paidCount} payment${paidCount === 1 ? '' : 's'} completed`,
      icon: ArrowUpRight,
      iconStyle: 'bg-emerald-50 text-emerald-600',
      accent: 'text-emerald-600',
    },
    {
      label: 'Outstanding balance',
      value: formatMoney(summary?.outstanding_balance ?? '0', currency),
      detail: `${pendingCount} pending payment${pendingCount === 1 ? '' : 's'}`,
      icon: Wallet,
      iconStyle: 'bg-indigo-50 text-indigo-600',
      accent: 'text-indigo-600',
    },
    {
      label: 'Overdue amount',
      value: formatMoney(summary?.overdue_amount ?? '0', currency),
      detail: `${overdueCount} overdue payment${overdueCount === 1 ? '' : 's'}`,
      icon: ArrowDownRight,
      iconStyle: 'bg-rose-50 text-rose-600',
      accent: 'text-rose-600',
    },
    {
      label: 'Total payments',
      value: (summary?.total_payments ?? 0).toLocaleString(),
      detail: 'All recorded payment entries',
      icon: CreditCard,
      iconStyle: 'bg-amber-50 text-amber-600',
      accent: 'text-amber-600',
    },
  ]

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">
              Financial management
            </span>
          </div>

          <h2 className="font-[Manrope] text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Finance overview
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Track tuition payments, monitor outstanding balances, and keep
            your university&apos;s financial records organized.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredPayments.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
          >
            <Plus size={16} />
            Record payment
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-1 break-words text-xs leading-5">{error}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError(null)}
            className="rounded-lg p-1 hover:bg-rose-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 size={18} className="shrink-0" />
          <p className="flex-1">{notice}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
            className="rounded-lg p-1 hover:bg-emerald-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon

          return (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${metric.iconStyle}`}
                >
                  <Icon size={21} strokeWidth={1.8} />
                </span>
                <span className={`text-[10px] font-bold ${metric.accent}`}>
                  {metric.label === 'Collected revenue'
                    ? 'REVENUE'
                    : metric.label === 'Outstanding balance'
                      ? 'PENDING'
                      : metric.label === 'Overdue amount'
                        ? 'ATTENTION'
                        : 'ACTIVITY'}
                </span>
              </div>

              <p className="text-sm font-medium text-slate-500">
                {metric.label}
              </p>

              <p className="mt-2 break-words font-[Manrope] text-2xl font-extrabold tracking-tight text-slate-900">
                {loading ? '—' : metric.value}
              </p>

              <p className="mt-2 text-[11px] text-slate-400">
                {metric.detail}
              </p>
            </article>
          )
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h3 className="font-[Manrope] text-base font-bold text-slate-900">
              Payment records
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              View and manage student tuition payments
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing || loading}
            className="flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw
              size={14}
              className={refreshing ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-6">
          <label className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, course, or payment..."
              aria-label="Search payments"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs font-medium text-slate-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter payments by status"
              className="min-w-[135px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-300"
            >
              <option value="all">All payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center gap-3">
            <LoaderCircle size={27} className="animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Loading payment records...</p>
          </div>
        ) : filteredPayments.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Student
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Amount
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Due date
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Method
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Payment date
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((payment) => {
                    const studentName = getStudentName(payment)
                    const status = getEffectiveStatus(payment)

                    return (
                      <tr
                        key={payment.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">
                              {getInitials(studentName) || '?'}
                            </span>
                            <div className="min-w-0">
                              <p className="max-w-[210px] truncate text-sm font-semibold text-slate-800">
                                {studentName}
                              </p>
                              <p className="mt-1 max-w-[210px] truncate text-[11px] text-slate-400">
                                {payment.student_email}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                Payment #{payment.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="whitespace-nowrap text-sm font-bold text-slate-800">
                            {formatMoney(payment.amount, payment.currency)}
                          </p>
                          {payment.course_name && (
                            <p className="mt-1 max-w-[160px] truncate text-[11px] text-slate-400">
                              {payment.course_name}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className="whitespace-nowrap text-xs font-medium text-slate-600">
                            {formatDate(payment.due_date)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="whitespace-nowrap text-xs text-slate-600">
                            {payment.payment_method
                              ? paymentMethods.find(
                                  (method) =>
                                    method.value === payment.payment_method,
                                )?.label ?? payment.payment_method
                              : 'Not specified'}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold capitalize ring-1 ring-inset ${statusStyles[status]}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {status}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="whitespace-nowrap text-xs text-slate-600">
                            {formatDate(payment.payment_date)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              aria-label={`Edit payment ${payment.id}`}
                              title="Edit payment"
                              onClick={() => openEditModal(payment)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              aria-label={`Delete payment ${payment.id}`}
                              title={
                                payment.status === 'paid'
                                  ? 'Paid payments cannot be deleted'
                                  : 'Delete payment'
                              }
                              disabled={payment.status === 'paid'}
                              onClick={() => setDeleteTarget(payment)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>
                Showing {filteredPayments.length} of {payments.length} payment
                {payments.length === 1 ? '' : 's'}
              </p>
              <p className="flex items-center gap-1.5 font-medium text-emerald-600">
                <CheckCircle2 size={13} />
                Synced with your database
              </p>
            </div>
          </>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <Banknote size={27} />
            </span>
            <h4 className="mt-4 text-sm font-bold text-slate-800">
              {payments.length === 0
                ? 'No payment records yet'
                : 'No payments found'}
            </h4>
            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">
              {payments.length === 0
                ? 'Record your first payment to start tracking revenue and outstanding tuition.'
                : 'Try another search term or change the status filter.'}
            </p>
            {payments.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus size={15} />
                Record first payment
              </button>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={19} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Paid payments
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {paidCount} payment{paidCount === 1 ? '' : 's'} recorded as
              completed.
            </p>
          </div>
        </article>

        <article className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock3 size={19} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Pending payments
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Follow up on tuition that has not yet been collected.
            </p>
          </div>
        </article>

        <article className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <CalendarDays size={19} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Overdue payments
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Review late balances and contact students when appropriate.
            </p>
          </div>
        </article>
      </section>

      <footer className="flex flex-col gap-2 pb-4 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>CampusFlow Finance · All amounts are displayed in TND.</p>
        <p>
          {summary
            ? `${summary.total_payments} financial record${summary.total_payments === 1 ? '' : 's'}`
            : 'Financial summary unavailable'}
        </p>
      </footer>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h3
                  id="payment-modal-title"
                  className="font-[Manrope] text-lg font-bold text-slate-900"
                >
                  {editingPayment ? 'Edit payment' : 'Record a payment'}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Enter the payment information below.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close payment form"
                disabled={saving}
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-5 sm:p-6">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="payment-student"
                  className="mb-2 block text-xs font-semibold text-slate-700"
                >
                  Student <span className="text-rose-500">*</span>
                </label>
                <select
                  id="payment-student"
                  required
                  value={form.student_id}
                  onChange={(event) =>
                    setForm({ ...form, student_id: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} — {student.email}
                    </option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p className="mt-2 text-[11px] text-amber-700">
                    No students were loaded. Create a student first or refresh
                    the page.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="payment-amount"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    Amount (TND) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="payment-amount"
                    required
                    type="number"
                    min="0.001"
                    max="999999999"
                    step="0.001"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({ ...form, amount: event.target.value })
                    }
                    placeholder="450.000"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="payment-status"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="payment-status"
                    value={form.status}
                    onChange={(event) => {
                      const status = event.target.value as PaymentStatus

                      setForm({
                        ...form,
                        status,
                        payment_date:
                          status === 'paid'
                            ? form.payment_date || getToday()
                            : form.payment_date,
                      })
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="payment-due-date"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    Due date
                  </label>
                  <input
                    id="payment-due-date"
                    type="date"
                    value={form.due_date}
                    onChange={(event) =>
                      setForm({ ...form, due_date: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="payment-date"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    Payment date
                    {form.status === 'paid' && (
                      <span className="text-rose-500"> *</span>
                    )}
                  </label>
                  <input
                    id="payment-date"
                    type="date"
                    max={getToday()}
                    required={form.status === 'paid'}
                    value={form.payment_date}
                    onChange={(event) =>
                      setForm({ ...form, payment_date: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="payment-method"
                  className="mb-2 block text-xs font-semibold text-slate-700"
                >
                  Payment method
                </label>
                <select
                  id="payment-method"
                  value={form.payment_method}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      payment_method: event.target.value as PaymentMethod | '',
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Not specified</option>
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="payment-description"
                  className="mb-2 block text-xs font-semibold text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="payment-description"
                  rows={3}
                  maxLength={500}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="e.g. First semester tuition"
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {editingPayment?.status === 'paid' && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  This payment is already marked as paid. Its financial history
                  is protected against deletion by the backend.
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || students.length === 0}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <Plus size={15} />
                  )}
                  {saving
                    ? 'Saving...'
                    : editingPayment
                      ? 'Save changes'
                      : 'Record payment'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-payment-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Trash2 size={22} />
            </span>

            <h3
              id="delete-payment-title"
              className="mt-4 font-[Manrope] text-lg font-bold text-slate-900"
            >
              Delete payment record?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              You&apos;re about to delete payment #{deleteTarget.id} for{' '}
              <span className="font-semibold text-slate-700">
                {getStudentName(deleteTarget)}
              </span>
              . This action cannot be undone.
            </p>

            {deleteTarget.status === 'paid' && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                Paid records must be preserved. The backend will reject this
                deletion.
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting || deleteTarget.status === 'paid'}
                onClick={() => void handleDelete()}
                className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting && (
                  <LoaderCircle size={14} className="animate-spin" />
                )}
                Delete payment
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default FinancePage
