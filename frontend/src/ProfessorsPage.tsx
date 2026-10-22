

import { useEffect, useMemo, useState } from 'react'

import type { FormEvent } from 'react'

import {

  AlertCircle,

  CheckCircle2,

  ChevronDown,

  ChevronLeft,

  ChevronRight,

  Eye,

  LoaderCircle,

  Mail,

  Pencil,

  Plus,

  RefreshCw,

  Search,

  Save,

  Trash2,

  UserPlus,

  Users,

  X,

} from 'lucide-react'

import {

  createProfessor,

  deleteProfessor,

  fetchProfessors,

  updateProfessor,

  type Professor,

} from './api'



type ProfessorFormErrors = {

  first_name?: string

  last_name?: string

  email?: string

}



type SortField = 'name' | 'email' | 'id'

type SortDirection = 'asc' | 'desc'



const PAGE_SIZE = 8



function validateProfessor(

  firstName: string,

  lastName: string,

  email: string,

): ProfessorFormErrors {

  const errors: ProfessorFormErrors = {}



  if (!firstName.trim()) {

    errors.first_name = 'First name is required.'

  } else if (firstName.trim().length < 2) {

    errors.first_name = 'First name must contain at least 2 characters.'

  }



  if (!lastName.trim()) {

    errors.last_name = 'Last name is required.'

  } else if (lastName.trim().length < 2) {

    errors.last_name = 'Last name must contain at least 2 characters.'

  }



  if (!email.trim()) {

    errors.email = 'Email is required.'

  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {

    errors.email = 'Please enter a valid email address.'

  }



  return errors

}



function getInitials(professor: Professor) {

  return `${professor.first_name.charAt(0)}${professor.last_name.charAt(0)}`.toUpperCase()

}



function formatDate(dateValue?: string | null) {

  if (!dateValue) return '—'



  const date = new Date(dateValue)



  if (Number.isNaN(date.getTime())) return '—'



  return date.toLocaleDateString(undefined, {

    day: 'numeric',

    month: 'short',

    year: 'numeric',

  })

}



function getErrorMessage(error: unknown, fallback: string) {

  if (error instanceof Error && error.message) {

    return error.message

  }



  return fallback

}



export default function ProfessorsPage() {

  const [professors, setProfessors] = useState<Professor[]>([])

  const [loading, setLoading] = useState(true)

  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] = useState('')

  const [successMessage, setSuccessMessage] = useState('')



  const [search, setSearch] = useState('')

  const [sortField, setSortField] = useState<SortField>('id')

  const [sortDirection, setSortDirection] =

    useState<SortDirection>('asc')

  const [currentPage, setCurrentPage] = useState(1)



  const [showCreateForm, setShowCreateForm] = useState(false)

  const [firstName, setFirstName] = useState('')

  const [lastName, setLastName] = useState('')

  const [email, setEmail] = useState('')

  const [createErrors, setCreateErrors] = useState<ProfessorFormErrors>({})

  const [creating, setCreating] = useState(false)



  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null)

  const [editFirstName, setEditFirstName] = useState('')

  const [editLastName, setEditLastName] = useState('')

  const [editEmail, setEditEmail] = useState('')

  const [editErrors, setEditErrors] = useState<ProfessorFormErrors>({})

  const [updating, setUpdating] = useState(false)



  const [viewingProfessor, setViewingProfessor] = useState<Professor | null>(null)

  const [deletingProfessor, setDeletingProfessor] = useState<Professor | null>(null)

  const [deleting, setDeleting] = useState(false)



  async function loadProfessors(showRefreshIndicator = false) {

    if (showRefreshIndicator) {

      setRefreshing(true)

    } else {

      setLoading(true)

    }



    setError('')



    try {

      const data = await fetchProfessors()

      setProfessors(data)

    } catch (err) {

      setError(

        getErrorMessage(

          err,

          'Unable to load professors. Please check that the API is running.',

        ),

      )

    } finally {

      setLoading(false)

      setRefreshing(false)

    }

  }



  useEffect(() => {

    void loadProfessors()

  }, [])



  useEffect(() => {

    if (!successMessage) return



    const timeoutId = window.setTimeout(() => {

      setSuccessMessage('')

    }, 4000)



    return () => window.clearTimeout(timeoutId)

  }, [successMessage])



  const filteredProfessors = useMemo(() => {

    const query = search.trim().toLowerCase()



    const filtered = professors.filter((professor) => {

      const fullName =

        `${professor.first_name} ${professor.last_name}`.toLowerCase()



      return (

        !query ||

        fullName.includes(query) ||

        professor.email.toLowerCase().includes(query) ||

        String(professor.id).includes(query)

      )

    })



    filtered.sort((a, b) => {

      let comparison = 0



      if (sortField === 'name') {

        comparison = `${a.first_name} ${a.last_name}`.localeCompare(

          `${b.first_name} ${b.last_name}`,

        )

      } else if (sortField === 'email') {

        comparison = a.email.localeCompare(b.email)

      } else {

        comparison = a.id - b.id

      }



      return sortDirection === 'asc' ? comparison : -comparison

    })



    return filtered

  }, [professors, search, sortField, sortDirection])



  const totalPages = Math.max(

    1,

    Math.ceil(filteredProfessors.length / PAGE_SIZE),

  )



  const safePage = Math.min(currentPage, totalPages)



  const paginatedProfessors = filteredProfessors.slice(

    (safePage - 1) * PAGE_SIZE,

    safePage * PAGE_SIZE,

  )



  const firstVisible =

    filteredProfessors.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1



  const lastVisible = Math.min(

    safePage * PAGE_SIZE,

    filteredProfessors.length,

  )



  function handleSearchChange(value: string) {

    setSearch(value)

    setCurrentPage(1)

  }



  function handleSortChange(value: SortField) {

    if (sortField === value) {

      setSortDirection((previous) =>

        previous === 'asc' ? 'desc' : 'asc',

      )

    } else {

      setSortField(value)

      setSortDirection('asc')

    }



    setCurrentPage(1)

  }



  function resetCreateForm() {

    setFirstName('')

    setLastName('')

    setEmail('')

    setCreateErrors({})

    setShowCreateForm(false)

  }



  async function handleCreateProfessor(event: FormEvent<HTMLFormElement>) {

    event.preventDefault()



    const validationErrors = validateProfessor(firstName, lastName, email)

    setCreateErrors(validationErrors)



    if (Object.keys(validationErrors).length > 0) return



    setCreating(true)

    setError('')

    setSuccessMessage('')



    try {

      await createProfessor({

        first_name: firstName.trim(),

        last_name: lastName.trim(),

        email: email.trim(),

      })



      resetCreateForm()

      await loadProfessors()

      setCurrentPage(1)

      setSuccessMessage('Professor added successfully.')

    } catch (err) {

      setError(getErrorMessage(err, 'Unable to create professor.'))

    } finally {

      setCreating(false)

    }

  }



  function startEditing(professor: Professor) {

    setViewingProfessor(null)

    setEditingProfessor(professor)

    setEditFirstName(professor.first_name)

    setEditLastName(professor.last_name)

    setEditEmail(professor.email)

    setEditErrors({})

    setError('')

  }



  function cancelEditing() {

    setEditingProfessor(null)

    setEditErrors({})

  }



  async function handleUpdateProfessor(event: FormEvent<HTMLFormElement>) {

    event.preventDefault()



    if (!editingProfessor) return



    const validationErrors = validateProfessor(

      editFirstName,

      editLastName,

      editEmail,

    )



    setEditErrors(validationErrors)



    if (Object.keys(validationErrors).length > 0) return



    setUpdating(true)

    setError('')

    setSuccessMessage('')



    try {

      await updateProfessor(editingProfessor.id, {

        first_name: editFirstName.trim(),

        last_name: editLastName.trim(),

        email: editEmail.trim(),

      })



      setEditingProfessor(null)

      await loadProfessors()

      setSuccessMessage('Professor updated successfully.')

    } catch (err) {

      setError(getErrorMessage(err, 'Unable to update professor.'))

    } finally {

      setUpdating(false)

    }

  }



  async function handleDeleteProfessor() {

    if (!deletingProfessor) return



    setDeleting(true)

    setError('')

    setSuccessMessage('')



    try {

      await deleteProfessor(deletingProfessor.id)



      const deletedId = deletingProfessor.id



      setProfessors((previous) =>

        previous.filter((professor) => professor.id !== deletedId),

      )



      setDeletingProfessor(null)



      if (viewingProfessor?.id === deletedId) {

        setViewingProfessor(null)

      }



      if (editingProfessor?.id === deletedId) {

        setEditingProfessor(null)

      }



      setSuccessMessage('Professor deleted successfully.')

    } catch (err) {

      setError(getErrorMessage(err, 'Unable to delete professor.'))

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



  const inputClass =

    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50'



  const labelClass = 'mb-2 block text-sm font-medium text-slate-700'



  function renderSortButton(

    field: SortField,

    label: string,

  ) {

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



  return (

    <div className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page heading */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>

            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">

              <Users size={16} />

              CampusFlow / Directory

            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">

              Professors

            </h1>

            <p className="mt-1 text-sm text-slate-500">

              Manage professor records, profiles, and contact information.

            </p>

          </div>



          <div className="flex flex-wrap items-center gap-2">

            <button

              type="button"

              onClick={() => void loadProfessors(true)}

              disabled={loading || refreshing}

              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"

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

                setShowCreateForm((previous) => !previous)

                setCreateErrors({})

              }}

              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"

            >

              {showCreateForm ? <X size={16} /> : <Plus size={17} />}

              {showCreateForm ? 'Close form' : 'Add professor'}

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

            <div className="min-w-0 flex-1">{error}</div>

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

          </div>

        )}



        {/* Summary cards */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <p className="text-sm font-medium text-slate-500">

                Total professors

              </p>

              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">

                <Users size={19} />

              </div>

            </div>

            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">

              {loading ? '—' : professors.length.toLocaleString()}

            </p>

            <p className="mt-1 text-xs text-slate-500">

              Registered in CampusFlow

            </p>

          </div>



          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <p className="text-sm font-medium text-slate-500">

                Matching results

              </p>

              <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600">

                <Search size={19} />

              </div>

            </div>

            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">

              {loading ? '—' : filteredProfessors.length.toLocaleString()}

            </p>

            <p className="mt-1 text-xs text-slate-500">

              {search.trim()

                ? 'Professors matching your search'

                : 'Professors in the directory'}

            </p>

          </div>



          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <p className="text-sm font-medium text-slate-500">

                Current page

              </p>

              <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">

                <ChevronRight size={19} />

              </div>

            </div>

            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">

              {loading ? '—' : `${safePage} / ${totalPages}`}

            </p>

            <p className="mt-1 text-xs text-slate-500">

              Up to {PAGE_SIZE} professors per page

            </p>

          </div>

        </div>



        {/* Create professor form */}

        {showCreateForm && (

          <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-5 flex items-center gap-3">

              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">

                <UserPlus size={20} />

              </div>

              <div>

                <h2 className="font-semibold text-slate-900">

                  Add a new professor

                </h2>

                <p className="mt-0.5 text-sm text-slate-500">

                  Enter the professor's information below.

                </p>

              </div>

            </div>



            <form onSubmit={handleCreateProfessor} noValidate>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                <div>

                  <label className={labelClass} htmlFor="create-first-name">

                    First name

                  </label>

                  <input

                    id="create-first-name"

                    className={inputClass}

                    value={firstName}

                    onChange={(event) => {

                      setFirstName(event.target.value)

                      setCreateErrors((previous) => ({

                        ...previous,

                        first_name: undefined,

                      }))

                    }}

                    placeholder="e.g. Amira"

                    autoComplete="given-name"

                  />

                  {renderFieldError(createErrors.first_name)}

                </div>



                <div>

                  <label className={labelClass} htmlFor="create-last-name">

                    Last name

                  </label>

                  <input

                    id="create-last-name"

                    className={inputClass}

                    value={lastName}

                    onChange={(event) => {

                      setLastName(event.target.value)

                      setCreateErrors((previous) => ({

                        ...previous,

                        last_name: undefined,

                      }))

                    }}

                    placeholder="e.g. Ben Ali"

                    autoComplete="family-name"

                  />

                  {renderFieldError(createErrors.last_name)}

                </div>



                <div>

                  <label className={labelClass} htmlFor="create-email">

                    Email address

                  </label>

                  <input

                    id="create-email"

                    type="email"

                    className={inputClass}

                    value={email}

                    onChange={(event) => {

                      setEmail(event.target.value)

                      setCreateErrors((previous) => ({

                        ...previous,

                        email: undefined,

                      }))

                    }}

                    placeholder="professor@university.edu"

                    autoComplete="email"

                  />

                  {renderFieldError(createErrors.email)}

                </div>

              </div>



              <div className="mt-5 flex flex-wrap justify-end gap-2">

                <button

                  type="button"

                  onClick={resetCreateForm}

                  disabled={creating}

                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={creating}

                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {creating ? (

                    <LoaderCircle size={16} className="animate-spin" />

                  ) : (

                    <Plus size={16} />

                  )}

                  {creating ? 'Adding...' : 'Create professor'}

                </button>

              </div>

            </form>

          </section>

        )}



        {/* Edit professor form */}

        {editingProfessor && (

          <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-5 flex items-center gap-3">

              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">

                <Pencil size={19} />

              </div>

              <div>

                <h2 className="font-semibold text-slate-900">

                  Edit professor

                </h2>

                <p className="mt-0.5 text-sm text-slate-500">

                  Updating professor #{editingProfessor.id}

                </p>

              </div>

            </div>



            <form onSubmit={handleUpdateProfessor} noValidate>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                <div>

                  <label className={labelClass} htmlFor="edit-first-name">

                    First name

                  </label>

                  <input

                    id="edit-first-name"

                    className={inputClass}

                    value={editFirstName}

                    onChange={(event) => {

                      setEditFirstName(event.target.value)

                      setEditErrors((previous) => ({

                        ...previous,

                        first_name: undefined,

                      }))

                    }}

                    autoComplete="given-name"

                  />

                  {renderFieldError(editErrors.first_name)}

                </div>



                <div>

                  <label className={labelClass} htmlFor="edit-last-name">

                    Last name

                  </label>

                  <input

                    id="edit-last-name"

                    className={inputClass}

                    value={editLastName}

                    onChange={(event) => {

                      setEditLastName(event.target.value)

                      setEditErrors((previous) => ({

                        ...previous,

                        last_name: undefined,

                      }))

                    }}

                    autoComplete="family-name"

                  />

                  {renderFieldError(editErrors.last_name)}

                </div>



                <div>

                  <label className={labelClass} htmlFor="edit-email">

                    Email address

                  </label>

                  <input

                    id="edit-email"

                    type="email"

                    className={inputClass}

                    value={editEmail}

                    onChange={(event) => {

                      setEditEmail(event.target.value)

                      setEditErrors((previous) => ({

                        ...previous,

                        email: undefined,

                      }))

                    }}

                    autoComplete="email"

                  />

                  {renderFieldError(editErrors.email)}

                </div>

              </div>



              <div className="mt-5 flex flex-wrap justify-end gap-2">

                <button

                  type="button"

                  onClick={cancelEditing}

                  disabled={updating}

                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={updating}

                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {updating ? (

                    <LoaderCircle size={16} className="animate-spin" />

                  ) : (

                    <Save size={16} />

                  )}

                  {updating ? 'Saving...' : 'Save changes'}

                </button>

              </div>

            </form>

          </section>

        )}



        {/* Professor directory */}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">

          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">

            <div>

              <h2 className="font-semibold text-slate-900">

                Professor directory

              </h2>

              <p className="mt-1 text-sm text-slate-500">

                Search, sort, and manage registered professors.

              </p>

            </div>



            <div className="relative w-full sm:max-w-xs">

              <Search

                size={17}

                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"

              />

              <input

                type="search"

                value={search}

                onChange={(event) => handleSearchChange(event.target.value)}

                placeholder="Search name, email, or ID..."

                aria-label="Search professors"

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



          {/* Directory toolbar */}

          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <p className="text-sm text-slate-500">

              {loading ? (

                'Loading professor records...'

              ) : filteredProfessors.length === 0 ? (

                'No matching professors'

              ) : (

                <>

                  Showing{' '}

                  <span className="font-semibold text-slate-800">

                    {firstVisible}–{lastVisible}

                  </span>{' '}

                  of{' '}

                  <span className="font-semibold text-slate-800">

                    {filteredProfessors.length}

                  </span>{' '}

                  matching professors

                </>

              )}

            </p>



            <div className="flex flex-wrap items-center gap-2 text-sm">

              <span className="text-slate-500">Sort by:</span>

              <button

                type="button"

                onClick={() => handleSortChange('name')}

                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${

                  sortField === 'name'

                    ? 'bg-indigo-100 text-indigo-700'

                    : 'text-slate-600 hover:bg-white'

                }`}

              >

                Name

                {sortField === 'name' &&

                  (sortDirection === 'asc' ? ' ↑' : ' ↓')}

              </button>

              <button

                type="button"

                onClick={() => handleSortChange('email')}

                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${

                  sortField === 'email'

                    ? 'bg-indigo-100 text-indigo-700'

                    : 'text-slate-600 hover:bg-white'

                }`}

              >

                Email

                {sortField === 'email' &&

                  (sortDirection === 'asc' ? ' ↑' : ' ↓')}

              </button>

              <button

                type="button"

                onClick={() => handleSortChange('id')}

                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${

                  sortField === 'id'

                    ? 'bg-indigo-100 text-indigo-700'

                    : 'text-slate-600 hover:bg-white'

                }`}

              >

                ID

                {sortField === 'id' &&

                  (sortDirection === 'asc' ? ' ↑' : ' ↓')}

              </button>

            </div>

          </div>



          {loading ? (

            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-16">

              <LoaderCircle

                size={28}

                className="animate-spin text-indigo-600"

              />

              <p className="text-sm text-slate-500">

                Loading professor directory...

              </p>

            </div>

          ) : filteredProfessors.length === 0 ? (

            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-14 text-center">

              <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">

                {search ? <Search size={27} /> : <Users size={27} />}

              </div>

              <h3 className="font-semibold text-slate-900">

                {professors.length === 0

                  ? 'No professors yet'

                  : 'No professors found'}

              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">

                {professors.length === 0

                  ? 'Your professor directory is empty. Add your first professor to get started.'

                  : 'Try another name, email, or professor ID, or clear your search to see all professors.'}

              </p>

              {professors.length === 0 ? (

                <button

                  type="button"

                  onClick={() => setShowCreateForm(true)}

                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"

                >

                  <Plus size={16} />

                  Add first professor

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

            <>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[760px] text-left text-sm">

                  <thead className="border-b border-slate-100 bg-white">

                    <tr>

                      <th className="px-6 py-4 font-semibold text-slate-500">

                        Professor

                      </th>

                      <th className="px-6 py-4 font-semibold text-slate-500">

                        Email address

                      </th>

                      <th className="px-6 py-4">

                        {renderSortButton('id', 'Professor ID')}

                      </th>

                      <th className="px-6 py-4 font-semibold text-slate-500">

                        Registered

                      </th>

                      <th className="px-6 py-4 text-right font-semibold text-slate-500">

                        Actions

                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {paginatedProfessors.map((professor) => (

                      <tr

                        key={professor.id}

                        className="transition hover:bg-slate-50/80"

                      >

                        <td className="px-6 py-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">

                              {getInitials(professor)}

                            </div>

                            <div>

                              <p className="font-semibold text-slate-800">

                                {professor.first_name} {professor.last_name}

                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">

                                Professor

                              </p>

                            </div>

                          </div>

                        </td>

                        <td className="px-6 py-4">

                          <div className="flex items-center gap-2 text-slate-600">

                            <Mail

                              size={15}

                              className="shrink-0 text-slate-400"

                            />

                            <span>{professor.email}</span>

                          </div>

                        </td>

                        <td className="px-6 py-4">

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-600">

                            #{professor.id}

                          </span>

                        </td>

                        <td className="px-6 py-4 text-slate-500">

                          {formatDate(professor.created_at)}

                        </td>

                        <td className="px-6 py-4">

                          <div className="flex items-center justify-end gap-1.5">

                            <button

                              type="button"

                              onClick={() => setViewingProfessor(professor)}

                              aria-label={`View ${professor.first_name} ${professor.last_name}`}

                              title="View profile"

                              className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700"

                            >

                              <Eye size={17} />

                            </button>

                            <button

                              type="button"

                              onClick={() => startEditing(professor)}

                              aria-label={`Edit ${professor.first_name} ${professor.last_name}`}

                              title="Edit professor"

                              className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700"

                            >

                              <Pencil size={17} />

                            </button>

                            <button

                              type="button"

                              onClick={() => setDeletingProfessor(professor)}

                              aria-label={`Delete ${professor.first_name} ${professor.last_name}`}

                              title="Delete professor"

                              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"

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



              {/* Pagination */}

              <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:px-6">

                <p className="text-sm text-slate-500">

                  Page{' '}

                  <span className="font-semibold text-slate-800">

                    {safePage}

                  </span>{' '}

                  of{' '}

                  <span className="font-semibold text-slate-800">

                    {totalPages}

                  </span>

                </p>



                <div className="flex items-center gap-2">

                  <button

                    type="button"

                    onClick={() =>

                      setCurrentPage((previous) => Math.max(1, previous - 1))

                    }

                    disabled={safePage <= 1}

                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"

                  >

                    <ChevronLeft size={16} />

                    Previous

                  </button>



                  {Array.from({ length: totalPages }, (_, index) => index + 1)

                    .filter(

                      (page) =>

                        page === 1 ||

                        page === totalPages ||

                        Math.abs(page - safePage) <= 1,

                    )

                    .reduce<(number | 'ellipsis')[]>((pages, page, index, list) => {

                      if (index > 0 && page - list[index - 1] > 1) {

                        pages.push('ellipsis')

                      }



                      pages.push(page)

                      return pages

                    }, [])

                    .map((page, index) =>

                      page === 'ellipsis' ? (

                        <span

                          key={`ellipsis-${index}`}

                          className="px-1 text-slate-400"

                        >

                          …

                        </span>

                      ) : (

                        <button

                          key={page}

                          type="button"

                          onClick={() => setCurrentPage(page)}

                          aria-current={safePage === page ? 'page' : undefined}

                          className={`h-9 min-w-9 rounded-xl px-2 text-sm font-semibold transition ${

                            safePage === page

                              ? 'bg-indigo-600 text-white'

                              : 'text-slate-600 hover:bg-slate-100'

                          }`}

                        >

                          {page}

                        </button>

                      ),

                    )}



                  <button

                    type="button"

                    onClick={() =>

                      setCurrentPage((previous) =>

                        Math.min(totalPages, previous + 1),

                      )

                    }

                    disabled={safePage >= totalPages}

                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"

                  >

                    Next

                    <ChevronRight size={16} />

                  </button>

                </div>

              </div>

            </>

          )}

        </section>



        <p className="pb-2 text-center text-xs text-slate-400">

          CampusFlow · Professor Management

        </p>

      </div>



      {/* Professor profile modal */}

      {viewingProfessor && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) {

              setViewingProfessor(null)

            }

          }}

        >

          <section

            role="dialog"

            aria-modal="true"

            aria-labelledby="professor-profile-title"

            className="my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"

          >

            <div className="relative bg-gradient-to-br from-indigo-600 to-violet-600 px-6 pb-8 pt-6 text-white">

              <button

                type="button"

                onClick={() => setViewingProfessor(null)}

                aria-label="Close professor profile"

                className="absolute right-4 top-4 rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"

              >

                <X size={19} />

              </button>



              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-xl font-bold">

                {getInitials(viewingProfessor)}

              </div>

              <p className="mt-4 text-sm text-indigo-100">

                Professor profile · #{viewingProfessor.id}

              </p>

              <h2

                id="professor-profile-title"

                className="mt-1 text-2xl font-bold"

              >

                {viewingProfessor.first_name} {viewingProfessor.last_name}

              </h2>

            </div>



            <div className="space-y-5 p-6">

              <div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">

                  Contact information

                </p>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">

                  <Mail size={18} className="mt-0.5 text-slate-400" />

                  <div className="min-w-0">

                    <p className="text-xs text-slate-500">Email address</p>

                    <p className="mt-1 break-all text-sm font-medium text-slate-800">

                      {viewingProfessor.email}

                    </p>

                  </div>

                </div>

              </div>



              <div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">

                  Professor information

                </p>

                <div className="flex items-center justify-between border-b border-slate-100 py-3">

                  <span className="text-sm text-slate-500">Professor ID</span>

                  <span className="font-mono text-sm font-semibold text-slate-800">

                    #{viewingProfessor.id}

                  </span>

                </div>

                <div className="flex items-center justify-between py-3">

                  <span className="text-sm text-slate-500">

                    Registration date

                  </span>

                  <span className="text-sm font-medium text-slate-800">

                    {formatDate(viewingProfessor.created_at)}

                  </span>

                </div>

              </div>



              <button

                type="button"

                onClick={() => startEditing(viewingProfessor)}

                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"

              >

                <Pencil size={16} />

                Edit professor

              </button>

            </div>

          </section>

        </div>

      )}



      {/* Delete confirmation modal */}

      {deletingProfessor && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget && !deleting) {

              setDeletingProfessor(null)

            }

          }}

        >

          <section

            role="alertdialog"

            aria-modal="true"

            aria-labelledby="delete-professor-title"

            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"

          >

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">

              <Trash2 size={22} />

            </div>



            <h2

              id="delete-professor-title"

              className="text-lg font-bold text-slate-900"

            >

              Delete professor?

            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">

              You're about to delete{' '}

              <span className="font-semibold text-slate-800">

                {deletingProfessor.first_name} {deletingProfessor.last_name}

              </span>

              . This action cannot be undone.

            </p>



            <div className="mt-6 flex justify-end gap-2">

              <button

                type="button"

                onClick={() => setDeletingProfessor(null)}

                disabled={deleting}

                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"

              >

                Cancel

              </button>

              <button

                type="button"

                onClick={() => void handleDeleteProfessor()}

                disabled={deleting}

                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"

              >

                {deleting ? (

                  <LoaderCircle size={16} className="animate-spin" />

                ) : (

                  <Trash2 size={16} />

                )}

                {deleting ? 'Deleting...' : 'Delete professor'}

              </button>

            </div>

          </section>

        </div>

      )}

    </div>

  )

}
