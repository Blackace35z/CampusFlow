
import { useCallback, useEffect, useMemo, useState } from 'react'
import ApiStatus from './ApiStatus'
import StudentsPage from './StudentsPage'
import ProfessorsPage from './ProfessorsPage'
import CoursesPage from './CoursesPage'
import EnrollmentsPage from './EnrollmentsPage'
import FinancePage from './FinancePage'
import {
  fetchStudents,
  fetchProfessors,
  fetchCourses,
  fetchEnrollments,
} from './api'
import type {
  Student,
  Professor,
  Course,
  Enrollment,
} from './api'
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type DashboardActivity = {
  id: string
  initials: string
  name: string
  detail: string
  date: string | null
  color: string
}

type ChartPoint = {
  month: string
  students: number
  previous: number
}

const navigation = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard },
      { name: 'Students', icon: Users },
      { name: 'Professors', icon: GraduationCap },
      { name: 'Courses', icon: BookOpen },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { name: 'Enrollments', icon: CalendarDays },
      { name: 'Finances', icon: Wallet },
      { name: 'Reports', icon: Activity },
    ],
  },
]

const activityColors = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
]

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function getTimeAgo(value: string | null): string {
  if (!value) return 'Date unavailable'

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) return 'Date unavailable'

  const difference = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(difference / 60_000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)

  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`

  return new Date(value).toLocaleDateString()
}

function getEnrollmentDate(enrollment: Enrollment): Date | null {
  const value = enrollment.enrollment_date || enrollment.created_at

  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function buildEnrollmentChart(
  enrollments: Enrollment[],
  period: string,
): ChartPoint[] {
  const now = new Date()
  const currentYear = now.getFullYear()

  if (period === 'This month') {
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1

      const currentCount = enrollments.filter((enrollment) => {
        const date = getEnrollmentDate(enrollment)

        return (
          date !== null &&
          date.getFullYear() === year &&
          date.getMonth() === month &&
          date.getDate() === day
        )
      }).length

      const previousCount = enrollments.filter((enrollment) => {
        const date = getEnrollmentDate(enrollment)

        return (
          date !== null &&
          date.getFullYear() === year - 1 &&
          date.getMonth() === month &&
          date.getDate() === day
        )
      }).length

      return {
        month: String(day),
        students: currentCount,
        previous: previousCount,
      }
    })
  }

  let startMonth = 0
  let numberOfMonths = 12

  if (period === 'This semester') {
    numberOfMonths = 6
    startMonth = now.getMonth() < 6 ? 0 : 6
  }

  return Array.from({ length: numberOfMonths }, (_, index) => {
    const monthDate = new Date(currentYear, startMonth + index, 1)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()

    const currentCount = enrollments.filter((enrollment) => {
      const date = getEnrollmentDate(enrollment)

      return (
        date !== null &&
        date.getFullYear() === year &&
        date.getMonth() === month
      )
    }).length

    const previousCount = enrollments.filter((enrollment) => {
      const date = getEnrollmentDate(enrollment)

      return (
        date !== null &&
        date.getFullYear() === year - 1 &&
        date.getMonth() === month
      )
    }).length

    return {
      month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      students: currentCount,
      previous: previousCount,
    }
  })
}

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('This year')
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const [students, setStudents] = useState<Student[]>([])
  const [professors, setProfessors] = useState<Professor[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  const loadDashboardData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setDataError(null)

    try {
      const [
        studentsData,
        professorsData,
        coursesData,
        enrollmentsData,
      ] = await Promise.all([
        fetchStudents(),
        fetchProfessors(),
        fetchCourses(),
        fetchEnrollments(),
      ])

      setStudents(studentsData)
      setProfessors(professorsData)
      setCourses(coursesData)
      setEnrollments(enrollmentsData)
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : 'Unable to load dashboard data.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  const pageDescriptions: Record<string, string> = {
    Dashboard: 'Here is what is happening at your university today.',
    Students: 'Manage student records and academic information.',
    Professors: 'Manage faculty members and teaching assignments.',
    Courses: 'Organize courses, departments, and class information.',
    Enrollments: 'Track student registrations and enrollment activity.',
    Finances: 'Monitor tuition and university financial activity.',
    Reports: 'Explore academic performance and university statistics.',
    Settings: 'Manage your CampusFlow workspace preferences.',
  }

  const activeEnrollments = enrollments.filter(
    (enrollment) => enrollment.status === 'active',
  ).length

  const enrollmentRate =
    enrollments.length > 0
      ? (activeEnrollments / enrollments.length) * 100
      : 0

  const metrics = [
    {
      label: 'Total students',
      value: students.length.toLocaleString(),
      icon: Users,
      iconColor: 'bg-indigo-50 text-indigo-600',
      description: 'Students in your database',
      destination: 'Students',
    },
    {
      label: 'Total professors',
      value: professors.length.toLocaleString(),
      icon: GraduationCap,
      iconColor: 'bg-emerald-50 text-emerald-600',
      description: 'Professors in your database',
      destination: 'Professors',
    },
    {
      label: 'Total courses',
      value: courses.length.toLocaleString(),
      icon: BookOpen,
      iconColor: 'bg-amber-50 text-amber-600',
      description: 'Courses in your database',
      destination: 'Courses',
    },
    {
      label: 'Active enrollment rate',
      value: `${enrollmentRate.toFixed(1)}%`,
      icon: Activity,
      iconColor: 'bg-sky-50 text-sky-600',
      description: `${activeEnrollments} active of ${enrollments.length} enrollments`,
      destination: 'Enrollments',
    },
  ]

  const chartData = useMemo(
    () => buildEnrollmentChart(enrollments, period),
    [enrollments, period],
  )

  const courseOverview = useMemo(() => {
    const counts = new Map<number, number>()

    enrollments.forEach((enrollment) => {
      counts.set(
        enrollment.course_id,
        (counts.get(enrollment.course_id) ?? 0) + 1,
      )
    })

    const sortedCourses = [...courses].sort(
      (first, second) =>
        (counts.get(second.id) ?? 0) - (counts.get(first.id) ?? 0),
    )

    const displayedCourses = sortedCourses.slice(0, 3)
    const maximum = Math.max(
      1,
      ...displayedCourses.map((course) => counts.get(course.id) ?? 0),
    )

    return displayedCourses.map((course, index) => {
      const studentCount = counts.get(course.id) ?? 0

      return {
        ...course,
        studentCount,
        progress: Math.round((studentCount / maximum) * 100),
        color: [
          'bg-indigo-500',
          'bg-emerald-500',
          'bg-amber-500',
        ][index],
      }
    })
  }, [courses, enrollments])

  const activities = useMemo<DashboardActivity[]>(() => {
    const items: DashboardActivity[] = []

    students.forEach((student) => {
      items.push({
        id: `student-${student.id}`,
        initials: getInitials(
          `${student.first_name} ${student.last_name}`,
        ),
        name: `${student.first_name} ${student.last_name}`,
        detail: 'Student record',
        date: student.created_at,
        color: activityColors[0],
      })
    })

    professors.forEach((professor) => {
      items.push({
        id: `professor-${professor.id}`,
        initials: getInitials(
          `${professor.first_name} ${professor.last_name}`,
        ),
        name: `${professor.first_name} ${professor.last_name}`,
        detail: 'Professor record',
        date: professor.created_at,
        color: activityColors[1],
      })
    })

    courses.forEach((course) => {
      items.push({
        id: `course-${course.id}`,
        initials: getInitials(course.name),
        name: course.name,
        detail: `Course created · ${course.code}`,
        date: course.created_at,
        color: activityColors[2],
      })
    })

    enrollments.forEach((enrollment) => {
      items.push({
        id: `enrollment-${enrollment.id}`,
        initials: getInitials(enrollment.student_name),
        name: enrollment.student_name,
        detail: `Enrolled in ${enrollment.course_name}`,
        date: enrollment.created_at ?? enrollment.enrollment_date,
        color: activityColors[3],
      })
    })

    return items.sort((first, second) => {
      const firstDate = first.date ? new Date(first.date).getTime() : 0
      const secondDate = second.date ? new Date(second.date).getTime() : 0

      return secondDate - firstDate
    })
  }, [students, professors, courses, enrollments])

  const filteredActivities = activities
    .filter((activity) =>
      `${activity.name} ${activity.detail}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .slice(0, 6)

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-800">
      <div className="ml-[76px] px-3 pt-4 sm:ml-[220px] sm:px-7 xl:ml-[258px] lg:px-9">
        <ApiStatus />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 flex w-[76px] flex-col overflow-hidden border-r border-slate-200/80 bg-[#0b1220] text-slate-300 shadow-[8px_0_28px_rgba(15,23,42,0.08)] sm:w-[220px] xl:w-[258px]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-20 h-64 w-64 rounded-full bg-indigo-500/[0.08] blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-blue-500/[0.05] blur-3xl" />
        </div>

        <div className="relative flex h-[76px] shrink-0 items-center justify-center border-b border-white/[0.07] px-2 sm:h-[84px] sm:justify-between sm:px-4 xl:px-5">
          <button
            type="button"
            aria-label="Go to dashboard"
            title="CampusFlow dashboard"
            className="group flex items-center gap-3 text-left"
            onClick={() => setActivePage('Dashboard')}
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-300/20 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-md shadow-indigo-950/40 transition duration-200 group-hover:scale-[1.03] xl:h-11 xl:w-11 xl:rounded-[15px]">
              <GraduationCap size={23} strokeWidth={2} />
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0b1220] bg-emerald-400" />
            </span>

            <span className="hidden min-w-0 sm:block">
              <span className="block whitespace-nowrap font-[Manrope] text-[17px] font-extrabold tracking-[-0.04em] text-white xl:text-[19px]">
                CampusFlow
              </span>
              <span className="mt-1 block whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                University OS
              </span>
            </span>
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-2 py-4 sm:px-3 sm:py-5 xl:px-3.5 xl:py-6">
          <div className="mb-5 hidden px-2 sm:block xl:mb-7 xl:px-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Workspace
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04] text-slate-400">
                <GraduationCap size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-slate-200">
                  University Admin
                </span>
                <span className="mt-0.5 block text-[10px] text-slate-500">
                  Main workspace
                </span>
              </span>
            </div>
          </div>

          {navigation.map((section) => (
            <div key={section.label} className="mb-5 xl:mb-7">
              <p className="mb-2.5 hidden px-3 text-[9px] font-bold tracking-[0.19em] text-slate-500 sm:block">
                {section.label}
              </p>

              <nav className="space-y-1" aria-label={section.label}>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = activePage === item.name

                  return (
                    <button
                      key={item.name}
                      type="button"
                      title={item.name}
                      onClick={() => {
                        setActivePage(item.name)
                        setSearch('')
                      }}
                      aria-current={active ? 'page' : undefined}
                      aria-label={item.name}
                      className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border px-2 py-2.5 text-left text-[13px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:justify-start sm:px-2.5 xl:px-3 ${
                        active
                          ? 'border-indigo-400/20 bg-gradient-to-r from-indigo-500/[0.20] to-indigo-500/[0.07] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                          : 'border-transparent font-medium text-slate-400 hover:border-white/[0.05] hover:bg-white/[0.045] hover:text-slate-100'
                      }`}
                    >
                      {active && (
                        <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.55)]" />
                      )}

                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          active
                            ? 'bg-indigo-400/15 text-indigo-300'
                            : 'text-slate-500 group-hover:bg-white/[0.05] group-hover:text-slate-200'
                        }`}
                      >
                        <Icon size={17} strokeWidth={active ? 2 : 1.8} />
                      </span>

                      <span className="hidden min-w-0 flex-1 truncate sm:inline">
                        {item.name}
                      </span>

                      {item.name === 'Students' && (
                        <span
                          className={`hidden rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums sm:inline ${
                            active
                              ? 'bg-indigo-300/15 text-indigo-200'
                              : 'bg-white/[0.06] text-slate-500'
                          }`}
                        >
                          {students.length.toLocaleString()}
                        </span>
                      )}

                      {active && (
                        <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.6)] sm:inline" />
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="relative shrink-0 border-t border-white/[0.07] bg-[#090f1b]/70 p-2 sm:p-3 xl:p-4">
          <div className="mb-3 hidden rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 xl:block">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    dataError
                      ? 'bg-rose-400/10 text-rose-300'
                      : 'bg-emerald-400/10 text-emerald-300'
                  }`}
                >
                  <ShieldCheck size={15} />
                </span>
                <span className="text-[11px] font-semibold text-slate-200">
                  Workspace status
                </span>
              </div>

              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  dataError ? 'bg-rose-400' : 'bg-emerald-400'
                }`}
              />
            </div>

            <p className="text-[10px] leading-[1.65] text-slate-500">
              {dataError
                ? 'Unable to retrieve the latest workspace data.'
                : 'Your university workspace is ready to manage.'}
            </p>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full transition-all ${
                  dataError ? 'w-1/4 bg-rose-400' : 'w-full bg-emerald-400'
                }`}
              />
            </div>
          </div>

          <button
            type="button"
            title="Settings"
            aria-label="Settings"
            onClick={() => setActivePage('Settings')}
            className={`group flex w-full items-center justify-center gap-3 rounded-xl border px-2 py-2.5 text-[12px] transition sm:justify-start sm:px-2.5 xl:px-3 ${
              activePage === 'Settings'
                ? 'border-indigo-400/15 bg-indigo-500/10 text-white'
                : 'border-transparent text-slate-400 hover:bg-white/[0.045] hover:text-white'
            }`}
          >
            <Settings2
              size={17}
              className="shrink-0 text-slate-500 transition group-hover:text-slate-200"
            />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            type="button"
            title="Help and support"
            aria-label="Help and support"
            className="group mt-1 flex w-full items-center justify-center gap-3 rounded-xl border border-transparent px-2 py-2.5 text-[12px] text-slate-400 transition hover:bg-white/[0.045] hover:text-white sm:justify-start sm:px-2.5 xl:px-3"
            onClick={() =>
              window.alert('Help documentation will be added in a future step.')
            }
          >
            <CircleHelp
              size={17}
              className="shrink-0 text-slate-500 transition group-hover:text-slate-200"
            />
            <span className="hidden sm:inline">Help &amp; support</span>
          </button>

          <div className="mt-3 hidden items-center justify-between border-t border-white/[0.06] px-1 pt-3 sm:flex">
            <span className="text-[9px] font-medium tracking-wide text-slate-600">
              CAMPUSFLOW
            </span>
            <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
              v1.0
            </span>
          </div>
        </div>
      </aside>

      <div className="min-h-screen pl-[76px] sm:pl-[220px] xl:pl-[258px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-xl sm:px-5 xl:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Workspace</span>
                <span>/</span>
                <span className="truncate text-slate-600">{activePage}</span>
              </div>

              <h1 className="mt-1 truncate font-[Manrope] text-lg font-bold text-slate-900 sm:text-xl">
                {activePage}
              </h1>
            </div>
          </div>

          <div className="ml-3 flex items-center gap-2 sm:gap-4">
            {activePage === 'Dashboard' && (
              <label className="relative hidden md:block">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search activity..."
                  aria-label="Search recent activity"
                  className="w-48 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white lg:w-64"
                />
              </label>
            )}

            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50"
              >
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="text-sm font-bold text-slate-800">
                    Notifications
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    You&apos;re all caught up. Notifications will appear here
                    when enabled.
                  </p>
                </div>
              )}
            </div>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <button
              type="button"
              className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50 sm:gap-2.5"
              onClick={() => setActivePage('Settings')}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700">
                AD
              </span>

              <span className="hidden text-left sm:block">
                <span className="block text-xs font-bold text-slate-800">
                  Alex Morgan
                </span>
                <span className="mt-0.5 block text-[10px] text-slate-400">
                  Administrator
                </span>
              </span>

              <ChevronDown
                size={15}
                className="hidden text-slate-400 sm:block"
              />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-3 py-6 sm:px-5 sm:py-8 xl:px-9">
          {activePage === 'Students' ? (
            <StudentsPage />
          ) : activePage === 'Professors' ? (
            <ProfessorsPage />
          ) : activePage === 'Courses' ? (
            <CoursesPage />
          ) : activePage === 'Enrollments' ? (
            <EnrollmentsPage />
          ) : activePage === 'Finances' ? (
            <FinancePage />
          ) : activePage === 'Reports' || activePage === 'Settings' ? (
            <section className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-sm">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                {activePage === 'Reports' ? (
                  <Activity size={26} />
                ) : (
                  <Settings2 size={26} />
                )}
              </span>
              <h2 className="mt-5 font-[Manrope] text-xl font-bold text-slate-900">
                {activePage === 'Reports' ? 'Reports' : 'Workspace settings'}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {activePage === 'Reports'
                  ? 'The reporting dashboard has not been implemented yet. We can build it after the core management pages are complete.'
                  : 'Workspace settings are not available yet. We can implement them in a later step.'}
              </p>
              <button
                type="button"
                onClick={() => setActivePage('Dashboard')}
                className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                Back to dashboard
              </button>
            </section>
          ) : (
            <>
              <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-700">
                      University overview
                    </span>
                  </div>

                  <h2 className="font-[Manrope] text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                    Welcome back, Alex <span aria-hidden="true">👋</span>
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {pageDescriptions[activePage] ??
                      'Manage your university workspace.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="relative">
                    <CalendarDays
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <select
                      value={period}
                      onChange={(event) => setPeriod(event.target.value)}
                      aria-label="Dashboard time period"
                      className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-300"
                    >
                      <option>This year</option>
                      <option>This semester</option>
                      <option>This month</option>
                    </select>

                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setActivePage('Students')}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
                  >
                    <Plus size={16} />
                    Add student
                  </button>

                  <button
                    type="button"
                    onClick={() => void loadDashboardData(true)}
                    disabled={loading || refreshing}
                    aria-label="Refresh dashboard data"
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      size={15}
                      className={refreshing ? 'animate-spin' : ''}
                    />
                    Refresh
                  </button>
                </div>
              </div>

              {dataError && (
                <div
                  role="alert"
                  className="mb-6 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">
                      Dashboard data could not be loaded.
                    </p>
                    <p className="mt-1 break-words text-xs">{dataError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadDashboardData(true)}
                    className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-rose-100"
                  >
                    Try again
                  </button>
                </div>
              )}

              {loading ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white">
                  <RefreshCw size={25} className="animate-spin text-indigo-600" />
                  <p className="text-sm font-medium text-slate-500">
                    Loading your university data...
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => {
                      const Icon = metric.icon

                      return (
                        <button
                          key={metric.label}
                          type="button"
                          onClick={() => setActivePage(metric.destination)}
                          aria-label={`Open ${metric.label}`}
                          className="group w-full cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm shadow-slate-200/30 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:p-6"
                        >
                          <div className="mb-5 flex items-center justify-between">
                            <span
                              className={`flex h-11 w-11 items-center justify-center rounded-xl ${metric.iconColor}`}
                            >
                              <Icon size={21} strokeWidth={1.8} />
                            </span>

                            <span className="rounded-lg p-1.5 text-slate-300 transition group-hover:text-indigo-500">
                              <ArrowRight size={18} />
                            </span>
                          </div>

                          <p className="text-sm font-medium text-slate-500">
                            {metric.label}
                          </p>

                          <div className="mt-2 flex flex-wrap items-baseline gap-3">
                            <span className="font-[Manrope] text-3xl font-extrabold tracking-tight text-slate-900">
                              {metric.value}
                            </span>
                          </div>

                          <p className="mt-2 text-[11px] text-slate-400">
                            {metric.description}
                          </p>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
                    <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6">
                      <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-[Manrope] text-base font-bold text-slate-900">
                            Student enrollment
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            Enrollment records by {period === 'This month' ? 'day' : 'month'}, compared with the previous year
                          </p>
                        </div>
                      </div>

                      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="font-[Manrope] text-3xl font-extrabold tracking-tight text-slate-900">
                            {enrollments.length.toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Total enrollment records
                          </p>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700">
                          {activeEnrollments.toLocaleString()} active
                        </span>
                      </div>

                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 4, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id="studentGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#6366f1"
                                  stopOpacity={0.2}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#6366f1"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>

                            <CartesianGrid
                              stroke="#eef1f6"
                              strokeDasharray="4 4"
                              vertical={false}
                            />

                            <XAxis
                              dataKey="month"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 11 }}
                              dy={10}
                              interval={period === 'This month' ? 4 : 0}
                            />

                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 11 }}
                              allowDecimals={false}
                            />

                            <Tooltip
                              labelFormatter={(label) =>
                                period === 'This month'
                                  ? `${period}, day ${label}`
                                  : label
                              }
                              contentStyle={{
                                borderRadius: 12,
                                border: '1px solid #e2e8f0',
                                fontSize: 12,
                                boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                              }}
                            />

                            <Area
                              type="monotone"
                              dataKey="previous"
                              name="Previous year"
                              stroke="#cbd5e1"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              fill="transparent"
                            />

                            <Area
                              type="monotone"
                              dataKey="students"
                              name="Enrollments"
                              stroke="#6366f1"
                              strokeWidth={2.5}
                              fill="url(#studentGradient)"
                              activeDot={{ r: 5, strokeWidth: 0 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                          Selected period
                        </span>

                        <span className="flex items-center gap-2">
                          <span className="h-0.5 w-4 border-t-2 border-dashed border-slate-300" />
                          Previous year
                        </span>
                      </div>

                      {enrollments.length === 0 && (
                        <p className="mt-4 text-center text-xs text-slate-400">
                          Create enrollments to populate this chart.
                        </p>
                      )}
                    </section>

                    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6">
                      <div className="mb-6 flex items-start justify-between">
                        <div>
                          <h3 className="font-[Manrope] text-base font-bold text-slate-900">
                            Course overview
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            Courses with the most enrollment records
                          </p>
                        </div>

                        <button
                          type="button"
                          aria-label="View all courses"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"
                          onClick={() => setActivePage('Courses')}
                        >
                          <ArrowRight size={18} />
                        </button>
                      </div>

                      {courseOverview.length > 0 ? (
                        <div className="space-y-6">
                          {courseOverview.map((course) => (
                            <div key={course.id}>
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-800">
                                    {course.name}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    {course.code} · {course.studentCount}{' '}
                                    enrollment{course.studentCount === 1 ? '' : 's'}
                                  </p>
                                </div>

                                <span className="text-xs font-bold text-slate-600">
                                  {course.progress}%
                                </span>
                              </div>

                              <div
                                className="h-2 overflow-hidden rounded-full bg-slate-100"
                                role="progressbar"
                                aria-label={`${course.name} relative enrollment count`}
                                aria-valuenow={course.progress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className={`h-full rounded-full ${course.color} transition-all duration-500`}
                                  style={{ width: `${course.progress}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                          <BookOpen size={27} className="text-slate-300" />
                          <p className="mt-3 text-sm font-semibold text-slate-600">
                            No courses yet
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Add courses to see them here.
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setActivePage('Courses')}
                        className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        View all courses
                        <ArrowRight size={14} />
                      </button>
                    </section>
                  </div>

                  <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                      <div>
                        <h3 className="font-[Manrope] text-base font-bold text-slate-900">
                          Recent activity
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Recent records from your university database
                        </p>
                      </div>

                      <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                        {activities.length} records
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {filteredActivities.length > 0 ? (
                        filteredActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50/70 sm:gap-4 sm:px-6"
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${activity.color}`}
                            >
                              {activity.initials || '?'}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {activity.name}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {activity.detail}
                              </p>
                            </div>

                            <div className="hidden shrink-0 items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
                              <Clock3 size={13} />
                              {getTimeAgo(activity.date)}
                            </div>

                            <span className="ml-auto shrink-0 rounded-full bg-emerald-50 p-1 text-emerald-600">
                              <Check size={13} />
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="px-6 py-10 text-center text-sm text-slate-500">
                          {activities.length === 0
                            ? 'No records are available yet.'
                            : `No activity matches "${search}".`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:px-6">
                      <p className="text-[11px] text-slate-400">
                        Showing {filteredActivities.length} of {activities.length}{' '}
                        records
                      </p>

                      <span className="text-[11px] font-medium text-emerald-600">
                        Live database data
                      </span>
                    </div>
                  </section>
                </>
              )}

              <footer className="flex flex-col gap-2 py-7 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <p>© 2026 CampusFlow. Built for better campus management.</p>
                <p className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      dataError ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  />
                  {dataError
                    ? 'Unable to sync dashboard data'
                    : 'Connected to university data'}
                </p>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
