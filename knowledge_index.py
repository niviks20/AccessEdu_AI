import os
import re

import database as academic_db


UNIT_FILE_PATTERN = re.compile(r"^unit[ _-]*(\d+)\.(pdf)$", re.IGNORECASE)


def _normalise_name(value):
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _find_subject(subject_folders, folder_name):
    wanted = _normalise_name(folder_name)
    for subject in subject_folders:
        if _normalise_name(subject["name"]) == wanted:
            return subject["name"]
    return None


def _needs_index(subject_name, unit_number, pdf_path):
    current_path = os.path.normcase(os.path.abspath(pdf_path))
    for unit in academic_db.get_units(subject_name):
        if unit["unit_number"] != unit_number:
            continue
        stored_path = unit.get("pdf_path") or ""
        stored_path = os.path.normcase(os.path.abspath(stored_path))
        if stored_path == current_path and academic_db.get_topics(subject_name, unit_number):
            return False
    return True


def sync_knowledge_folder(root_dir):
    """Index knowledge/<subject>/unitN.pdf files that are new or moved."""
    if not os.path.isdir(root_dir):
        return {"indexed": [], "skipped": [], "errors": []}

    subjects = academic_db.get_subjects()
    result = {"indexed": [], "skipped": [], "errors": []}

    for folder_name in sorted(os.listdir(root_dir)):
        folder_path = os.path.join(root_dir, folder_name)
        if not os.path.isdir(folder_path):
            continue

        subject_name = _find_subject(subjects, folder_name)
        if not subject_name:
            result["errors"].append(
                f"Unknown subject folder '{folder_name}'. Add the subject to database.py first."
            )
            continue

        for filename in sorted(os.listdir(folder_path)):
            match = UNIT_FILE_PATTERN.match(filename)
            if not match:
                continue

            unit_number = int(match.group(1))
            pdf_path = os.path.join(folder_path, filename)
            if not _needs_index(subject_name, unit_number, pdf_path):
                result["skipped"].append(pdf_path)
                continue

            try:
                from pdf_processor import process_pdf

                process_pdf(subject_name, unit_number, pdf_path)
                result["indexed"].append(pdf_path)
            except Exception as exc:
                result["errors"].append(f"{pdf_path}: {exc}")

    return result