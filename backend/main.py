
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from database import engine
from models import Course, Enrollment, Payment, Professor, Student


# ============================================================
# DATABASE SESSION
# ============================================================

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_db():
    """Provide a database session to an API request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# SHARED STUDENT AND PROFESSOR HELPERS
# ============================================================

def is_valid_email(email: str) -> bool:
    """Check whether an email has a basic valid format."""
    return bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email))


def validate_person_data(
    first_name: str,
    last_name: str,
    email: str,
) -> None:
    """Validate fields shared by students and professors."""
    if not first_name or not last_name or not email:
        raise HTTPException(
            status_code=422,
            detail="First name, last name, and email are required.",
        )

    if len(first_name) < 2 or len(last_name) < 2:
        raise HTTPException(
            status_code=422,
            detail="First and last names must contain at least 2 characters.",
        )

    if not is_valid_email(email):
        raise HTTPException(
            status_code=422,
            detail="Please provide a valid email address.",
        )


def person_to_dict(person):
    """Convert a student or professor into an API response."""
    return {
        "id": person.id,
        "first_name": person.first_name,
        "last_name": person.last_name,
        "email": person.email,
        "created_at": (
            person.created_at.isoformat()
            if person.created_at
            else None
        ),
    }


def get_person_or_404(
    db: Session,
    model,
    person_id: int,
    label: str,
):
    """Find a record or return a 404 error."""
    person = db.get(model, person_id)

    if person is None:
        raise HTTPException(
            status_code=404,
            detail=f"{label} not found.",
        )

    return person


def ensure_email_is_available(
    db: Session,
    model,
    email: str,
    person_id: int | None = None,
    label: str = "Person",
) -> None:
    """Ensure that another record does not already use this email."""
    statement = select(model).where(model.email == email)

    if person_id is not None:
        statement = statement.where(model.id != person_id)

    existing_person = db.scalars(statement).first()

    if existing_person:
        raise HTTPException(
            status_code=409,
            detail=f"A {label.lower()} with this email already exists.",
        )


def normalize_person_data(person_data: dict) -> tuple[str, str, str]:
    """Validate input types, trim whitespace, and normalize email."""
    first_name = person_data.get("first_name", "")
    last_name = person_data.get("last_name", "")
    email = person_data.get("email", "")

    if not all(
        isinstance(value, str)
        for value in (first_name, last_name, email)
    ):
        raise HTTPException(
            status_code=422,
            detail="First name, last name, and email must be text.",
        )

    first_name = first_name.strip()
    last_name = last_name.strip()
    email = email.strip().lower()

    validate_person_data(first_name, last_name, email)

    return first_name, last_name, email


def create_person(
    db: Session,
    model,
    person_data: dict,
    label: str,
):
    """Create a student or professor."""
    first_name, last_name, email = normalize_person_data(person_data)

    ensure_email_is_available(
        db,
        model,
        email,
        label=label,
    )

    person = model(
        first_name=first_name,
        last_name=last_name,
        email=email,
    )

    try:
        db.add(person)
        db.commit()
        db.refresh(person)
        return person_to_dict(person)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"A {label.lower()} with this email already exists.",
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to save the {label.lower()} to the database.",
        ) from exc


def update_person(
    db: Session,
    model,
    person_id: int,
    person_data: dict,
    label: str,
):
    """Update a student or professor."""
    person = get_person_or_404(db, model, person_id, label)

    first_name, last_name, email = normalize_person_data(person_data)

    ensure_email_is_available(
        db,
        model,
        email,
        person_id=person_id,
        label=label,
    )

    person.first_name = first_name
    person.last_name = last_name
    person.email = email

    try:
        db.commit()
        db.refresh(person)
        return person_to_dict(person)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Another {label.lower()} already uses this email.",
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update the {label.lower()}.",
        ) from exc


def delete_person(
    db: Session,
    model,
    person_id: int,
    label: str,
) -> None:
    """Delete a student or professor."""
    person = get_person_or_404(db, model, person_id, label)

    try:
        db.delete(person)
        db.commit()

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot delete this {label.lower()} because other "
                "records depend on it."
            ),
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to delete the {label.lower()}.",
        ) from exc


# ============================================================
# COURSE HELPERS
# ============================================================

def course_to_dict(course: Course) -> dict:
    """Convert a course into the JSON format used by the frontend."""
    return {
        "id": course.id,
        "name": course.name,
        "code": course.code,
        "description": course.description,
        "credits": course.credits,
        "professor_id": course.professor_id,
        "created_at": (
            course.created_at.isoformat()
            if course.created_at
            else None
        ),
    }


def get_course_or_404(db: Session, course_id: int) -> Course:
    """Find a course or return a 404 error."""
    course = db.get(Course, course_id)

    if course is None:
        raise HTTPException(
            status_code=404,
            detail="Course not found.",
        )

    return course


def normalize_course_data(
    db: Session,
    course_data: dict,
    course_id: int | None = None,
) -> dict:
    """Validate and normalize course input before saving."""
    name = course_data.get("name", "")
    code = course_data.get("code", "")
    description = course_data.get("description")
    credits = course_data.get("credits", 3)
    professor_id = course_data.get("professor_id")

    if not isinstance(name, str) or not isinstance(code, str):
        raise HTTPException(
            status_code=422,
            detail="Course name and code must be text.",
        )

    name = name.strip()
    code = code.strip().upper()

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Course name is required.",
        )

    if len(name) > 150:
        raise HTTPException(
            status_code=422,
            detail="Course name cannot exceed 150 characters.",
        )

    if not code:
        raise HTTPException(
            status_code=422,
            detail="Course code is required.",
        )

    if len(code) > 20:
        raise HTTPException(
            status_code=422,
            detail="Course code cannot exceed 20 characters.",
        )

    if description is not None and not isinstance(description, str):
        raise HTTPException(
            status_code=422,
            detail="Course description must be text or null.",
        )

    if isinstance(credits, bool) or not isinstance(credits, int):
        raise HTTPException(
            status_code=422,
            detail="Course credits must be a whole number.",
        )

    if credits < 1:
        raise HTTPException(
            status_code=422,
            detail="Course credits must be at least 1.",
        )

    if professor_id == "":
        professor_id = None

    if professor_id is not None:
        if isinstance(professor_id, bool):
            raise HTTPException(
                status_code=422,
                detail="Professor ID must be a valid integer.",
            )

        try:
            professor_id = int(professor_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail="Professor ID must be a valid integer.",
            ) from exc

        if professor_id < 1:
            raise HTTPException(
                status_code=422,
                detail="Professor ID must be a positive integer.",
            )

        if db.get(Professor, professor_id) is None:
            raise HTTPException(
                status_code=422,
                detail="The selected professor does not exist.",
            )

    code_statement = select(Course).where(
        func.lower(Course.code) == code.lower()
    )

    if course_id is not None:
        code_statement = code_statement.where(Course.id != course_id)

    existing_course = db.scalars(code_statement).first()

    if existing_course:
        raise HTTPException(
            status_code=409,
            detail="A course with this code already exists.",
        )

    return {
        "name": name,
        "code": code,
        "description": description.strip() if description else None,
        "credits": credits,
        "professor_id": professor_id,
    }


# ============================================================
# ENROLLMENT HELPERS
# ============================================================

ALLOWED_ENROLLMENT_STATUSES = {
    "active",
    "completed",
    "dropped",
}


def get_enrollment_or_404(
    db: Session,
    enrollment_id: int,
) -> Enrollment:
    """Find an enrollment or return a 404 error."""
    enrollment = db.get(Enrollment, enrollment_id)

    if enrollment is None:
        raise HTTPException(
            status_code=404,
            detail="Enrollment not found.",
        )

    return enrollment


def enrollment_to_dict(
    db: Session,
    enrollment: Enrollment,
) -> dict:
    """Convert an enrollment to a frontend-friendly response."""
    student = db.get(Student, enrollment.student_id)
    course = db.get(Course, enrollment.course_id)

    return {
        "id": enrollment.id,
        "student_id": enrollment.student_id,
        "student_name": (
            f"{student.first_name} {student.last_name}"
            if student
            else None
        ),
        "student_email": student.email if student else None,
        "course_id": enrollment.course_id,
        "course_name": course.name if course else None,
        "course_code": course.code if course else None,
        "enrollment_date": (
            enrollment.enrollment_date.isoformat()
            if enrollment.enrollment_date
            else None
        ),
        "status": enrollment.status,
        "created_at": (
            enrollment.created_at.isoformat()
            if enrollment.created_at
            else None
        ),
    }


def normalize_enrollment_data(
    db: Session,
    enrollment_data: dict,
    existing: Enrollment | None = None,
) -> dict:
    """
    Validate enrollment input.

    On creation, student_id and course_id are required.
    On update, omitted fields retain their existing values.
    """
    student_id = enrollment_data.get(
        "student_id",
        existing.student_id if existing else None,
    )
    course_id = enrollment_data.get(
        "course_id",
        existing.course_id if existing else None,
    )
    enrollment_date = enrollment_data.get(
        "enrollment_date",
        existing.enrollment_date if existing else date.today(),
    )
    status = enrollment_data.get(
        "status",
        existing.status if existing else "active",
    )

    for field_name, value in (
        ("Student ID", student_id),
        ("Course ID", course_id),
    ):
        if isinstance(value, bool):
            raise HTTPException(
                status_code=422,
                detail=f"{field_name} must be a positive integer.",
            )

        try:
            value = int(value)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail=f"{field_name} must be a positive integer.",
            ) from exc

        if value < 1:
            raise HTTPException(
                status_code=422,
                detail=f"{field_name} must be a positive integer.",
            )

        if field_name == "Student ID":
            student_id = value
        else:
            course_id = value

    if db.get(Student, student_id) is None:
        raise HTTPException(
            status_code=422,
            detail="The selected student does not exist.",
        )

    if db.get(Course, course_id) is None:
        raise HTTPException(
            status_code=422,
            detail="The selected course does not exist.",
        )

    if isinstance(enrollment_date, str):
        try:
            enrollment_date = date.fromisoformat(enrollment_date)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail="Enrollment date must use YYYY-MM-DD format.",
            ) from exc

    if not isinstance(enrollment_date, date) or isinstance(
        enrollment_date, datetime
    ):
        raise HTTPException(
            status_code=422,
            detail="Enrollment date must be a valid date.",
        )

    if not isinstance(status, str):
        raise HTTPException(
            status_code=422,
            detail="Enrollment status must be text.",
        )

    status = status.strip().lower()

    if status not in ALLOWED_ENROLLMENT_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=(
                "Status must be one of: active, completed, or dropped."
            ),
        )

    duplicate_statement = select(Enrollment).where(
        Enrollment.student_id == student_id,
        Enrollment.course_id == course_id,
    )

    if existing is not None:
        duplicate_statement = duplicate_statement.where(
            Enrollment.id != existing.id
        )

    duplicate = db.scalars(duplicate_statement).first()

    if duplicate is not None:
        raise HTTPException(
            status_code=409,
            detail="This student is already enrolled in this course.",
        )

    return {
        "student_id": student_id,
        "course_id": course_id,
        "enrollment_date": enrollment_date,
        "status": status,
    }


# ============================================================
# PAYMENT HELPERS
# ============================================================

ALLOWED_PAYMENT_STATUSES = {
    "pending",
    "paid",
    "overdue",
}

ALLOWED_PAYMENT_METHODS = {
    "cash",
    "bank_transfer",
    "card",
    "cheque",
    "other",
}


def get_payment_or_404(
    db: Session,
    payment_id: int,
) -> Payment:
    """Find a payment or return a 404 error."""
    payment = db.get(Payment, payment_id)

    if payment is None:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    return payment


def parse_payment_date(value, field_name: str) -> date:
    """Parse a date supplied as YYYY-MM-DD."""
    if isinstance(value, datetime):
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} must be a date, not a datetime.",
        )

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"{field_name} must use YYYY-MM-DD format.",
            ) from exc

    raise HTTPException(
        status_code=422,
        detail=f"{field_name} must use YYYY-MM-DD format.",
    )


def parse_payment_id(value, field_name: str) -> int:
    """Validate a positive integer ID."""
    if isinstance(value, bool):
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} must be a positive integer.",
        )

    try:
        parsed_value = int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} must be a positive integer.",
        ) from exc

    if parsed_value < 1:
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} must be a positive integer.",
        )

    return parsed_value


def normalize_payment_data(
    db: Session,
    payment_data: dict,
    existing: Payment | None = None,
) -> dict:
    """
    Validate payment input.

    Creation requires student_id, amount, and due_date.
    Omitted fields on update retain their current values.
    """
    student_id = payment_data.get(
        "student_id",
        existing.student_id if existing else None,
    )
    enrollment_id = payment_data.get(
        "enrollment_id",
        existing.enrollment_id if existing else None,
    )
    amount_value = payment_data.get(
        "amount",
        existing.amount if existing else None,
    )
    due_date_value = payment_data.get(
        "due_date",
        existing.due_date if existing else None,
    )
    payment_date_value = payment_data.get(
        "payment_date",
        existing.payment_date if existing else None,
    )
    status = payment_data.get(
        "status",
        existing.status if existing else "pending",
    )
    payment_method = payment_data.get(
        "payment_method",
        existing.payment_method if existing else None,
    )
    description = payment_data.get(
        "description",
        existing.description if existing else None,
    )
    currency = payment_data.get(
        "currency",
        existing.currency if existing else "TND",
    )

    if student_id is None:
        raise HTTPException(
            status_code=422,
            detail="Student ID is required.",
        )

    student_id = parse_payment_id(student_id, "Student ID")

    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(
            status_code=422,
            detail="The selected student does not exist.",
        )

    if enrollment_id == "":
        enrollment_id = None

    if enrollment_id is not None:
        enrollment_id = parse_payment_id(
            enrollment_id,
            "Enrollment ID",
        )

        enrollment = db.get(Enrollment, enrollment_id)

        if enrollment is None:
            raise HTTPException(
                status_code=422,
                detail="The selected enrollment does not exist.",
            )

        if enrollment.student_id != student_id:
            raise HTTPException(
                status_code=422,
                detail=(
                    "The selected enrollment does not belong "
                    "to the selected student."
                ),
            )

    if amount_value is None or isinstance(amount_value, bool):
        raise HTTPException(
            status_code=422,
            detail="A valid payment amount is required.",
        )

    try:
        amount = Decimal(str(amount_value))
    except (InvalidOperation, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail="Amount must be a valid number.",
        ) from exc

    if not amount.is_finite() or amount <= 0:
        raise HTTPException(
            status_code=422,
            detail="Amount must be greater than zero.",
        )

    if amount.as_tuple().exponent < -3:
        raise HTTPException(
            status_code=422,
            detail="Amount cannot have more than 3 decimal places.",
        )

    if amount >= Decimal("1000000000"):
        raise HTTPException(
            status_code=422,
            detail="Amount is too large.",
        )

    amount = amount.quantize(Decimal("0.001"))

    if due_date_value is None:
        raise HTTPException(
            status_code=422,
            detail="Due date is required.",
        )

    due_date = parse_payment_date(due_date_value, "Due date")

    payment_date = None
    if payment_date_value not in (None, ""):
        payment_date = parse_payment_date(
            payment_date_value,
            "Payment date",
        )

    if not isinstance(status, str):
        raise HTTPException(
            status_code=422,
            detail="Payment status must be text.",
        )

    status = status.strip().lower()

    if status not in ALLOWED_PAYMENT_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=(
                "Status must be pending, paid, or overdue."
            ),
        )

    if status == "paid" and payment_date is None:
        raise HTTPException(
            status_code=422,
            detail="A payment date is required when status is paid.",
        )

    if status != "paid" and payment_date is not None:
        raise HTTPException(
            status_code=422,
            detail=(
                "Payment date must be empty unless status is paid."
            ),
        )

    if status == "pending" and due_date < date.today():
        status = "overdue"

    if status == "overdue" and due_date >= date.today():
        raise HTTPException(
            status_code=422,
            detail=(
                "A payment can be marked overdue only after its due date."
            ),
        )

    if payment_method in ("", None):
        payment_method = None
    elif not isinstance(payment_method, str):
        raise HTTPException(
            status_code=422,
            detail="Payment method must be text.",
        )
    else:
        payment_method = payment_method.strip().lower()
        if payment_method not in ALLOWED_PAYMENT_METHODS:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Payment method must be cash, bank_transfer, "
                    "card, cheque, or other."
                ),
            )

    if description is not None:
        if not isinstance(description, str):
            raise HTTPException(
                status_code=422,
                detail="Description must be text or null.",
            )

        description = description.strip() or None

        if description is not None and len(description) > 255:
            raise HTTPException(
                status_code=422,
                detail="Description cannot exceed 255 characters.",
            )

    if not isinstance(currency, str) or currency.strip().upper() != "TND":
        raise HTTPException(
            status_code=422,
            detail="Only TND currency is currently supported.",
        )

    return {
        "student_id": student_id,
        "enrollment_id": enrollment_id,
        "amount": amount,
        "currency": "TND",
        "due_date": due_date,
        "payment_date": payment_date,
        "status": status,
        "payment_method": payment_method,
        "description": description,
    }


def payment_to_dict(db: Session, payment: Payment) -> dict:
    """Convert a payment into a frontend-friendly response."""
    student = db.get(Student, payment.student_id)

    enrollment = (
        db.get(Enrollment, payment.enrollment_id)
        if payment.enrollment_id is not None
        else None
    )

    course = (
        db.get(Course, enrollment.course_id)
        if enrollment is not None
        else None
    )

    return {
        "id": payment.id,
        "student_id": payment.student_id,
        "student_name": (
            f"{student.first_name} {student.last_name}"
            if student
            else None
        ),
        "student_email": student.email if student else None,
        "enrollment_id": payment.enrollment_id,
        "course_id": course.id if course else None,
        "course_name": course.name if course else None,
        "course_code": course.code if course else None,
        "amount": str(payment.amount),
        "currency": payment.currency,
        "due_date": (
            payment.due_date.isoformat()
            if payment.due_date
            else None
        ),
        "payment_date": (
            payment.payment_date.isoformat()
            if payment.payment_date
            else None
        ),
        "status": payment.status,
        "payment_method": payment.payment_method,
        "description": payment.description,
        "created_at": (
            payment.created_at.isoformat()
            if payment.created_at
            else None
        ),
    }


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="CampusFlow API",
    description="API for the CampusFlow university management system.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Welcome to the CampusFlow API!",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "CampusFlow",
    }


# ============================================================
# STUDENTS API
# ============================================================

@app.get("/api/students")
def get_students(db: Session = Depends(get_db)):
    """Return all students, ordered by ID."""
    try:
        students = db.scalars(
            select(Student).order_by(Student.id)
        ).all()

        return [person_to_dict(student) for student in students]

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve students from the database.",
        ) from exc


@app.post("/api/students", status_code=201)
def create_student(
    student_data: dict,
    db: Session = Depends(get_db),
):
    """Create a new student."""
    return create_person(db, Student, student_data, "Student")


@app.put("/api/students/{student_id}")
def update_student(
    student_id: int,
    student_data: dict,
    db: Session = Depends(get_db),
):
    """Update an existing student."""
    return update_person(
        db, Student, student_id, student_data, "Student"
    )


@app.delete("/api/students/{student_id}", status_code=204)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
):
    """Delete a student."""
    delete_person(db, Student, student_id, "Student")
    return None


# ============================================================
# PROFESSORS API
# ============================================================

@app.get("/api/professors")
def get_professors(db: Session = Depends(get_db)):
    """Return all professors, ordered by ID."""
    try:
        professors = db.scalars(
            select(Professor).order_by(Professor.id)
        ).all()

        return [person_to_dict(professor) for professor in professors]

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve professors from the database.",
        ) from exc


@app.post("/api/professors", status_code=201)
def create_professor(
    professor_data: dict,
    db: Session = Depends(get_db),
):
    """Create a new professor."""
    return create_person(db, Professor, professor_data, "Professor")


@app.put("/api/professors/{professor_id}")
def update_professor(
    professor_id: int,
    professor_data: dict,
    db: Session = Depends(get_db),
):
    """Update an existing professor."""
    return update_person(
        db, Professor, professor_id, professor_data, "Professor"
    )


@app.delete("/api/professors/{professor_id}", status_code=204)
def delete_professor(
    professor_id: int,
    db: Session = Depends(get_db),
):
    """Delete a professor."""
    delete_person(db, Professor, professor_id, "Professor")
    return None


# ============================================================
# COURSES API
# ============================================================

@app.get("/api/courses")
def get_courses(db: Session = Depends(get_db)):
    """Return all courses, ordered by ID."""
    try:
        courses = db.scalars(
            select(Course).order_by(Course.id)
        ).all()

        return [course_to_dict(course) for course in courses]

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve courses from the database.",
        ) from exc


@app.post("/api/courses", status_code=201)
def create_course(
    course_data: dict,
    db: Session = Depends(get_db),
):
    """Create a course, optionally assigning a professor."""
    normalized_data = normalize_course_data(db, course_data)
    course = Course(**normalized_data)

    try:
        db.add(course)
        db.commit()
        db.refresh(course)
        return course_to_dict(course)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="The course could not be saved because its code may already exist.",
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save the course to the database.",
        ) from exc


@app.put("/api/courses/{course_id}")
def update_course(
    course_id: int,
    course_data: dict,
    db: Session = Depends(get_db),
):
    """Update an existing course."""
    course = get_course_or_404(db, course_id)
    normalized_data = normalize_course_data(
        db,
        course_data,
        course_id=course_id,
    )

    for field, value in normalized_data.items():
        setattr(course, field, value)

    try:
        db.commit()
        db.refresh(course)
        return course_to_dict(course)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="The course could not be updated because its code may already exist.",
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update the course.",
        ) from exc


@app.delete("/api/courses/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
):
    """Delete a course if no dependent records prevent it."""
    course = get_course_or_404(db, course_id)

    try:
        db.delete(course)
        db.commit()

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Cannot delete this course because other records "
                "depend on it."
            ),
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete the course.",
        ) from exc

    return None


# ============================================================
# ENROLLMENTS API
# ============================================================

@app.get("/api/enrollments")
def get_enrollments(db: Session = Depends(get_db)):
    """Return all enrollments, ordered by ID."""
    try:
        enrollments = db.scalars(
            select(Enrollment).order_by(Enrollment.id)
        ).all()

        return [
            enrollment_to_dict(db, enrollment)
            for enrollment in enrollments
        ]

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve enrollments from the database.",
        ) from exc


@app.get("/api/enrollments/{enrollment_id}")
def get_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
):
    """Return one enrollment."""
    enrollment = get_enrollment_or_404(db, enrollment_id)
    return enrollment_to_dict(db, enrollment)


@app.post("/api/enrollments", status_code=201)
def create_enrollment(
    enrollment_data: dict,
    db: Session = Depends(get_db),
):
    """Enroll a student in a course."""
    normalized_data = normalize_enrollment_data(
        db,
        enrollment_data,
    )

    enrollment = Enrollment(**normalized_data)

    try:
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)

        return enrollment_to_dict(db, enrollment)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "The enrollment could not be saved. "
                "The student may already be enrolled in this course."
            ),
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save the enrollment.",
        ) from exc


@app.put("/api/enrollments/{enrollment_id}")
def update_enrollment(
    enrollment_id: int,
    enrollment_data: dict,
    db: Session = Depends(get_db),
):
    """Update an enrollment. Omitted fields retain their values."""
    enrollment = get_enrollment_or_404(db, enrollment_id)

    normalized_data = normalize_enrollment_data(
        db,
        enrollment_data,
        existing=enrollment,
    )

    for field, value in normalized_data.items():
        setattr(enrollment, field, value)

    try:
        db.commit()
        db.refresh(enrollment)

        return enrollment_to_dict(db, enrollment)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "The enrollment could not be updated because "
                "the student may already be enrolled in this course."
            ),
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update the enrollment.",
        ) from exc


@app.delete("/api/enrollments/{enrollment_id}", status_code=204)
def delete_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
):
    """Delete an enrollment."""
    enrollment = get_enrollment_or_404(db, enrollment_id)

    try:
        db.delete(enrollment)
        db.commit()

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Cannot delete this enrollment because dependent "
                "records, such as payments, refer to it."
            ),
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete the enrollment.",
        ) from exc

    return None


# ============================================================
# PAYMENTS API
# ============================================================

@app.get("/api/payments/summary")
def get_payment_summary(db: Session = Depends(get_db)):
    """
    Return financial totals calculated from actual payment records.

    Collected revenue includes only payments marked as paid.
    Outstanding balance includes pending and overdue payments.
    """
    try:
        total_count = db.scalar(
            select(func.count(Payment.id))
        ) or 0

        paid_count = db.scalar(
            select(func.count(Payment.id)).where(
                Payment.status == "paid"
            )
        ) or 0

        pending_count = db.scalar(
            select(func.count(Payment.id)).where(
                Payment.status == "pending"
            )
        ) or 0

        overdue_count = db.scalar(
            select(func.count(Payment.id)).where(
                Payment.status == "overdue"
            )
        ) or 0

        collected = db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.status == "paid"
            )
        ) or Decimal("0")

        outstanding = db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.status.in_(("pending", "overdue"))
            )
        ) or Decimal("0")

        overdue_amount = db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.status == "overdue"
            )
        ) or Decimal("0")

        return {
            "currency": "TND",
            "total_payments": total_count,
            "paid_count": paid_count,
            "pending_count": pending_count,
            "overdue_count": overdue_count,
            "collected_revenue": str(collected),
            "outstanding_balance": str(outstanding),
            "overdue_amount": str(overdue_amount),
        }

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to calculate the financial summary.",
        ) from exc


@app.get("/api/payments")
def get_payments(
    status: str | None = None,
    student_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Return payments, optionally filtered by status or student."""
    try:
        statement = select(Payment).order_by(Payment.id.desc())

        if status is not None:
            status = status.strip().lower()

            if status not in ALLOWED_PAYMENT_STATUSES:
                raise HTTPException(
                    status_code=422,
                    detail="Invalid payment status filter.",
                )

            statement = statement.where(Payment.status == status)

        if student_id is not None:
            if student_id < 1:
                raise HTTPException(
                    status_code=422,
                    detail="Student ID must be a positive integer.",
                )

            statement = statement.where(
                Payment.student_id == student_id
            )

        payments = db.scalars(statement).all()

        return [
            payment_to_dict(db, payment)
            for payment in payments
        ]

    except HTTPException:
        raise

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve payments from the database.",
        ) from exc


@app.get("/api/payments/{payment_id}")
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    """Return one payment."""
    payment = get_payment_or_404(db, payment_id)
    return payment_to_dict(db, payment)


@app.post("/api/payments", status_code=201)
def create_payment(
    payment_data: dict,
    db: Session = Depends(get_db),
):
    """Create a payment record."""
    normalized_data = normalize_payment_data(db, payment_data)
    payment = Payment(**normalized_data)

    try:
        db.add(payment)
        db.commit()
        db.refresh(payment)

        return payment_to_dict(db, payment)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "The payment could not be saved. Check the student, "
                "enrollment, amount, and payment details."
            ),
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save the payment.",
        ) from exc


@app.put("/api/payments/{payment_id}")
def update_payment(
    payment_id: int,
    payment_data: dict,
    db: Session = Depends(get_db),
):
    """Update a payment. Omitted fields retain their current values."""
    payment = get_payment_or_404(db, payment_id)

    normalized_data = normalize_payment_data(
        db,
        payment_data,
        existing=payment,
    )

    for field, value in normalized_data.items():
        setattr(payment, field, value)

    try:
        db.commit()
        db.refresh(payment)

        return payment_to_dict(db, payment)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="The payment could not be updated.",
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update the payment.",
        ) from exc


@app.delete("/api/payments/{payment_id}", status_code=204)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete an unpaid payment record.

    Paid records are retained to protect the financial history.
    """
    payment = get_payment_or_404(db, payment_id)

    if payment.status == "paid":
        raise HTTPException(
            status_code=409,
            detail=(
                "Paid payment records cannot be deleted. "
                "Preserve the financial history instead."
            ),
        )

    try:
        db.delete(payment)
        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete the payment.",
        ) from exc

    return None
