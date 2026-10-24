import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_BASE_URL = "http://127.0.0.1:8000"

# --------------------------------------------------
# 1. Students
# --------------------------------------------------

students = [
    {"first_name": "Adam", "last_name": "Ben Salem", "email": "adam.bensalem@example.com"},
    {"first_name": "Lina", "last_name": "Trabelsi", "email": "lina.trabelsi@example.com"},
    {"first_name": "Youssef", "last_name": "Mansouri", "email": "youssef.mansouri@example.com"},
    {"first_name": "Mariem", "last_name": "Gharbi", "email": "mariem.gharbi@example.com"},
    {"first_name": "Karim", "last_name": "Haddad", "email": "karim.haddad@example.com"},
    {"first_name": "Nour", "last_name": "Jaziri", "email": "nour.jaziri@example.com"},
    {"first_name": "Sami", "last_name": "Khelifi", "email": "sami.khelifi@example.com"},
    {"first_name": "Amira", "last_name": "Bouazizi", "email": "amira.bouazizi@example.com"},
    {"first_name": "Mehdi", "last_name": "Saidi", "email": "mehdi.saidi@example.com"},
    {"first_name": "Salma", "last_name": "Dridi", "email": "salma.dridi@example.com"},
    {"first_name": "Anis", "last_name": "Chaabane", "email": "anis.chaabane@example.com"},
    {"first_name": "Ines", "last_name": "Ayari", "email": "ines.ayari@example.com"},
    {"first_name": "Walid", "last_name": "Ben Amor", "email": "walid.benamor@example.com"},
    {"first_name": "Farah", "last_name": "Mzoughi", "email": "farah.mzoughi@example.com"},
    {"first_name": "Taha", "last_name": "Rekik", "email": "taha.rekik@example.com"},
    {"first_name": "Rania", "last_name": "Hamdi", "email": "rania.hamdi@example.com"},
    {"first_name": "Oussama", "last_name": "Baccar", "email": "oussama.baccar@example.com"},
    {"first_name": "Yasmine", "last_name": "Ferjani", "email": "yasmine.ferjani@example.com"},
    {"first_name": "Fares", "last_name": "Maalej", "email": "fares.maalej@example.com"},
    {"first_name": "Sirine", "last_name": "Ben Youssef", "email": "sirine.benyoussef@example.com"},
]

# --------------------------------------------------
# 2. Professors
# --------------------------------------------------

professors = [
    {"first_name": "Hichem", "last_name": "Kacem", "email": "hichem.kacem@example.com"},
    {"first_name": "Leila", "last_name": "Saad", "email": "leila.saad@example.com"},
    {"first_name": "Nabil", "last_name": "Jomaa", "email": "nabil.jomaa@example.com"},
    {"first_name": "Amel", "last_name": "Ben Fredj", "email": "amel.benfredj@example.com"},
    {"first_name": "Mourad", "last_name": "Zribi", "email": "mourad.zribi@example.com"},
    {"first_name": "Sonia", "last_name": "Mabrouk", "email": "sonia.mabrouk@example.com"},
    {"first_name": "Kais", "last_name": "Tlili", "email": "kais.tlili@example.com"},
    {"first_name": "Rim", "last_name": "Cherif", "email": "rim.cherif@example.com"},
    {"first_name": "Bilel", "last_name": "Hamza", "email": "bilel.hamza@example.com"},
    {"first_name": "Olfa", "last_name": "Ben Romdhane", "email": "olfa.benromdhane@example.com"},
]

# --------------------------------------------------
# 3. Courses
# Each course is assigned to a professor by email.
# --------------------------------------------------

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


def post_data(endpoint, payload):
    """Send one JSON record to a CampusFlow API endpoint."""
    url = f"{API_BASE_URL}{endpoint}"

    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}

    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"POST {endpoint} failed ({error.code}): {details}"
        ) from error

    except URLError as error:
        raise RuntimeError(
            f"Cannot connect to {API_BASE_URL}. Is the backend running? "
            f"Details: {error.reason}"
        ) from error


def main():
    print("\n=== Creating students ===")
    for student in students:
        result = post_data("/api/students", student)
        print(f"Created student: {student['first_name']} {student['last_name']} (ID: {result.get('id', 'unknown')})")

    print("\n=== Creating professors ===")
    professor_ids = {}

    for professor in professors:
        result = post_data("/api/professors", professor)
        professor_ids[professor["email"]] = result["id"]
        print(f"Created professor: {professor['first_name']} {professor['last_name']} (ID: {result['id']})")

    print("\n=== Creating courses ===")
    for course in courses:
        payload = {
            "name": course["name"],
            "code": course["code"],
            "description": course["description"],
            "credits": course["credits"],
            "professor_id": professor_ids[course["professor_email"]],
        }

        result = post_data("/api/courses", payload)
        print(f"Created course: {course['code']} — {course['name']} (ID: {result.get('id', 'unknown')})")

    print("\nAll 40 records were created successfully!")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, KeyError) as error:
        print(f"\nSEEDING STOPPED: {error}")
        print("Fix the reported issue before running the script again.")
