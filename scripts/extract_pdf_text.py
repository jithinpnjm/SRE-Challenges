#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

import objc
from Foundation import NSURL


PDFKIT_FRAMEWORK = "/System/Library/Frameworks/PDFKit.framework"


def load_pdfkit() -> None:
    objc.loadBundle("PDFKit", globals(), bundle_path=PDFKIT_FRAMEWORK)


def extract_pdf(pdf_path: Path) -> dict:
    url = NSURL.fileURLWithPath_(str(pdf_path))
    document = PDFDocument.alloc().initWithURL_(url)  # type: ignore[name-defined]
    if not document:
        raise RuntimeError(f"Unable to open PDF: {pdf_path}")

    text = document.string() or ""
    page_count = int(document.pageCount())
    return {
        "path": str(pdf_path),
        "name": pdf_path.name,
        "pages": page_count,
        "text": str(text),
    }


def iter_pdfs(root: Path) -> list[Path]:
    if root.is_file():
        return [root]
    return sorted(
        path
        for path in root.rglob("*.pdf")
        if " (1)." not in path.name and path.name != "AWS-Jithin-Questions.zip"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract text from PDFs using macOS PDFKit.")
    parser.add_argument("source", help="PDF file or directory")
    parser.add_argument("--limit", type=int, default=0, help="Maximum PDFs to process")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument(
        "--preview-chars",
        type=int,
        default=1000,
        help="Preview length for non-JSON output",
    )
    args = parser.parse_args()

    load_pdfkit()

    source = Path(args.source)
    pdfs = iter_pdfs(source)
    if args.limit > 0:
        pdfs = pdfs[: args.limit]

    results = [extract_pdf(path) for path in pdfs]

    if args.json:
        print(json.dumps(results, indent=2))
        return

    for result in results:
        print(f"=== {result['name']} ({result['pages']} pages) ===")
        print(result["text"][: args.preview_chars].strip())
        print()


if __name__ == "__main__":
    main()
