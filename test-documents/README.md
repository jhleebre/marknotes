# MarkNotes 테스트 문서

이 디렉토리에는 MarkNotes의 모든 기능을 테스트하기 위한 원본 문서들이 저장되어 있습니다.

## 📁 디렉토리 구조

```
test-documents/
├── README.md                           # 이 파일
├── 00. Test Guide - START HERE.md      # 테스트 가이드 (시작점)
├── 01. Text Formatting Test.md         # 텍스트 포맷팅 테스트
├── 02. Lists Test.md                   # 리스트 테스트
├── 03. Tables Test.md                  # 테이블 테스트
├── 04. Links and Navigation Test.md    # 링크와 네비게이션 테스트
├── 05. Images Test.md                  # 이미지 테스트
├── 06. Task List Test.md               # Task List(체크박스) 테스트
└── 07. Comprehensive Test.md           # 종합 테스트
```

## 🎯 용도

### 원본 보관

이 디렉토리의 파일들은 **원본(pristine) 상태**로 유지됩니다.
- MarkNotes 앱에서 수정되지 않음
- Git으로 버전 관리됨
- 테스트 문서 초기화 시 사용

### 테스트 수행

테스트를 수행할 때는:
1. 이 디렉토리의 파일들을 `~/Documents/MarkNotes/`로 복사
2. MarkNotes 앱에서 열어서 테스트
3. 테스트 중 자동 저장으로 인한 수정은 `~/Documents/MarkNotes/`에만 영향

## 🔄 사용 방법

### 초기 설정 (처음 한 번만)

테스트 문서를 MarkNotes 앱에 추가:

```bash
# 모든 테스트 문서 복사
cp test-documents/*.md ~/Documents/MarkNotes/
```

### 테스트 문서 초기화

테스트 중 문서가 수정되었을 때 원본 상태로 되돌리기:

```bash
# 전체 초기화
cp test-documents/*.md ~/Documents/MarkNotes/

# 특정 문서만 초기화
cp "test-documents/06. Task List Test.md" ~/Documents/MarkNotes/
```

### 새 테스트 문서 추가

새로운 테스트 문서를 만들었다면:

```bash
# 1. MarkNotes에서 문서 작성
# 2. 완성된 문서를 이 디렉토리로 복사
cp ~/Documents/MarkNotes/"새로운 테스트.md" test-documents/

# 3. Git에 추가
git add test-documents/"새로운 테스트.md"
git commit -m "docs: add new test document"
```

## 📋 테스트 문서 설명

### 00. Test Guide - START HERE.md
**시작점!** 전체 테스트 가이드와 방법론
- 테스트 문서 목록과 설명
- 테스트 방법론
- 빠른 시작 가이드
- 체크리스트

### 01. Text Formatting Test.md
기본 텍스트 포맷팅 테스트
- 헤딩 6단계 (H1~H6)
- 인라인 스타일 (볼드, 이탤릭, 취소선, 코드)
- 블록쿼트, 수평선
- 코드 블록 (JavaScript, Python, TypeScript, etc.)
- 다크모드 테스트

### 02. Lists Test.md
모든 리스트 타입과 중첩 테스트
- 불릿 리스트 (Cmd+Shift+8)
- 숫자 리스트 (Cmd+Shift+7)
- 최대 5단계 중첩 (마커 변경 확인)
- 혼합 리스트 타입
- Tab/Shift+Tab 들여쓰기

### 03. Tables Test.md
테이블 관련 모든 기능
- 기본 테이블 생성
- 정렬 (왼쪽, 가운데, 오른쪽)
- Context menu (행/열 추가/삭제, 정렬 변경)
- 테이블 내 복잡한 내용 (리스트, 체크박스, 포맷팅)
- Tab 키 네비게이션

### 04. Links and Navigation Test.md
링크와 네비게이션 기능
- 외부 링크 (다양한 프로토콜)
- 내부 링크/앵커 (문서 내 이동)
- 링크 편집 (Cmd+K)
- 특수한 URL (쿼리 파라미터, 특수문자)
- Cmd+Click 동작

### 05. Images Test.md
이미지 관련 모든 기능
- 이미지 형식 (JPG, PNG, GIF, SVG, WEBP)
- 크기 조절 (Small/Medium/Large/Original)
- Alt 텍스트 편집
- Base64 임베드
- .assets 폴더 관리
- 이미지 정리 기능

### 06. Task List Test.md
체크박스(Task List) 기능 (v1.6.0 신규)
- 체크박스 생성/토글 (Cmd+Shift+9)
- 중첩된 체크박스 (최대 5단계)
- 테이블 내 체크박스
- 혼합 리스트 타입
- 상태 저장/로드
- 실제 사용 시나리오

### 07. Comprehensive Test.md
모든 기능을 복합적으로 사용하는 실전 시나리오
- 프로젝트 문서 (일정표, 코드, 테이블, 체크박스 혼합)
- 회의록
- 학습 노트 (코드 블록, 다이어그램)
- 블로그 포스트 초안
- API 문서화
- 릴리스 노트

## 🧪 테스트 워크플로우

### 개발자/테스터용

```bash
# 1. 테스트 환경 준비
cp test-documents/*.md ~/Documents/MarkNotes/

# 2. MarkNotes 앱 실행
npm run dev

# 3. 테스트 수행
# - 00. Test Guide 문서부터 순서대로 진행
# - 각 문서의 체크리스트 활용

# 4. 테스트 완료 후 초기화 (선택사항)
cp test-documents/*.md ~/Documents/MarkNotes/
```

### CI/CD 통합 (향후)

```bash
# 자동화된 테스트 시나리오에서 사용 가능
# - 문서 로드 테스트
# - 렌더링 성능 측정
# - PDF 내보내기 테스트
```

## 📊 버전 관리

이 문서들은 Git으로 관리됩니다:

```bash
# 변경사항 확인
git status test-documents/

# 수정된 테스트 문서 커밋
git add test-documents/
git commit -m "docs: update test documents"
```

## ⚠️ 주의사항

1. **원본 수정 금지**
   - 이 디렉토리의 파일은 MarkNotes 앱에서 직접 열지 마세요
   - 항상 `~/Documents/MarkNotes/`로 복사해서 사용

2. **테스트 데이터 격리**
   - 개인 노트와 테스트 문서를 구분하여 관리
   - 필요시 별도의 MarkNotes 디렉토리 사용 가능

3. **이미지 파일**
   - 이미지 테스트는 실제 이미지 파일이 필요
   - 테스트용 이미지는 별도 준비

## 🔗 관련 문서

- [CLAUDE.md](../CLAUDE.md) - 개발자 가이드
- [README.md](../README.md) - 프로젝트 전체 문서

## 📝 문서 업데이트

테스트 문서를 업데이트할 때:

1. 새로운 기능 추가 시 해당 테스트 케이스 추가
2. 버그 수정 시 관련 테스트 시나리오 보강
3. 변경사항을 커밋 메시지에 명확히 기록

---

**Happy Testing! 🚀**
