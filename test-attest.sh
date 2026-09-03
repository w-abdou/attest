#!/bin/bash
# Full end-to-end test suite for Attest — Phase 1.1/1.2/1.3/1.4
#
# Usage:
#   1. Start the app with an admin bootstrap account configured:
#        export DB_PASSWORD=...
#        export JWT_SECRET=...
#        export ADMIN_BOOTSTRAP_EMAIL=admin@attest.dev
#        export ADMIN_BOOTSTRAP_PASSWORD='ChangeThisPassword123!'
#        ./mvnw spring-boot:run
#   2. In another terminal, with the SAME two ADMIN_BOOTSTRAP_* vars exported:
#        bash test-attest.sh
#
# Note: this script pauses for ~61 seconds partway through. That's intentional —
# RateLimitFilter allows only 5 requests/minute per IP across /api/auth/login and
# /api/auth/register combined, and this script alone makes more than 5 auth calls
# in total. The pause lets that window reset, the same way a real client would
# have to wait after hitting the limit.

BASE_URL="http://localhost:8080"
PASS_COUNT=0
FAIL_COUNT=0

ADMIN_BOOTSTRAP_EMAIL="${ADMIN_BOOTSTRAP_EMAIL:?Set ADMIN_BOOTSTRAP_EMAIL to the same value used to start the app}"
ADMIN_BOOTSTRAP_PASSWORD="${ADMIN_BOOTSTRAP_PASSWORD:?Set ADMIN_BOOTSTRAP_PASSWORD to the same value used to start the app}"

TEST_DIR=$(mktemp -d)
cd "$TEST_DIR" || exit 1

printf '%%PDF-1.4\nThis is the original test document.\n' > original.pdf
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

extract_token() {
  echo "$1" | grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

echo "=================================================="
echo "1. AUTH — Register & Login"
echo "=================================================="

UNIQUE_EMAIL="signer$(date +%s)@attest.dev"
PASSWORD="Testpass123!"

REG=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"ADMIN\"}")
check "Register always comes back VIEWER, even if ADMIN was requested" "$REG" "\"role\":\"VIEWER\""
USER_ID=$(extract_id "$REG")

REG_DUPLICATE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"ADMIN\"}")
check "Duplicate email rejected" "$REG_DUPLICATE" "already registered"

REG_INVALID=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"bademail","password":"short","role":"VIEWER"}')
check "Invalid email + short password rejected" "$REG_INVALID" "Validation failed"

LOGIN_OK=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\",\"password\":\"$PASSWORD\"}")
check "Login with correct password succeeds" "$LOGIN_OK" "\"email\":\"$UNIQUE_EMAIL\""

LOGIN_BAD=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\",\"password\":\"WrongPassword!\"}")
check "Login with wrong password rejected" "$LOGIN_BAD" "Invalid email or password"

# The five requests above already used up this minute's auth-endpoint budget
# (5 requests/min/IP, shared across /api/auth/login and /api/auth/register).
# Wait for the window to reset before making any more login/register calls.
echo ""
echo "Waiting 61s for the login rate-limit window to reset (5 req/min is by design)..."
sleep 61

echo ""
echo "=================================================="
echo "2. ADMIN — Promote the new user to SIGNER"
echo "=================================================="

ADMIN_LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_BOOTSTRAP_EMAIL\",\"password\":\"$ADMIN_BOOTSTRAP_PASSWORD\"}")
ADMIN_TOKEN=$(extract_token "$ADMIN_LOGIN")
check "Bootstrap admin can log in" "$ADMIN_LOGIN" "\"role\":\"ADMIN\""

PROMOTE=$(curl -s -X PATCH $BASE_URL/api/admin/users/$USER_ID/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"SIGNER"}')
check "Admin can promote a user to SIGNER" "$PROMOTE" "\"role\":\"SIGNER\""

NON_ADMIN_PROMOTE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE_URL/api/admin/users/$USER_ID/role \
  -H "Authorization: Bearer $(extract_token "$LOGIN_OK")" \
  -H "Content-Type: application/json" \
  -d '{"role":"ADMIN"}')
check "Non-admin cannot change roles (expects 403)" "$NON_ADMIN_PROMOTE" "403"

# The token from Section 1 still carries the OLD role (VIEWER) — roles are embedded
# in the JWT at login time and never re-checked against the database mid-request.
# A fresh login is required to pick up the new SIGNER role. (PATCH calls above don't
# touch the auth rate limiter, so this doesn't need another sleep.)
LOGIN_AS_SIGNER=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(extract_token "$LOGIN_AS_SIGNER")
check "Re-login picks up the new SIGNER role" "$LOGIN_AS_SIGNER" "\"role\":\"SIGNER\""

echo ""
echo "=================================================="
echo "3. DOCUMENTS — Upload, Verify, Tamper detection"
echo "=================================================="

UPLOAD=$(curl -s -X POST $BASE_URL/api/documents \
  -H "Authorization: Bearer $TOKEN" -F "file=@original.pdf")
check "Upload succeeds" "$UPLOAD" "\"status\":\"DRAFT\""
DOC_ID=$(extract_id "$UPLOAD")
echo "   (uploaded document id: $DOC_ID)"

UPLOAD_EMPTY=$(curl -s -X POST $BASE_URL/api/documents \
  -H "Authorization: Bearer $TOKEN" -F "file=@empty.pdf")
check "Empty file upload rejected" "$UPLOAD_EMPTY" "must not be empty"

GET_DOC=$(curl -s -X GET $BASE_URL/api/documents/$DOC_ID \
  -H "Authorization: Bearer $TOKEN")
check "Owner can fetch document metadata" "$GET_DOC" "\"id\":$DOC_ID"

VERIFY_ORIGINAL=$(curl -s -X POST $BASE_URL/api/documents/$DOC_ID/verify \
  -H "Authorization: Bearer $TOKEN" -F "file=@original.pdf")
check "Verify original file matches (Hash verified)" "$VERIFY_ORIGINAL" "\"verified\":true"

VERIFY_TAMPERED=$(curl -s -X POST $BASE_URL/api/documents/$DOC_ID/verify \
  -H "Authorization: Bearer $TOKEN" -F "file=@tampered.pdf")
check "Verify tampered file fails (Integrity verification failed)" "$VERIFY_TAMPERED" "\"verified\":false"

VERIFY_MISSING=$(curl -s -X POST $BASE_URL/api/documents/999999/verify \
  -H "Authorization: Bearer $TOKEN" -F "file=@original.pdf")
check "Verify against non-existent document returns 404 message" "$VERIFY_MISSING" "Document not found"

echo ""
echo "=================================================="
echo "4. VERSIONING — Amend creates a new immutable version"
echo "=================================================="

AMEND=$(curl -s -X POST $BASE_URL/api/documents/$DOC_ID/amend \
  -H "Authorization: Bearer $TOKEN" -F "file=@tampered.pdf")
check "Amend creates version 2" "$AMEND" "\"version\":2"

VERIFY_ORIGINAL_AGAIN=$(curl -s -X POST $BASE_URL/api/documents/$DOC_ID/verify \
  -H "Authorization: Bearer $TOKEN" -F "file=@original.pdf")
check "Original version still verifies correctly after amendment" "$VERIFY_ORIGINAL_AGAIN" "\"verified\":true"

VERSIONS=$(curl -s -X GET $BASE_URL/api/documents/$DOC_ID/versions \
  -H "Authorization: Bearer $TOKEN")
check "Version history lists both versions" "$VERSIONS" "\"version\":2"

AUDIT=$(curl -s -X GET $BASE_URL/api/documents/$DOC_ID/audit \
  -H "Authorization: Bearer $TOKEN")
check "Audit trail records the amendment" "$AUDIT" "\"action\":\"AMENDED\""

echo ""
echo "=================================================="
echo "5. IDOR — A second user cannot see the first user's document"
echo "=================================================="

# Section 4 didn't touch /api/auth/*, so the rate-limit window from Section 2
# still has budget left for these two calls — no extra sleep needed here.
OTHER_EMAIL="other$(date +%s)@attest.dev"
curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$OTHER_EMAIL\",\"password\":\"$PASSWORD\"}" > /dev/null
OTHER_LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$OTHER_EMAIL\",\"password\":\"$PASSWORD\"}")
OTHER_TOKEN=$(extract_token "$OTHER_LOGIN")

IDOR_ATTEMPT=$(curl -s -o /dev/null -w "%{http_code}" -X GET $BASE_URL/api/documents/$DOC_ID \
  -H "Authorization: Bearer $OTHER_TOKEN")
check "Another VIEWER cannot read someone else's document (expects 403)" "$IDOR_ATTEMPT" "403"

echo ""
echo "=================================================="
echo "RESULTS: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "=================================================="

rm -rf "$TEST_DIR"

if [ "$FAIL_COUNT" -ne 0 ]; then
  exit 1
fi