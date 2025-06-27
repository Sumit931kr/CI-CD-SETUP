#!/bin/bash

# === CONFIGURATION ===
BRANCH="main"
REPO_DIR="/home/ubuntu/resource/source/lca-web"
LOG_FILE="/home/ubuntu/resource/source/deploy.log"
BUILD_DIR=".next"
BACKUP_DIR=".next_backup"
PM2_PROCESS_NAME="next-app" # or use ID, e.g., 0

# === HELPER FUNCTIONS ===
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# === BEGIN DEPLOYMENT ===
cd "$REPO_DIR" || { log "ERROR: Cannot cd into $REPO_DIR"; exit 1; }

log "Fetching latest changes from origin..."
git fetch origin "$BRANCH" >> "$LOG_FILE" 2>&1

LOCAL_HASH=$(git rev-parse "$BRANCH")
REMOTE_HASH=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
  log "No new commits to deploy. Exiting."
  exit 0
fi

log "New commits found. Pulling changes..."
git pull origin "$BRANCH" >> "$LOG_FILE" 2>&1 || { log "ERROR: Git pull failed"; exit 1; }

log "Backing up current build..."
rm -rf "$BACKUP_DIR"
cp -r "$BUILD_DIR" "$BACKUP_DIR"

log "Installing dependencies..."
npm install >> "$LOG_FILE" 2>&1 || { log "ERROR: npm install failed"; exit 1; }

log "Running build..."
if npm run build >> "$LOG_FILE" 2>&1; then
  log "Build succeeded. Restarting PM2 process..."
  pm2 restart "$PM2_PROCESS_NAME" >> "$LOG_FILE" 2>&1
  log "Deployment successful."
  exit 5  # ✅ Success exit code
else
  log "ERROR: Build failed. Restoring previous build..."
  rm -rf "$BUILD_DIR"
  mv "$BACKUP_DIR" "$BUILD_DIR"
  log "Restarting previous version..."
  pm2 restart "$PM2_PROCESS_NAME" >> "$LOG_FILE" 2>&1
  log "Previous version restarted."
  exit 9  # ❌ Failure exit code
fi

