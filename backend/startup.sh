#!/bin/bash
cd /home/site/wwwroot
pip install -r requirements.prod.txt --quiet
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
