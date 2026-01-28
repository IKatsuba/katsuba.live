FROM denoland/deno:2.4.3

WORKDIR /app

COPY . .

RUN deno install

CMD ["deno", "task", "cron:publish"]