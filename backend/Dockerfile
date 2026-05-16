FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

COPY start.sh .
RUN chmod +x start.sh \
    && adduser --disabled-password --gecos "" --no-create-home appuser \
    && chown -R appuser:appuser /app

USER appuser

CMD ["./start.sh"]
