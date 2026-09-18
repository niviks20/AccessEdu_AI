import os
import sys

from pdf_processor import process_pdf


if __name__ == "__main__":

    subject = sys.argv[1] if len(sys.argv) > 1 else "Cloud Computing"
    unit = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    pdf_path = sys.argv[3] if len(sys.argv) > 3 else os.path.join(
        "knowledge", "cloud computing", "unit1.pdf"
    )

    print()
    print("=" * 60)
    print("INDEXING PDF")
    print("=" * 60)

    topics = process_pdf(
        subject,
        unit,
        pdf_path
    )

    print()
    print("Detected topics:")

    for topic in topics:
        print(
            f"{topic['code']} - {topic['name']}"
        )

    print()
    print("PDF indexing completed.")