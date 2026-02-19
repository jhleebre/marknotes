#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# MarkNotes 전체 테스트 실행 스크립트
# 사용법:
#   ./scripts/run-tests.sh           → 전체 테스트 실행
#   ./scripts/run-tests.sh --main    → Main 프로세스 테스트만
#   ./scripts/run-tests.sh --renderer→ Renderer 테스트만
#   ./scripts/run-tests.sh --coverage→ 커버리지 리포트 포함
#   ./scripts/run-tests.sh --watch   → 감시 모드 (파일 변경 시 자동 재실행)
# ─────────────────────────────────────────────────────────────────────

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── 색상 출력 헬퍼 ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

header() { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${RESET}"; }
info()   { echo -e "${CYAN}▶ $1${RESET}"; }
ok()     { echo -e "${GREEN}✓ $1${RESET}"; }
warn()   { echo -e "${YELLOW}⚠ $1${RESET}"; }
fail()   { echo -e "${RED}✗ $1${RESET}"; }

# ── 의존성 설치 확인 ──────────────────────────────────────────────────
check_dependencies() {
  if [ ! -d "node_modules/vitest" ]; then
    warn "vitest가 설치되어 있지 않습니다. npm install을 실행합니다..."
    npm install
    ok "의존성 설치 완료"
  fi
}

# ── 인자 파싱 ─────────────────────────────────────────────────────────
MODE="all"
COVERAGE=false
WATCH=false

for arg in "$@"; do
  case $arg in
    --main)     MODE="main" ;;
    --renderer) MODE="renderer" ;;
    --coverage) COVERAGE=true ;;
    --watch)    WATCH=true ;;
    --help|-h)
      echo "사용법: $0 [--main|--renderer] [--coverage] [--watch]"
      exit 0
      ;;
  esac
done

# ── 메인 실행 ─────────────────────────────────────────────────────────
header
echo -e "${BOLD}  MarkNotes 자동화 테스트${RESET}"
header

check_dependencies

START_TIME=$(date +%s)

# vitest 기본 명령 구성
VITEST_CMD="npx vitest"

if $WATCH; then
  info "감시 모드로 실행 중 (Ctrl+C로 종료)"
  case $MODE in
    main)     exec $VITEST_CMD tests/unit/main ;;
    renderer) exec $VITEST_CMD tests/unit/renderer ;;
    *)        exec $VITEST_CMD ;;
  esac
fi

# 단일 실행 (run 모드)
if $COVERAGE; then
  info "커버리지 리포트 포함 실행"
  VITEST_CMD="$VITEST_CMD run --coverage"
else
  VITEST_CMD="$VITEST_CMD run"
fi

echo ""

EXIT_CODE=0

case $MODE in
  main)
    info "Main 프로세스 테스트 실행 (Node.js 환경)"
    echo "  대상: tests/unit/main/"
    echo ""
    $VITEST_CMD tests/unit/main || EXIT_CODE=$?
    ;;

  renderer)
    info "Renderer 프로세스 테스트 실행 (jsdom 환경)"
    echo "  대상: tests/unit/renderer/"
    echo ""
    $VITEST_CMD tests/unit/renderer || EXIT_CODE=$?
    ;;

  all)
    info "전체 테스트 실행"
    echo "  대상: tests/unit/main/ + tests/unit/renderer/"
    echo ""
    $VITEST_CMD || EXIT_CODE=$?
    ;;
esac

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

header
if [ $EXIT_CODE -eq 0 ]; then
  ok "모든 테스트 통과 (${ELAPSED}초 소요)"
  if $COVERAGE; then
    ok "커버리지 리포트: tests/coverage/index.html"
  fi
else
  fail "테스트 실패 (종료 코드: $EXIT_CODE, ${ELAPSED}초 소요)"
  echo ""
  echo "  실패한 테스트만 재실행:"
  echo "    npm run test:watch"
  echo ""
  echo "  특정 영역만 실행:"
  echo "    npm run test:main"
  echo "    npm run test:renderer"
fi
header

exit $EXIT_CODE
