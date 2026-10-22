
const API_BASE_URL = 'http://127.0.0.1:8000'

// =========================
// Student types
// =========================

export interface Student {
  id: number
  first_name: string
  last_name: string
  email: string
  created_at: string | null
}

export interface NewStudent {
  first_name: string
  last_name: string
  email: string
}

// =========================
// Professor types
// =========================

export interface Professor {
  id: number
  first_name: string
  last_name: string
  email: string
  created_at: string | null
}

export interface NewProfessor {
  first_name: string
  last_name: string
  email: string
}

// =========================
// Course types
// =========================

export interface Course {
  id: number
  name: string
  code: string
  description: string | null
  credits: number
  professor_id: number | null
  created_at: string | null
}

// =========================
// Enrollment types
// =========================

export type EnrollmentStatus = 'active' | 'completed' | 'dropped'

export interface Enrollment {
  id: number
  student_id: number
  student_name: string
  student_email: string
  course_id: number
  course_name: string
  course_code: string
  enrollment_date: string
  status: EnrollmentStatus
  created_at: string | null
}

export interface NewEnrollment {
  student_id: number
  course_id: number
  enrollment_date: string
  status: EnrollmentStatus
}

// =========================
// Finance types
// =========================

export type PaymentStatus = 'pending' | 'paid' | 'overdue'

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card'
  | 'cheque'
  | 'other'

export interface Payment {
  id: number
  student_id: number
  student_name: string
  student_email: string
  enrollment_id: number | null
  course_id: number | null
  course_name: string | null
  course_code: string | null
  amount: string
  currency: string
  due_date: string | null
  payment_date: string | null
  status: PaymentStatus
  payment_method: PaymentMethod | null
  description: string | null
  created_at: string | null
}

export interface NewPayment {
  student_id: number
  enrollment_id?: number | null
  amount: number
  currency?: string
  due_date?: string | null
  payment_date?: string | null
  status?: PaymentStatus
  payment_method?: PaymentMethod | null
  description?: string | null
}

export interface PaymentSummary {
  currency: string
  total_payments: number
  paid_count: number
  pending_count: number
  overdue_count: number
  collected_revenue: string
  outstanding_balance: string
  overdue_amount: string
}

// =========================
// Shared error handling
// =========================

async function getErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const errorData = await response.json().catch(() => null)

  return typeof errorData?.detail === 'string'
    ? errorData.detail
    : `${fallbackMessage} Server returned status ${response.status}.`
}

// =========================
// Student API functions
// =========================

export async function fetchStudents(): Promise<Student[]> {
  const response = await fetch(`${API_BASE_URL}/api/students`)

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to fetch students.'),
    )
  }

  return (await response.json()) as Student[]
}

export async function createStudent(
  student: NewStudent,
): Promise<Student> {
  const response = await fetch(`${API_BASE_URL}/api/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(student),
  })

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to create student.'),
    )
  }

  return (await response.json()) as Student
}

export async function updateStudent(
  studentId: number,
  student: NewStudent,
): Promise<Student> {
  const response = await fetch(
    `${API_BASE_URL}/api/students/${studentId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(student),
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to update student.'),
    )
  }

  return (await response.json()) as Student
}

export async function deleteStudent(
  studentId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/students/${studentId}`,
    {
      method: 'DELETE',
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to delete student.'),
    )
  }
}

// =========================
// Professor API functions
// =========================

export async function fetchProfessors(): Promise<Professor[]> {
  const response = await fetch(`${API_BASE_URL}/api/professors`)

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to fetch professors.'),
    )
  }

  return (await response.json()) as Professor[]
}

export async function createProfessor(
  professor: NewProfessor,
): Promise<Professor> {
  const response = await fetch(`${API_BASE_URL}/api/professors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(professor),
  })

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to create professor.'),
    )
  }

  return (await response.json()) as Professor
}

export async function updateProfessor(
  professorId: number,
  professor: NewProfessor,
): Promise<Professor> {
  const response = await fetch(
    `${API_BASE_URL}/api/professors/${professorId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(professor),
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to update professor.'),
    )
  }

  return (await response.json()) as Professor
}

export async function deleteProfessor(
  professorId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/professors/${professorId}`,
    {
      method: 'DELETE',
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to delete professor.'),
    )
  }
}

// =========================
// Course API functions
// =========================

export async function fetchCourses(): Promise<Course[]> {
  const response = await fetch(`${API_BASE_URL}/api/courses`)

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to fetch courses.'),
    )
  }

  return (await response.json()) as Course[]
}

// =========================
// Enrollment API functions
// =========================

export async function fetchEnrollments(): Promise<Enrollment[]> {
  const response = await fetch(`${API_BASE_URL}/api/enrollments`)

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to fetch enrollments.'),
    )
  }

  return (await response.json()) as Enrollment[]
}

export async function createEnrollment(
  enrollment: NewEnrollment,
): Promise<Enrollment> {
  const response = await fetch(`${API_BASE_URL}/api/enrollments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(enrollment),
  })

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to create enrollment.'),
    )
  }

  return (await response.json()) as Enrollment
}

export async function updateEnrollment(
  enrollmentId: number,
  enrollment: NewEnrollment,
): Promise<Enrollment> {
  const response = await fetch(
    `${API_BASE_URL}/api/enrollments/${enrollmentId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrollment),
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to update enrollment.'),
    )
  }

  return (await response.json()) as Enrollment
}

export async function deleteEnrollment(
  enrollmentId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/enrollments/${enrollmentId}`,
    {
      method: 'DELETE',
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to delete enrollment.'),
    )
  }
}

// =========================
// Finance API functions
// =========================

export async function fetchPayments(
  status?: PaymentStatus,
  studentId?: number,
): Promise<Payment[]> {
  const params = new URLSearchParams()

  if (status) params.set('status', status)
  if (studentId !== undefined) {
    params.set('student_id', String(studentId))
  }

  const query = params.toString()
  const url = `${API_BASE_URL}/api/payments${query ? `?${query}` : ''}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to fetch payments.'),
    )
  }

  return (await response.json()) as Payment[]
}

export async function fetchPaymentSummary(): Promise<PaymentSummary> {
  const response = await fetch(`${API_BASE_URL}/api/payments/summary`)

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        'Failed to fetch the financial summary.',
      ),
    )
  }

  return (await response.json()) as PaymentSummary
}

export async function createPayment(
  payment: NewPayment,
): Promise<Payment> {
  const response = await fetch(`${API_BASE_URL}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payment),
  })

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to create payment.'),
    )
  }

  return (await response.json()) as Payment
}

export async function updatePayment(
  paymentId: number,
  payment: NewPayment,
): Promise<Payment> {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/${paymentId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payment),
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to update payment.'),
    )
  }

  return (await response.json()) as Payment
}

export async function deletePayment(
  paymentId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/${paymentId}`,
    {
      method: 'DELETE',
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Failed to delete payment.'),
    )
  }
}
