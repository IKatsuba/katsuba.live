FROM denoland/deno:2.9.7

WORKDIR /app

COPY . .

RUN deno install

CMD ["deno", "task", "cron:publish"]
