#!/bin/bash
# Сторож фоновой очереди: выходит (и этим будит агента), если в логе новый FAIL, ALL DONE,
# лог молчит дольше LIMIT минут (зависло) или очередь пропала без ALL DONE.
# Запуск: bash watchdog.sh <лог> [минут=35] [PID очереди]
LOG="$1"; LIMIT=${2:-35}; PID=$3   # PID процесса очереди (ps -ef: bash, время старта)
base=$(grep -c FAIL "$LOG" 2>/dev/null || echo 0)
while true; do
  sleep 60
  n=$(grep -c FAIL "$LOG"); [ "$n" -gt "$base" ] && { echo "FAIL: $(grep FAIL "$LOG" | tail -1)"; exit 1; }
  grep -q "ALL DONE" "$LOG" && { echo "DONE: $(tail -1 "$LOG")"; exit 0; }
  age=$(( ($(date +%s) - $(stat -c %Y "$LOG")) / 60 ))
  [ "$age" -ge "$LIMIT" ] && { echo "STUCK: лог молчит $age мин, последняя строка: $(tail -1 "$LOG")"; exit 2; }
  [ -n "$PID" ] && ! kill -0 "$PID" 2>/dev/null && { echo "DIED: очередь пропала без ALL DONE: $(tail -1 "$LOG")"; exit 3; }
done
