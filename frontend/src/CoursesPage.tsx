
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'

const API_BASE_URL = 'http://127.0.0.1:8000'
const PAGE_SIZE = 8

interface Course {
  id: number
  name: string
  code: string
  description: string | null
  credits: number
  professor_id: number | null
  created_at: string | null
}

interface Professor {
  id: number
  first_name: string
  last_name: string
  email: string
  created_at: string | null
}

interface CourseForm {
  name: string
  code: string
  description: string
  credits: string
  professor_id: string
}

type FormErrors = Partial<Record<keyof CourseForm, string>>
type SortField = 'name' | 'code' | 'credits' | 'created_at'
type SortDirection = 'asc' | 'desc'

const EMPTY_FORM: CourseForm = {
  name: '',
  code: '',
  description: '',
  credits: '3',
  professor_id: '',
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`

    try {
      const body = await response.json()
      message = body.detail || body.message || message
    } catch {
      // Keep the default error message.
    }

    throw new Error(message)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

function getProfessorName(
  professorId: number | null,
  professors: Professor[],
) {
  if (professorId === null) return 'Not assigned'

  const professor = professors.find((item) => item.id === professorId)

  return professor
    ? `${professor.first_name} ${professor.last_name}`
    : 'Unknown professor'
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function validateCourse(form: CourseForm): FormErrors {
  const errors: FormErrors = {}

  if (form.name.trim().length < 2) {
    errors.name = 'Course name must contain at least 2 characters.'
  } else if (form.name.trim().length > 150) {
    errors.name = 'Course name must be 150 characters or fewer.'
  }

  if (form.code.trim().length < 2) {
    errors.code = 'Course code must contain at least 2 characters.'
  } else if (form.code.trim().length > 20) {
    errors.code = 'Course code must be 20 characters or fewer.'
  }

  const credits = Number(form.credits)

  if (!Number.isInteger(credits) || credits < 1 || credits > 30) {
    errors.credits = 'Credits must be a whole number between 1 and 30.'
  }

  if (form.description.trim().length > 2000) {
    errors.description = 'Description must be 2,000 characters or fewer.'
  }

  return errors
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [professors, setProfessors] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null)

  const [form, setForm] = useState<CourseForm>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const [courseResponse, professorResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/courses`),
        fetch(`${API_BASE_URL}/api/professors`),
      ])

      const [courseData, professorData] = await Promise.all([
        readResponse<Course[]>(courseResponse),
        readResponse<Professor[]>(professorResponse),
      ])

      setCourses(courseData)
      setProfessors(professorData)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to load courses. Please check that the API is running.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!successMessage) return

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage('')
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()

    return courses
      .filter((course) => {
        const professorName = getProfessorName(
          course.professor_id,
          professors,
        )

        return (
          !query ||
          course.name.toLowerCase().includes(query) ||
          course.code.toLowerCase().includes(query) ||
          (course.description ?? '').toLowerCase().includes(query) ||
          professorName.toLowerCase().includes(query) ||
          String(course.id).includes(query)
        )
      })
      .sort((a, b) => {
        let comparison = 0

        if (sortField === 'credits') {
          comparison = a.credits - b.credits
        } else if (sortField === 'created_at') {
          comparison =
            new Date(a.created_at ?? 0).getTime() -
            new Date(b.created_at ?? 0).getTime()
        } else {
          comparison = a[sortField].localeCompare(b[sortField])
        }

        return sortDirection === 'asc' ? comparison : -comparison
      })
  }, [courses, professors, search, sortField, sortDirection])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCourses.length / PAGE_SIZE),
  )

  const safePage = Math.min(currentPage, totalPages)

  const paginatedCourses = filteredCourses.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  const firstVisible =
    filteredCourses.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1

  const lastVisible = Math.min(
    safePage * PAGE_SIZE,
    filteredCourses.length,
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setCurrentPage(1)
  }

  function handleSortChange(field: SortField) {
    if (sortField === field) {
      setSortDirection((previous) =>
        previous === 'asc' ? 'desc' : 'asc',
      )
    } else {
      setSortField(field)
      setSortDirection('asc')
    }

    setCurrentPage(1)
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setEditingCourse(null)
    setShowCreateForm(false)
  }

  function openCreateForm() {
    setError('')
    setForm(EMPTY_FORM)
    setFormErrors({})
    setEditingCourse(null)
    setShowCreateForm(true)
  }

  function openEditForm(course: Course) {
    setViewingCourse(null)
    setEditingCourse(course)
    setForm({
      name: course.name,
      code: course.code,
      description: course.description ?? '',
      credits: String(course.credits),
      professor_id:
        course.professor_id === null ? '' : String(course.professor_id),
    })
    setFormErrors({})
    setError('')
    setShowCreateForm(true)
  }

  function updateField(field: keyof CourseForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
    setFormErrors((previous) => ({ ...previous, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationErrors = validateCourse(form)
    setFormErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      credits: Number(form.credits),
      professor_id: form.professor_id ? Number(form.professor_id) : null,
    }

    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const isEditing = editingCourse !== null

      const response = await fetch(
        isEditing
          ? `${API_BASE_URL}/api/courses/${editingCourse.id}`
          : `${API_BASE_URL}/api/courses`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      const savedCourse = await readResponse<Course>(response)

      if (isEditing) {
        setCourses((previous) =>
          previous.map((course) =>
            course.id === savedCourse.id ? savedCourse : course,
          ),
        )
        setSuccessMessage('Course updated successfully.')
      } else {
        setCourses((previous) => [savedCourse, ...previous])
        setCurrentPage(1)
        setSuccessMessage('Course added successfully.')
      }

      resetForm()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to save course.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCourse() {
    if (!deletingCourse) return

    setDeleting(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/courses/${deletingCourse.id}`,
        { method: 'DELETE' },
      )

      await readResponse<void>(response)

      const deletedId = deletingCourse.id

      setCourses((previous) =>
        previous.filter((course) => course.id !== deletedId),
      )
      setDeletingCourse(null)

      if (viewingCourse?.id === deletedId) setViewingCourse(null)
      if (editingCourse?.id === deletedId) resetForm()

      setSuccessMessage('Course deleted successfully.')
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to delete course.',
      )
    } finally {
      setDeleting(false)
    }
  }

  function renderFieldError(message?: string) {
    if (!message) return null

    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
        <AlertCircle size={13} />
        {message}
      </p>
    )
  }

  function renderSortButton(field: SortField, label: string) {
    const active = sortField === field

    return (
      <button
        type="button"
        onClick={() => handleSortChange(field)}
        className={`inline-flex items-center gap-1.5 font-semibold transition ${
          active
            ? 'text-indigo-700'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        {label}
        <ChevronDown
          size={14}
          className={`transition ${
            active && sortDirection === 'desc' ? 'rotate-180' : ''
          } ${active ? 'opacity-100' : 'opacity-40'}`}
        />
      </button>
    )
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50'

  const labelClass = 'mb-2 block text-sm font-medium text-slate-700'

  const primaryButton =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'

  const secondaryButton =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <BookOpen size={16} />
              CampusFlow / Directory
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Courses
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage courses, academic credits, and professor assignments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={loading || refreshing}
              className={secondaryButton}
            >
              <RefreshCw
                size={16}
                className={refreshing ? 'animate-spin' : ''}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                if (showCreateForm) {
                  if (!saving) resetForm()
                } else {
                  openCreateForm()
                }
              }}
              disabled={saving}
              className={primaryButton}
            >
              {showCreateForm ? <X size={16} /> : <Plus size={17} />}
              {showCreateForm ? 'Close form' : 'Add course'}
            </button>
          </div>
        </div>

        {/* Feedback messages */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 break-words">{error}</div>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={19} className="shrink-0" />
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              aria-label="Dismiss success message"
              className="ml-auto"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total courses
              </p>
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                <BookOpen size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? '—' : courses.length.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Courses registered in CampusFlow
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Assigned courses
              </p>
              <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600">
                <GraduationCap size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {loading
                ? '—'
                : courses
                    .filter((course) => course.professor_id !== null)
                    .length.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Courses with a professor assigned
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Available professors
              </p>
              <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                <Users size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? '—' : professors.length.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Professors available for assignment
            </p>
          </div>
        </div>

        {/* Course directory */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:px-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Course directory
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Browse and manage your university courses.
                </p>
              </div>

              <div className="relative w-full sm:max-w-sm">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name, code, or professor..."
                  aria-label="Search courses"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Directory toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-slate-500">
              {loading ? (
                'Loading course records...'
              ) : filteredCourses.length === 0 ? (
                'No matching courses'
              ) : (
                <>
                  Showing{' '}
                  <span className="font-semibold text-slate-800">
                    {firstVisible}–{lastVisible}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-800">
                    {filteredCourses.length}
                  </span>{' '}
                  matching courses
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Sort by:</span>
              {renderSortButton('name', 'Name')}
              {renderSortButton('code', 'Code')}
              {renderSortButton('credits', 'Credits')}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-16">
              <LoaderCircle
                size={28}
                className="animate-spin text-indigo-600"
              />
              <p className="text-sm text-slate-500">
                Loading course directory...
              </p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
                <BookOpen size={27} />
              </div>
              <h3 className="font-semibold text-slate-900">
                {courses.length === 0 ? 'No courses yet' : 'No courses found'}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {courses.length === 0
                  ? 'Your course directory is empty. Add your first course to get started.'
                  : 'Try another course name, code, or professor, or clear your search to see all courses.'}
              </p>
              {courses.length === 0 ? (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className={`${primaryButton} mt-5`}
                >
                  <Plus size={16} />
                  Add first course
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-white">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-500">
                      Course
                    </th>
                    <th className="px-4 py-4 font-semibold text-slate-500">
                      {renderSortButton('code', 'Course code')}
                    </th>
                    <th className="px-4 py-4 font-semibold text-slate-500">
                      Professor
                    </th>
                    <th className="px-4 py-4 font-semibold text-slate-500">
                      {renderSortButton('credits', 'Credits')}
                    </th>
                    <th className="px-4 py-4 font-semibold text-slate-500">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right font-semibold text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCourses.map((course) => {
                    const professorName = getProfessorName(
                      course.professor_id,
                      professors,
                    )

                    return (
                      <tr
                        key={course.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">
                              {getInitials(course.name) || 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[240px] truncate font-semibold text-slate-900">
                                {course.name}
                              </p>
                              <p className="mt-0.5 max-w-[240px] truncate text-xs text-slate-500">
                                {course.description || 'No description provided'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                            {course.code}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-semibold text-sky-700">
                              {professorName === 'Not assigned'
                                ? '—'
                                : getInitials(professorName)}
                            </div>
                            <span className="text-slate-600">
                              {professorName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                            {course.credits}{' '}
                            {course.credits === 1 ? 'credit' : 'credits'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          {formatDate(course.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingCourse(course)}
                              title="View course"
                              aria-label={`View ${course.name}`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <Eye size={17} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(course)}
                              title="Edit course"
                              aria-label={`Edit ${course.name}`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-sky-50 hover:text-sky-700"
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCourse(course)}
                              title="Delete course"
                              aria-label={`Delete ${course.name}`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-slate-500">
              {filteredCourses.length === 0 ? (
                'Showing 0 courses'
              ) : (
                <>
                  Showing{' '}
                  <span className="font-semibold text-slate-800">
                    {firstVisible}–{lastVisible}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-800">
                    {filteredCourses.length}
                  </span>{' '}
                  courses
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
                disabled={safePage <= 1}
                className={secondaryButton}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="min-w-20 text-center text-sm font-medium text-slate-600">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safePage >= totalPages}
                className={secondaryButton}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Create and edit course form */}
        {showCreateForm && (
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingCourse ? 'Edit course' : 'Add a course'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingCourse
                    ? 'Update the course information below.'
                    : 'Enter the information for your new course.'}
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                aria-label="Close course form"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
                <div className="sm:col-span-2">
                  <label htmlFor="course-name" className={labelClass}>
                    Course name *
                  </label>
                  <input
                    id="course-name"
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder="e.g. Introduction to Data Analytics"
                    className={inputClass}
                    maxLength={150}
                    aria-invalid={Boolean(formErrors.name)}
                  />
                  {renderFieldError(formErrors.name)}
                </div>

                <div>
                  <label htmlFor="course-code" className={labelClass}>
                    Course code *
                  </label>
                  <input
                    id="course-code"
                    value={form.code}
                    onChange={(event) => updateField('code', event.target.value)}
                    placeholder="e.g. DATA101"
                    className={inputClass}
                    maxLength={20}
                    aria-invalid={Boolean(formErrors.code)}
                  />
                  {renderFieldError(formErrors.code)}
                </div>

                <div>
                  <label htmlFor="course-credits" className={labelClass}>
                    Credits *
                  </label>
                  <input
                    id="course-credits"
                    type="number"
                    min={1}
                    max={30}
                    step={1}
                    value={form.credits}
                    onChange={(event) =>
                      updateField('credits', event.target.value)
                    }
                    className={inputClass}
                    aria-invalid={Boolean(formErrors.credits)}
                  />
                  {renderFieldError(formErrors.credits)}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="course-professor" className={labelClass}>
                    Assign professor
                  </label>
                  <div className="relative">
                    <select
                      id="course-professor"
                      value={form.professor_id}
                      onChange={(event) =>
                        updateField('professor_id', event.target.value)
                      }
                      className={`${inputClass} appearance-none pr-10`}
                    >
                      <option value="">No professor assigned</option>
                      {professors.map((professor) => (
                        <option key={professor.id} value={professor.id}>
                          {professor.first_name} {professor.last_name} —{' '}
                          {professor.email}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                  {professors.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      No professors found. You can assign one later.
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="course-description" className={labelClass}>
                    Description
                  </label>
                  <textarea
                    id="course-description"
                    value={form.description}
                    onChange={(event) =>
                      updateField('description', event.target.value)
                    }
                    placeholder="Describe the course and what students will learn..."
                    rows={4}
                    maxLength={2000}
                    className={inputClass}
                    aria-invalid={Boolean(formErrors.description)}
                  />
                  <div className="mt-1 flex items-center justify-between gap-3">
                    {formErrors.description ? (
                      renderFieldError(formErrors.description)
                    ) : (
                      <p className="text-xs text-slate-400">Optional</p>
                    )}
                    <p className="text-xs text-slate-400">
                      {form.description.length}/2000
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className={secondaryButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={primaryButton}
                >
                  {saving ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {saving
                    ? 'Saving...'
                    : editingCourse
                      ? 'Save changes'
                      : 'Create course'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Course details */}
        {viewingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700">
                    {getInitials(viewingCourse.name) || 'C'}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {viewingCourse.name}
                    </h2>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {viewingCourse.code}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingCourse(null)}
                  aria-label="Close course details"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Credits
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {viewingCourse.credits}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Created
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(viewingCourse.created_at)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Assigned professor
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    {getProfessorName(
                      viewingCourse.professor_id,
                      professors,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Description
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {viewingCourse.description ||
                      'No description has been added.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setViewingCourse(null)}
                  className={secondaryButton}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(viewingCourse)}
                  className={primaryButton}
                >
                  <Pencil size={16} />
                  Edit course
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deletingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2 size={22} />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Delete this course?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                You are about to delete{' '}
                <span className="font-semibold text-slate-800">
                  {deletingCourse.name}
                </span>{' '}
                ({deletingCourse.code}). This action cannot be undone.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeletingCourse(null)}
                  disabled={deleting}
                  className={secondaryButton}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteCourse()}
                  disabled={deleting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  {deleting ? 'Deleting...' : 'Delete course'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
