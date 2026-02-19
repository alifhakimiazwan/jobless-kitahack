"""
Script to generate additional interview questions using Gemini.
Useful for expanding the question bank beyond the initial 150.

Usage:
  python scripts/generate_questions.py --company "Grab" --position "Software Engineer" --count 10
"""

import argparse
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


def main():
    parser = argparse.ArgumentParser(description="Generate interview questions")
    parser.add_argument("--company", required=True, help="Company name")
    parser.add_argument("--position", required=True, help="Position title")
    parser.add_argument("--count", type=int, default=10, help="Number of questions")
    parser.add_argument("--output", default="backend/data/questions_new.json", help="Output file")
    args = parser.parse_args()

    print(f"Generating {args.count} questions for {args.position} at {args.company}...")
    print("Note: This script requires GOOGLE_API_KEY to be set.")
    print(f"Output will be saved to: {args.output}")

    # This is a template - implement with Gemini API when ready
    print("\nTo implement: Use google.generativeai to generate questions matching the schema in data/questions.json")


if __name__ == "__main__":
    main()
