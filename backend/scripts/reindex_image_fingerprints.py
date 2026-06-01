#!/usr/bin/env python3
"""
One-shot entry point (same as Django management command).

Run from repository root or from backend/:

  cd backend
  py scripts/reindex_image_fingerprints.py
  py scripts/reindex_image_fingerprints.py --all -v

Depends on: Django project settings, MongoDB, Pillow, ImageHash, requests.
"""
from __future__ import annotations

import os
import sys


def main() -> None:
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, backend_dir)
    os.chdir(backend_dir)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_project.settings")

    import django

    django.setup()

    from django.core.management import call_command

    call_command("reindex_product_image_phash", *sys.argv[1:])


if __name__ == "__main__":
    main()
