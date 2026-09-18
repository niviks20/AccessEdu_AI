import os
import json
import sqlite3
import datetime

from flask import Flask, render_template, jsonify, request, session, redirect, url_for

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import database as academic_db
from retriever import retrieve, build_context
import accesspath_data

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "change-me-in-.env")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = "/tmp/accessedu.db" if os.environ.get("VERCEL") else os.path.join(BASE_DIR, "database.db")

GROQ_CONFIGURED = bool(os.environ.get("GROQ_API_KEY"))


# ============================================================
# Campus Toolkit database (separate from the academic RAG db)
# ============================================================

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS announcements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT, category TEXT, msg TEXT, created_at TEXT
                )""")

    c.execute("""CREATE TABLE IF NOT EXISTS outpasses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pass_id TEXT, name TEXT, dept TEXT, reason TEXT,
                    status TEXT, created_at TEXT
                )""")

    c.execute("""CREATE TABLE IF NOT EXISTS slots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token TEXT, regno TEXT, purpose TEXT, timeslot TEXT, status TEXT,
                    created_at TEXT
                )""")

    c.execute("""CREATE TABLE IF NOT EXISTS food_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id TEXT, items TEXT, status TEXT, created_at TEXT
                )""")

    c.execute("""CREATE TABLE IF NOT EXISTS marketplace (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT, category TEXT, item_type TEXT, price TEXT,
                    seller TEXT, image_url TEXT, created_at TEXT
                )""")

    c.execute("""CREATE TABLE IF NOT EXISTS assist_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    request_id TEXT, kind TEXT, name TEXT,
                    from_location TEXT, to_location TEXT, needed_time TEXT,
                    status TEXT, created_at TEXT
                )""")

    c.execute("""CREATE TABLE IF NOT EXISTS sos_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_id TEXT, name TEXT, location TEXT, message TEXT,
                    status TEXT, created_at TEXT
                )""")

    c.execute("SELECT COUNT(*) FROM announcements")
    if c.fetchone()[0] == 0:
        c.execute(
            "INSERT INTO announcements (title, category, msg, created_at) VALUES (?, ?, ?, ?)",
            ("Welcome to AccessEdu", "General",
             "This platform brings the AI Academic Bot, AccessPath-AI, Communication tools "
             "and the Campus Toolkit together in one accessible place.",
             datetime.datetime.now().strftime("%d %b %Y, %I:%M %p"))
        )

    conn.commit()
    conn.close()


init_db()
try:
    academic_db.init_database()
except Exception as exc:  # pragma: no cover - startup diagnostics only
    print("Warning: could not initialise academic.db:", exc)


def logged_in():
    return bool(session.get("is_student") or session.get("is_admin") or session.get("is_guest"))


def require_login():
    if not logged_in():
        return jsonify({"status": "error", "message": "Please log in first."}), 401
    return None


# ============================================================
# Auth
# ============================================================

@app.route("/")
def home():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("index.html", active="home")


@app.route("/login")
def login_page():
    if logged_in():
        return redirect(url_for("home"))
    return render_template("login.html", error=request.args.get("error", ""))


@app.route("/student-login", methods=["POST"])
def student_login_form():
    session["is_student"] = True
    session.pop("is_admin", None)
    session.pop("is_guest", None)
    return redirect(url_for("home"))


@app.route("/guest-login", methods=["POST"])
def guest_login_form():
    session["is_guest"] = True
    session.pop("is_student", None)
    session.pop("is_admin", None)
    return redirect(url_for("home"))


@app.route("/admin-login", methods=["POST"])
def admin_login_form():
    username = (request.form.get("username") or "").strip()
    password = request.form.get("password") or ""
    admin_user = os.environ.get("ADMIN_USERNAME", "admin")
    admin_pass = os.environ.get("ADMIN_PASSWORD", "admin123")
    if username == admin_user and password == admin_pass:
        session["is_admin"] = True
        session.pop("is_student", None)
        session.pop("is_guest", None)
        return redirect(url_for("admin_page"))
    return redirect(url_for("login_page", error="Invalid username or password."))


@app.route("/logout")
def logout_page():
    session.clear()
    return redirect(url_for("login_page"))


@app.route("/api/logout", methods=["GET"])
def logout_api():
    session.clear()
    return jsonify({"status": "success", "message": "Logged out."})


# ============================================================
# Feature hub pages
# ============================================================

@app.route("/toolkit")
def toolkit_home():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("toolkit.html", active="toolkit")


@app.route("/admin")
def admin_page():
    if not session.get("is_admin"):
        return redirect(url_for("home"))
    return render_template("admin.html", active="admin")


# ============================================================
# FEATURE 1 — AI Academic Bot (Groq RAG: learn / notes / practice)
# ============================================================

@app.route("/academic")
def academic_home():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("academic.html", active="academic", groq_configured=GROQ_CONFIGURED)


def _topic_context(subject, unit, topic_code):
    topic = academic_db.get_topic(subject, int(unit), topic_code)
    if not topic:
        return None, None
    chunks = academic_db.get_chunks(topic["id"])
    context = build_context(chunks)
    return topic, context


@app.route("/api/academic/subjects")
def api_academic_subjects():
    subjects = academic_db.get_subjects()
    return jsonify({"subjects": [s["name"] for s in subjects]})


@app.route("/api/academic/units")
def api_academic_units():
    subject = request.args.get("subject", "")
    units = academic_db.get_units(subject)
    return jsonify({"units": [u["unit_number"] for u in units]})


@app.route("/api/academic/topics")
def api_academic_topics():
    subject = request.args.get("subject", "")
    unit = request.args.get("unit", "")
    if not unit:
        return jsonify({"topics": []})
    topics = academic_db.get_topics(subject, int(unit))
    return jsonify({"topics": [{"code": t["topic_code"], "name": t["topic_name"]} for t in topics]})


def _require_groq():
    if not GROQ_CONFIGURED:
        return jsonify({
            "status": "error",
            "message": "GROQ_API_KEY is not configured on the server. Ask an admin to add it to .env."
        }), 503
    return None


@app.route("/api/academic/learn", methods=["POST"])
def api_academic_learn():
    auth = require_login()
    if auth:
        return auth
    blocked = _require_groq()
    if blocked:
        return blocked

    data = request.get_json(silent=True) or {}
    topic, context = _topic_context(data.get("subject"), data.get("unit"), data.get("topic"))
    if not topic:
        return jsonify({"status": "error", "message": "Topic not found."}), 404

    from ai_service import generate_learn
    try:
        content = generate_learn(topic["topic_name"], context)
    except Exception as exc:
        return jsonify({"status": "error", "message": f"AI engine error: {exc}"}), 502

    return jsonify({"status": "success", "topic": topic["topic_name"], "content": content})


@app.route("/api/academic/notes", methods=["POST"])
def api_academic_notes():
    auth = require_login()
    if auth:
        return auth
    blocked = _require_groq()
    if blocked:
        return blocked

    data = request.get_json(silent=True) or {}
    topic, context = _topic_context(data.get("subject"), data.get("unit"), data.get("topic"))
    if not topic:
        return jsonify({"status": "error", "message": "Topic not found."}), 404

    from ai_service import generate_notes
    try:
        content = generate_notes(topic["topic_name"], context)
    except Exception as exc:
        return jsonify({"status": "error", "message": f"AI engine error: {exc}"}), 502

    return jsonify({"status": "success", "topic": topic["topic_name"], "content": content})


@app.route("/api/academic/practice/start", methods=["POST"])
def api_academic_practice_start():
    auth = require_login()
    if auth:
        return auth
    blocked = _require_groq()
    if blocked:
        return blocked

    data = request.get_json(silent=True) or {}
    topic, context = _topic_context(data.get("subject"), data.get("unit"), data.get("topic"))
    if not topic:
        return jsonify({"status": "error", "message": "Topic not found."}), 404

    from pratice_service import start_practice
    try:
        result = start_practice(topic["topic_name"], context)
    except Exception as exc:
        return jsonify({"status": "error", "message": f"AI engine error: {exc}"}), 502

    return jsonify({"status": "success", **result})


@app.route("/api/academic/practice/evaluate", methods=["POST"])
def api_academic_practice_evaluate():
    auth = require_login()
    if auth:
        return auth
    blocked = _require_groq()
    if blocked:
        return blocked

    data = request.get_json(silent=True) or {}
    topic, context = _topic_context(data.get("subject"), data.get("unit"), data.get("topic"))
    if not topic:
        return jsonify({"status": "error", "message": "Topic not found."}), 404

    question = data.get("question", "")
    answer = data.get("answer", "")

    from pratice_service import evaluate_answer
    try:
        result = evaluate_answer(topic["topic_name"], context, question, answer)
    except Exception as exc:
        return jsonify({"status": "error", "message": f"AI engine error: {exc}"}), 502

    return jsonify({"status": "success", **result})


@app.route("/api/academic/practice/next", methods=["POST"])
def api_academic_practice_next():
    auth = require_login()
    if auth:
        return auth
    blocked = _require_groq()
    if blocked:
        return blocked

    data = request.get_json(silent=True) or {}
    topic, context = _topic_context(data.get("subject"), data.get("unit"), data.get("topic"))
    if not topic:
        return jsonify({"status": "error", "message": "Topic not found."}), 404

    question_number = int(data.get("question_number", 2))

    from pratice_service import generate_next_question
    try:
        result = generate_next_question(topic["topic_name"], context, question_number)
    except Exception as exc:
        return jsonify({"status": "error", "message": f"AI engine error: {exc}"}), 502

    return jsonify({"status": "success", **result})


# General free-form tutor chat (kept from the original build, Gemini-based, optional)
@app.route("/api/academic-chat", methods=["POST"])
def academic_chat():
    auth = require_login()
    if auth:
        return auth

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"status": "error", "message": "GEMINI_API_KEY is not configured."}), 503

    data = request.get_json(silent=True) or {}
    question = str(data.get("question") or "").strip()
    if not question:
        return jsonify({"status": "error", "message": "Please enter a question."}), 400

    import urllib.request, urllib.error

    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": question}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 2048}
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="POST", headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
        candidates = result.get("candidates") or []
        if not candidates:
            return jsonify({"status": "error", "message": "No answer returned."}), 502
        parts = (candidates[0].get("content") or {}).get("parts") or []
        answer = "".join(p.get("text", "") for p in parts).strip()
        return jsonify({"status": "success", "answer": answer})
    except urllib.error.HTTPError as error:
        return jsonify({"status": "error", "message": f"Gemini error ({error.code})"}), error.code
    except Exception as error:
        return jsonify({"status": "error", "message": str(error)}), 500


# ============================================================
# FEATURE 2 — AccessPath-AI (campus wayfinding)
# ============================================================

@app.route("/accesspath")
def accesspath_home():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("accesspath.html", active="accesspath", locations=accesspath_data.list_locations())


@app.route("/api/accesspath/route")
def api_accesspath_route():
    start = request.args.get("from", "")
    end = request.args.get("to", "")
    accessible_only = request.args.get("accessible_only", "1") == "1"

    route = accesspath_data.find_route(start, end, accessible_only=accessible_only)
    if not route:
        message = ("No accessible step-free route was found between these points. "
                    "Try turning off the accessible-only filter or ask a staff member for an escort.")
        return jsonify({"success": False, "message": message}), 404

    return jsonify({"success": True, "route": route})


# ============================================================
# FEATURE 3 — Communication
# ============================================================

@app.route("/communication")
def communication_home():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("communication.html", active="communication")


# ============================================================
# FEATURE 4 — Campus Toolkit
# ============================================================

@app.route("/outpass")
def outpass():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("outpass.html", active="toolkit")


@app.route("/api/outpass/apply", methods=["POST"])
def apply_outpass():
    auth = require_login()
    if auth:
        return auth
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    count = conn.execute("SELECT COUNT(*) FROM outpasses").fetchone()[0]
    pass_id = f"PEC-OUT-{count + 1:04d}"
    now = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    conn.execute(
        "INSERT INTO outpasses (pass_id, name, dept, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (pass_id, data.get("name", ""), data.get("dept", ""), data.get("reason", ""), "Pending approval", now)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "outpass_id": pass_id})


@app.route("/api/outpass/list")
def get_outpasses():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM outpasses ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "data": [dict(r) for r in rows]})


@app.route("/slot")
def slot():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("slot.html", active="toolkit")


@app.route("/api/book-slot", methods=["POST"])
def book_slot():
    auth = require_login()
    if auth:
        return auth
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    count = conn.execute("SELECT COUNT(*) FROM slots").fetchone()[0]
    token = f"SLOT-{count + 101}"
    now = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    conn.execute(
        "INSERT INTO slots (token, regno, purpose, timeslot, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (token, data.get("regno", ""), data.get("purpose", ""), data.get("timeslot", ""), "Confirmed", now)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": f"Token generated: {token}", "token": token})


@app.route("/api/slots/list")
def get_slots():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM slots ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "data": [dict(r) for r in rows]})


@app.route("/food")
def food():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("food.html", active="toolkit")


@app.route("/api/food/order", methods=["POST"])
def food_order():
    auth = require_login()
    if auth:
        return auth
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    count = conn.execute("SELECT COUNT(*) FROM food_orders").fetchone()[0]
    order_id = f"FOOD-{count + 501}"
    items_str = ", ".join(data.get("items", []))
    now = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    conn.execute(
        "INSERT INTO food_orders (order_id, items, status, created_at) VALUES (?, ?, ?, ?)",
        (order_id, items_str, "Preparing", now)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "order_id": order_id})


@app.route("/api/food/list")
def get_food_orders():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM food_orders ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "data": [dict(r) for r in rows]})


@app.route("/marketplace")
def marketplace():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("marketplace.html", active="toolkit")


@app.route("/api/marketplace/list")
def get_marketplace():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM marketplace ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "data": [dict(r) for r in rows]})


@app.route("/api/marketplace/add", methods=["POST"])
def add_marketplace():
    auth = require_login()
    if auth:
        return auth
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    now = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    conn.execute(
        "INSERT INTO marketplace (title, category, item_type, price, seller, image_url, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (data.get("title", ""), data.get("category", ""), data.get("item_type", "Sell"),
         data.get("price", ""), data.get("seller", ""), data.get("image_url", ""), now)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Listing published."})


@app.route("/announce")
def announce():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("announce.html", active="toolkit")


@app.route("/api/announcements")
def get_announcements():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM announcements ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "data": [dict(r) for r in rows]})


@app.route("/api/announcements/add", methods=["POST"])
def add_announcement():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Admin login required."}), 403
    data = request.get_json(silent=True) or {}
    now = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO announcements (title, category, msg, created_at) VALUES (?, ?, ?, ?)",
        (data.get("title", ""), data.get("category", ""), data.get("msg", ""), now)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Announcement posted."})


@app.route("/assist")
def assist():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("assist.html", active="toolkit")


@app.route("/api/assist/request", methods=["POST"])
def assist_request():
    auth = require_login()
    if auth:
        return auth
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    count = conn.execute("SELECT COUNT(*) FROM assist_requests").fetchone()[0]
    request_id = f"ASSIST-{count + 1:04d}"
    now = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    conn.execute(
        "INSERT INTO assist_requests (request_id, kind, name, from_location, to_location, needed_time, status, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (request_id, data.get("kind", "wheelchair"), data.get("name", ""),
         data.get("from_location", ""), data.get("to_location", ""), data.get("needed_time", ""),
         "Requested", now)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "request_id": request_id})


@app.route("/api/assist/list")
def assist_list():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM assist_requests ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "data": [dict(r) for r in rows]})


@app.route("/attendance")
def attendance():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("attendance.html", active="toolkit")


# ============================================================
# Emergency SOS
# ============================================================

@app.route("/sos")
def sos():
    if not logged_in():
        return redirect(url_for("login_page"))
    return render_template("sos.html", active="sos")


@app.route("/api/sos/alert", methods=["POST"])
def sos_alert():
    auth = require_login()
    if auth:
        return auth
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    count = conn.execute("SELECT COUNT(*) FROM sos_alerts").fetchone()[0]
    alert_id = f"SOS-{count + 1:04d}"
    now = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    conn.execute(
        "INSERT INTO sos_alerts (alert_id, name, location, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (alert_id, data.get("name", "Anonymous"), data.get("location", "Not shared"),
         data.get("message", ""), "New", now)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "alert_id": alert_id,
                     "message": "Security has been notified. Stay where you are if it is safe to do so."})


@app.route("/api/sos/list")
def sos_list():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Admin login required."}), 403
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM sos_alerts ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "data": [dict(r) for r in rows]})


@app.route("/api/health")
def health():
    return jsonify({
        "status": "success",
        "message": "AccessEdu backend is running.",
        "groq_configured": GROQ_CONFIGURED,
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY")),
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
