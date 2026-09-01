#!/bin/bash
# Full end-to-end test suite for Attest — Phase 1.1/1.2/1.3
# Usage: bash test-attest.sh
# Requires: the Spring Boot app running on localhost:8080, and a test PDF.

BASE_URL="http://localhost:8080"
PASS_COUNT=0
FAIL_COUNT=0

# ---- Set up test files ----
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR" || exit 1

echo "This is the original test document." > original.pdf
cp original.pdf tampered.pdf
echo "extra byte" >> tampered.pdf
touch empty.pdf

check() {
  local label="$1"
  local response="$2"
  local expect="$3"
  if echo "$response" | grep -q "$expect"; then
    echo "✅ PASS: $label"
    PASS_COUNT=$((PASS_COUNT+1))
  else
    echo "❌ FAIL: $label"
    echo "   Expected to contain: $expect"
    echo "   Got: $response"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
}

extract_id() {
  echo "$1" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*'
}

echo "=================================================="
echo "1. AUTH — Register & Login"
echo "=================================================="

UNIQUE_EMAIL="admin$(date +%s)@attest.dev"

REG=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\",\"password\":\"Testpass123!\",\"role\":\"ADMIN\"}")
check "Register new user succeeds" "$REG" "\"role\":\"ADMIN\""
USER_ID=$(extract_id "$REG")

REG_DUPLICATE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\",\"password\":\"Testpass123!\",\"role\":\"ADMIN\"}")
check "Duplicate email rejected" "$REG_DUPLICATE" "already registered"

REG_INVALID=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"bademail","password":"short","role":"VIEWER"}')
check "Invalid email + short password rejected" "$REG_INVALID" "Validation failed"

LOGIN_OK=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\",\"password\":\"Testpass123!\"}")
check "Login with correct password succeeds" "$LOGIN_OK" "\"email\":\"$UNIQUE_EMAIL\""

LOGIN_BAD=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\",\"password\":\"WrongPassword!\"}")
check "Login with wrong password rejected" "$LOGIN_BAD" "Invalid email or password"

echo ""
echo "=================================================="
echo "2. DOCUMENTS — Upload, Verify, Tamper detection"
echo "=================================================="

UPLOAD=$(curl -s -X POST $BASE_URL/api/documents \
  -F "file=@original.pdf" -F "ownerId=$USER_ID")
check "Upload succeeds" "$UPLOAD" "\"status\":\"DRAFT\""
DOC_ID=$(extract_id "$UPLOAD")
echo "   (uploaded document id: $DOC_ID)"

UPLOAD_EMPTY=$(curl -s -X POST $BASE_URL/api/documents \
  -F "file=@empty.pdf" -F "ownerId=$USER_ID")
check "Empty file upload rejected" "$UPLOAD_EMPTY" "must not be empty"

VERIFY_ORIGINAL=$(curl -s -X POST $BASE_URL/api/documents/$DOC_ID/verify \
  -F "file=@original.pdf")
check "Verify original file matches (Hash verified)" "$VERIFY_ORIGINAL" "\"verified\":true"

VERIFY_TAMPERED=$(curl -s -X POST $BASE_URL/api/documents/$DOC_ID/verify \
  -F "file=@tampered.pdf")
check "Verify tampered file fails (Integrity verification failed)" "$VERIFY_TAMPERED" "\"verified\":false"

VERIFY_MISSING=$(curl -s -X POST $BASE_URL/api/documents/999999/verify \
  -F "file=@original.pdf")
check "Verify against non-existent document returns 404 message" "$VERIFY_MISSING" "Document not found"

echo ""
echo "=================================================="
echo "3. VERSIONING — Amend creates a new immutable version"
echo "=================================================="

AMEND=$(curl -s -X POST $BASE_URL/api/documents/$DOC_ID/amend \
  -F "file=@tampered.pdf" -F "ownerId=$USER_ID")
check "Amend creates version 2" "$AMEND" "\"version\":2"
NEW_DOC_ID=$(extract_id "$AMEND")
echo "   (new version document id: $NEW_DOC_ID)"

VERIFY_ORIGINAL_AGAIN=$(curl -s -X POST $BASE_URL/api/documents/$DOC_ID/verify \
  -F "file=@original.pdf")
check "Original version still verifies correctly after amendment" "$VERIFY_ORIGINAL_AGAIN" "\"verified\":true"

echo ""
echo "=================================================="
echo "RESULTS: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "=================================================="

rm -rf "$TEST_DIR"

if [ "$FAIL_COUNT" -ne 0 ]; then
  exit 1
fi
