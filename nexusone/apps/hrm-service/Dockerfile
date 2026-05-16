FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 8002
CMD ["python", "app/manage.py", "runserver", "0.0.0.0:8002"]
