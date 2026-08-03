#!/bin/bash
# Telecaller CRM — server .htaccess manager.
#
# The full CODE deploy is handled by GitHub Actions (push to production-live).
# This script only pushes the canonical ./htaccess in this repo to the server as
# out/.htaccess (cache headers + version.json no-store). The CI deploy preserves
# out/.htaccess, so a one-time push survives future code deploys.
#
# Usage:  bash deploy.sh --htaccess
#
# Needs a gitignored deploy.config.sh next to this script:
#   SERVER_USER="ubuntu"
#   SERVER_IP="13.234.5.220"
#   SSH_KEY="$HOME/.ssh/chesa-server.pem"
#   SERVER_DIR="/var/www/html/telecaller-crm/out"

set -e
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$SCRIPT_DIR/deploy.config.sh" ]; then
  echo -e "${RED}deploy.config.sh not found next to deploy.sh.${NC}"
  echo -e "${YELLOW}Create it with SERVER_USER / SERVER_IP / SSH_KEY / SERVER_DIR (see header). It is gitignored.${NC}"
  exit 1
fi
source "$SCRIPT_DIR/deploy.config.sh"
: "${SERVER_DIR:=/var/www/html/telecaller-crm/out}"

ACTION="${1:-}"
if [ "$ACTION" != "--htaccess" ]; then
  echo -e "${YELLOW}Only --htaccess is supported (full code deploy = GitHub Actions on production-live).${NC}"
  echo -e "Usage: ${GREEN}bash deploy.sh --htaccess${NC}"
  exit 1
fi

HTACCESS_LOCAL="$SCRIPT_DIR/htaccess"
[ -f "$HTACCESS_LOCAL" ] || { echo -e "${RED}Local ./htaccess not found at $HTACCESS_LOCAL${NC}"; exit 1; }

TS=$(date +%Y%m%d-%H%M%S)
echo -e "${YELLOW}=== Push .htaccess → $SERVER_USER@$SERVER_IP:$SERVER_DIR/.htaccess ===${NC}"

REMOTE_CMD="
  set -e
  if [ -f '$SERVER_DIR/.htaccess' ]; then
    sudo cp '$SERVER_DIR/.htaccess' '$SERVER_DIR/.htaccess.bak.$TS'
    echo 'Backed up existing .htaccess → .htaccess.bak.$TS'
  else
    echo 'No existing .htaccess — first install.'
  fi
  sudo mv '/tmp/.htaccess.tc.$TS' '$SERVER_DIR/.htaccess'
  sudo chmod 644 '$SERVER_DIR/.htaccess'
  sudo a2enmod headers >/dev/null 2>&1 || true
  echo '--- apachectl configtest ---'
  sudo apachectl configtest
  sudo systemctl reload apache2
  echo '--- .htaccess is live ---'
"

echo -e "${YELLOW}[1/2] Uploading via SCP...${NC}"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$HTACCESS_LOCAL" "$SERVER_USER@$SERVER_IP:/tmp/.htaccess.tc.$TS"
echo -e "${YELLOW}[2/2] Applying on server...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$REMOTE_CMD"

echo -e "${GREEN}=== Done. .htaccess updated. ===${NC}"
echo -e "Rollback: ${YELLOW}sudo cp $SERVER_DIR/.htaccess.bak.$TS $SERVER_DIR/.htaccess && sudo systemctl reload apache2${NC}"
