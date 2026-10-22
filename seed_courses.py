import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

API_BASE_URL = "http://127.0.0.1:8000"

courses = [
    {
        "name": "Introduction to Programming",
        "code": "CS101",
        "description": "Learn programming fundamentals, variables, functions, and problem-solving.",
        "credits": 3,
        "professor_email": "hichem.kacem@example.com",
    },
    {
        "name": "Database Management Systems",
        "code": "CS201",
        "description": "Study relational databases, SQL queries, and database design.",
        "credits": 4,
        "professor_email": "leila.saad@example.com",
    },
    {
        "name": "Data Structures and Algorithms",
        "code": "CS202",
        "description": "Explore data structures, algorithms, sorting, and searching.",
        "credits": 4,
        "professor_email": "nabil.jomaa@example.com",
    },
    {
        "name": "Web Development",
        "code": "CS301",
        "description": "Build interactive websites using HTML, CSS, JavaScript, and modern frameworks.",
        "credits": 3,
        "professor_email": "amel.benfredj@example.com",
    },
    {
        "name": "Financial Mathematics",
        "code": "FIN101",
        "description": "Apply mathematical methods to financial calculations and investment problems.",
        "credits": 3,
        "professor_email": "mourad.zribi@example.com",
    },
    {
        "name": "Digital Banking",
        "code": "FIN202",
        "description": "Understand digital payments, mobile banking, and modern financial services.",
        "credits": 3,
        "professor_email": "sonia.mabrouk@example.com",
    },
    {
        "name": "Data Analytics",
        "code": "DS201",
        "description": "Analyze datasets, visualize patterns, and communicate insights.",
        "credits": 4,
        "professor_email": "kais.tlili@example.com",
    },
    {
        "name": "Machine Learning",
        "code": "DS301",
        "description": "Learn supervised learning, model evaluation, and predictive analytics.",
        "credits": 4,
        "professor_email": "rim.cherif@example.com",
    },
    {
        "name": "Cybersecurity Fundamentals",
        "code": "CS204",
        "description": "Understand common cyber threats, security principles, and risk prevention.",
        "credits": 3,
        "professor_email": "bilel.hamza@example.com",
    },
    {
        "name": "Project Management",
        "code": "MGT101",
        "description": "Learn project planning, scheduling, teamwork, and risk management.",
        "credits": 2,
        "professor_email": "olfa.benromdhane@example.com",
    },
]


def api_request(endpoint, method="GET", payload=None):
    url = f"{API_BASE_URL}{endpoint}"

    headers = {"Accept": "application/json"}

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = Request(
        url,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None

    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"{method} {endpoint} returned HTTP {error.code}: {details}"
        ) from error

    except URLError as error:
        raise RuntimeError(
            f"Could not connect to {API_BASE_URL}. "
            "Make sure your backend is running."
        ) from error


def main():
    print("Loading professors from the API...")

    professors = api_request("/api/professors")

    # Match professor email addresses to their real database IDs.
    professor_ids = {
        professor["email"].lower(): professor["id"]
        for professor in professors
    }

    print(f"Found {len(professor_ids)} professors.")

    # Check that every required professor exists before creating courses.
    missing = [
        course["professor_email"]
        for course in courses
        if course["professor_email"].lower() not in professor_ids
    ]

    if missing:
        print("\nCannot create all courses. These professors were not found:")
        for email in missing:
            print(f"  - {email}")
        print("\nNo courses were submitted. Check your professor records.")
        return

    # Fetch existing courses to avoid duplicate course codes.
    existing_courses = api_request("/api/courses")
    existing_codes = {
        course["code"].upper()
        for course in existing_courses
    }

    created = 0
    skipped = 0
    failed = 0

    print("\nCreating courses...\n")

    for course in courses:
        code = course["code"]

        if code.upper() in existing_codes:
            print(f"SKIPPED {code}: already exists.")
            skipped += 1
            continue

        payload = {
            "name": course["name"],
            "code": code,
            "description": course["description"],
            "credits": course["credits"],
            "professor_id": professor_ids[
                course["professor_email"].lower()
            ],
        }

        try:
            result = api_request(
                "/api/courses",
                method="POST",
                payload=payload,
            )

            print(f"CREATED {code}: {course['name']}")
            created += 1
            existing_codes.add(code.upper())

        except RuntimeError as error:
            print(f"FAILED {code}: {error}")
            failed += 1

    print("\n========== SUMMARY ==========")
    print(f"Created: {created}")
    print(f"Skipped (already existed): {skipped}")
    print(f"Failed: {failed}")
    print("=============================")


if __name__ == "__main__":
    main()
