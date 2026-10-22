import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'

import {
  createEnrollment,
  deleteEnrollment,
  fetchCourses,
  fetchEnrollments,
  fetchStudents,
  updateEnrollment,
} from './api'

import type {
  Course,
  Enrollment,
  EnrollmentStatus,
  NewEnrollment,
  Student,
} from './api'

type EnrollmentFormValues = {
  student_id: string
  course_id: string
  enrollment_date: string
  status: EnrollmentStatus
}

type Feedback = {
  type: 'success' | 'error'
  message: string
}

const PAGE_SIZE = 8

const EMPTY_FORM: EnrollmentFormValues = {
  student_id: '',
  course_id: '',
  enrollment_date: new Date().toISOString().slice(0, 10),
  status: 'active',
}

const STATUS_STYLES: Record<EnrollmentStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  completed: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  dropped: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function getStudentName(enrollment: Enrollment): string {
  return enrollment.student_name || `Student #${enrollment.student_id}`
}

function getCourseName(enrollment: Enrollment): string {
  return enrollment.course_name || `Course #${enrollment.course_id}`
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`my-auto w-full rounded-2xl border border-slate-200 bg-white shadow-2xl ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'student'>(
    'newest',
  )
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editingEnrollment, setEditingEnrollment] =
    useState<Enrollment | null>(null)
  const [viewingEnrollment, setViewingEnrollment] =
    useState<Enrollment | null>(null)
  const [deletingEnrollment, setDeletingEnrollment] =
    useState<Enrollment | null>(null)

  const [form, setForm] = useState<EnrollmentFormValues>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  async function loadData() {
    setLoading(true)
    setPageError('')

    try {
      const [enrollmentData, studentData, courseData] = await Promise.all([
        fetchEnrollments(),
        fetchStudents(),
        fetchCourses(),
      ])

      setEnrollments(enrollmentData)
      setStudents(studentData)
      setCourses(courseData)
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const activeCount = enrollments.filter(
    (enrollment) => enrollment.status === 'active',
  ).length

  const completedCount = enrollments.filter(
    (enrollment) => enrollment.status === 'completed',
  ).length

  const droppedCount = enrollments.filter(
    (enrollment) => enrollment.status === 'dropped',
  ).length

  const filteredEnrollments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const result = enrollments.filter((enrollment) => {
      const studentName = getStudentName(enrollment).toLowerCase()
      const studentEmail = (enrollment.student_email || '').toLowerCase()
      const courseName = getCourseName(enrollment).toLowerCase()
      const courseCode = (enrollment.course_code || '').toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        studentName.includes(normalizedSearch) ||
        studentEmail.includes(normalizedSearch) ||
        courseName.includes(normalizedSearch) ||
        courseCode.includes(normalizedSearch) ||
        String(enrollment.id).includes(normalizedSearch)

      const matchesStatus =
        statusFilter === 'all' || enrollment.status === statusFilter

      return matchesSearch && matchesStatus
    })

    result.sort((a, b) => {
      if (sortBy === 'student') {
        return getStudentName(a).localeCompare(getStudentName(b))
      }

      const dateA = new Date(a.enrollment_date).getTime()
      const dateB = new Date(b.enrollment_date).getTime()

      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [enrollments, search, statusFilter, sortBy])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEnrollments.length / PAGE_SIZE),
  )

  const currentPage = Math.min(page, totalPages)

  const paginatedEnrollments = filteredEnrollments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  function openCreateForm() {
    setEditingEnrollment(null)
    setForm({
      ...EMPTY_FORM,
      enrollment_date: new Date().toISOString().slice(0, 10),
    })
    setFormError('')
    setFormOpen(true)
  }

  function openEditForm(enrollment: Enrollment) {
    setEditingEnrollment(enrollment)
    setForm({
      student_id: String(enrollment.student_id),
      course_id: String(enrollment.course_id),
      enrollment_date: enrollment.enrollment_date
        ? enrollment.enrollment_date.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      status: enrollment.status,
    })
    setFormError('')
    setFormOpen(true)
  }

  function closeForm() {
    if (saving) return

    setFormOpen(false)
    setEditingEnrollment(null)
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setFeedback(null)

    const studentId = Number(form.student_id)
    const courseId = Number(form.course_id)

    if (!Number.isInteger(studentId) || studentId <= 0) {
      setFormError('Please select a student.')
      return
    }

    if (!Number.isInteger(courseId) || courseId <= 0) {
      setFormError('Please select a course.')
      return
    }

    if (!form.enrollment_date) {
      setFormError('Please select an enrollment date.')
      return
    }

    const payload: NewEnrollment = {
      student_id: studentId,
      course_id: courseId,
      enrollment_date: form.enrollment_date,
      status: form.status,
    }

    setSaving(true)

    try {
      if (editingEnrollment) {
        await updateEnrollment(editingEnrollment.id, payload)
        setFeedback({
          type: 'success',
          message: 'Enrollment updated successfully.',
        })
      } else {
        await createEnrollment(payload)
        setFeedback({
          type: 'success',
          message: 'Enrollment created successfully.',
        })
      }

      setFormOpen(false)
      setEditingEnrollment(null)
      await loadData()
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingEnrollment) return

    const enrollmentToDelete = deletingEnrollment
    setSaving(true)
    setFeedback(null)

    try {
      await deleteEnrollment(enrollmentToDelete.id)

      setDeletingEnrollment(null)
      setFeedback({
        type: 'success',
        message: 'Enrollment deleted successfully.',
      })

      await loadData()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
      })
    } finally {
      setSaving(false)
    }
  }

  function updateForm<K extends keyof EnrollmentFormValues>(
    key: K,
    value: EnrollmentFormValues[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const inputClass =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100'

  const labelClass = 'block text-sm font-medium text-slate-700'

  return (
    <div className="min-h-screen bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
              <BookOpen size={16} />
              Academic management
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Enrollments
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Manage student registrations and course enrollment status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin' : ''}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
              <Plus size={17} />
              Add enrollment
            </button>
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            )}
            <p className="flex-1">{feedback.message}</p>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss message"
              className="rounded p-0.5 opacity-70 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {pageError && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Could not load enrollments</p>
              <p className="mt-1">{pageError}</p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="mt-2 font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ClipboardList size={21} />
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                All records
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              Total enrollments
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? '—' : enrollments.length.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users size={21} />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              Active enrollments
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? '—' : activeCount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Currently active registrations
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CheckCircle2 size={21} />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              Completed
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? '—' : completedCount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Successfully completed courses
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <X size={21} />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              Dropped
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? '—' : droppedCount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Withdrawn registrations
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Enrollment records
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search, review, and manage course registrations.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 sm:min-w-64">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Search student or course..."
                    aria-label="Search enrollments"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value)
                      setPage(1)
                    }}
                    aria-label="Filter by status"
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 sm:w-40"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(event) => {
                      setSortBy(
                        event.target.value as 'newest' | 'oldest' | 'student',
                      )
                      setPage(1)
                    }}
                    aria-label="Sort enrollments"
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 sm:w-44"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="student">Student name</option>
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
              <LoaderCircle size={28} className="animate-spin text-indigo-600" />
              <p className="text-sm">Loading enrollment records...</p>
            </div>
          ) : paginatedEnrollments.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardList size={26} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {search || statusFilter !== 'all'
                  ? 'No matching enrollments'
                  : 'No enrollments yet'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {search || statusFilter !== 'all'
                  ? 'Try changing your search or filters.'
                  : 'Create an enrollment to connect a student with a course.'}
              </p>
              {search || statusFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                    setPage(1)
                  }}
                  className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Plus size={16} />
                  Add enrollment
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Student
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Course
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Enrollment date
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedEnrollments.map((enrollment) => (
                      <tr
                        key={enrollment.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">
                              {getInitials(getStudentName(enrollment))}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {getStudentName(enrollment)}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {enrollment.student_email || 'No email available'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {getCourseName(enrollment)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {enrollment.course_code || `Course #${enrollment.course_id}`}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(enrollment.enrollment_date)}
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={enrollment.status} />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingEnrollment(enrollment)}
                              title="View enrollment"
                              aria-label="View enrollment"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Eye size={17} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(enrollment)}
                              title="Edit enrollment"
                              aria-label="Edit enrollment"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingEnrollment(enrollment)}
                              title="Delete enrollment"
                              aria-label="Delete enrollment"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-500">
                  Showing{' '}
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </span>
                  {' '}to{' '}
                  <span className="font-semibold text-slate-700">
                    {Math.min(currentPage * PAGE_SIZE, filteredEnrollments.length)}
                  </span>
                  {' '}of{' '}
                  <span className="font-semibold text-slate-700">
                    {filteredEnrollments.length}
                  </span>
                  {' '}enrollments
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span className="px-2 text-sm font-medium text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((previous) => Math.min(totalPages, previous + 1))
                    }
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          CampusFlow · Enrollment management
        </p>
      </div>

      {formOpen && (
        <Modal
          title={editingEnrollment ? 'Edit enrollment' : 'Create enrollment'}
          subtitle={
            editingEnrollment
              ? 'Update the student, course, date, or status.'
              : 'Register a student for a course.'
          }
          onClose={closeForm}
          wide
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="enrollment-student" className={labelClass}>
                  Student <span className="text-rose-500">*</span>
                </label>
                <select
                  id="enrollment-student"
                  required
                  value={form.student_id}
                  onChange={(event) =>
                    updateForm('student_id', event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} — {student.email}
                    </option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    No students found. Add a student first.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="enrollment-course" className={labelClass}>
                  Course <span className="text-rose-500">*</span>
                </label>
                <select
                  id="enrollment-course"
                  required
                  value={form.course_id}
                  onChange={(event) =>
                    updateForm('course_id', event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
                {courses.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    No courses found. Add a course first.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="enrollment-date" className={labelClass}>
                  Enrollment date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="enrollment-date"
                  type="date"
                  required
                  value={form.enrollment_date}
                  onChange={(event) =>
                    updateForm('enrollment_date', event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="enrollment-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="enrollment-status"
                  value={form.status}
                  onChange={(event) =>
                    updateForm('status', event.target.value as EnrollmentStatus)
                  }
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || students.length === 0 || courses.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <LoaderCircle size={16} className="animate-spin" />}
                {saving
                  ? 'Saving...'
                  : editingEnrollment
                    ? 'Save changes'
                    : 'Create enrollment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingEnrollment && (
        <Modal
          title="Enrollment details"
          subtitle={`Enrollment #${viewingEnrollment.id}`}
          onClose={() => setViewingEnrollment(null)}
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                {getInitials(getStudentName(viewingEnrollment))}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {getStudentName(viewingEnrollment)}
                </p>
                <p className="mt-1 break-all text-sm text-slate-500">
                  {viewingEnrollment.student_email || 'No email available'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Course
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {getCourseName(viewingEnrollment)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {viewingEnrollment.course_code || `Course #${viewingEnrollment.course_id}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Enrollment date
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-slate-800">
                    {formatDate(viewingEnrollment.enrollment_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </p>
                  <div className="mt-1.5">
                    <StatusBadge status={viewingEnrollment.status} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Record created
                </p>
                <p className="mt-1.5 text-sm text-slate-700">
                  {formatDate(viewingEnrollment.created_at)}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  const enrollment = viewingEnrollment
                  setViewingEnrollment(null)
                  openEditForm(enrollment)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Pencil size={16} />
                Edit enrollment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deletingEnrollment && (
        <Modal
          title="Delete enrollment?"
          subtitle="This action cannot be undone."
          onClose={() => {
            if (!saving) setDeletingEnrollment(null)
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Trash2 size={20} />
            </div>
            <div>
              <p className="text-sm leading-6 text-slate-600">
                Are you sure you want to delete the enrollment for{' '}
                <span className="font-semibold text-slate-900">
                  {getStudentName(deletingEnrollment)}
                </span>
                {' '}in{' '}
                <span className="font-semibold text-slate-900">
                  {getCourseName(deletingEnrollment)}
                </span>
                ?
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeletingEnrollment(null)}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              {saving ? 'Deleting...' : 'Delete enrollment'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
