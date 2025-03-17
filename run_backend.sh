#!/bin/bash

cd backend
source venv/bin/activate
export FLASK_APP=app.py
export FLASK_ENV=development
python app.py 