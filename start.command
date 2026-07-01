#!/bin/zsh

cd "$(dirname "$0")" || exit 1

PORT=8000
URL="http://localhost:${PORT}/"

if ! command -v python3 > /dev/null; then
  echo "Python 3 wurde nicht gefunden."
  echo "Bitte Python 3 installieren oder die App auf einem Webserver hosten."
  read -r "?Enter druecken zum Schliessen."
  exit 1
fi

echo "Broadcast Simulator startet auf ${URL}"
echo "Dieses Fenster offen lassen, solange die App verwendet wird."
echo "Zum Beenden Ctrl+C druecken oder dieses Fenster schliessen."
echo

if lsof -ti tcp:${PORT} -sTCP:LISTEN > /dev/null; then
  echo "Auf Port ${PORT} laeuft bereits ein Server. Oeffne ${URL}"
  open "${URL}"
  exit 0
fi

(sleep 3; open "${URL}") &
python3 -m http.server "${PORT}"
