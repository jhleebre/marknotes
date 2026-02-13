# MarkNotes 전체 기능 테스트 가이드

리팩토링 후 모든 기능이 정상 동작하는지 검증하기 위한 포괄적 테스트 문서입니다.

> 테스트 환경: macOS, `npm run dev`로 앱 실행 후 진행

---

## 1. 앱 시작 및 초기 상태

### 1.1 첫 실행 (~/Documents/MarkNotes 폴더 없는 상태)

- [ ] 앱 실행 시 `~/Documents/MarkNotes/` 디렉토리 자동 생성
- [ ] Welcome 파일 (`Welcome to MarkNotes.md`) 자동 생성
- [ ] 파일 트리에 Welcome 파일 표시

### 1.2 일반 시작

- [ ] 타이틀바, 사이드바(파일 트리), 에디터 영역, 상태바 모두 정상 렌더링
- [ ] 파일이 선택되지 않은 상태에서 WelcomeScreen 표시 (앱 아이콘 + 안내 문구)
- [ ] 툴바 버튼들이 비활성화 상태 (파일 미선택)

---

## 2. 파일 트리 (File Tree)

### 2.1 파일 목록 표시

- [ ] `~/Documents/MarkNotes/` 하위의 `.md` 파일만 표시
- [ ] 숨김 파일 (`.`으로 시작) 미표시
- [ ] `.assets` 폴더 미표시
- [ ] 폴더가 파일보다 먼저 정렬, 알파벳순 정렬

### 2.2 파일 선택

- [ ] 파일 클릭 시 에디터에 내용 로드
- [ ] 선택된 파일 하이라이트 표시
- [ ] 폴더 클릭 시 expand/collapse 토글

### 2.3 파일 트리 컨텍스트 메뉴 — 파일 우클릭

- [ ] 컨텍스트 메뉴 정상 표시
- [ ] **Open** — 파일 에디터에 열기
- [ ] **Show in Finder** — Finder에서 파일 위치 표시
- [ ] **Rename** — 인라인 이름 변경 모드 진입
- [ ] **Copy File Path** — 클립보드에 파일 경로 복사
- [ ] **Duplicate** — 파일 복제 (`파일명 copy.md`)
- [ ] **Delete** — 파일 삭제 (위험 표시, 빨간색)

### 2.4 파일 트리 컨텍스트 메뉴 — 폴더 우클릭

- [ ] **New File** — 해당 폴더에 새 파일 생성 모달
- [ ] **New Folder** — 해당 폴더에 새 폴더 생성 모달
- [ ] **Show in Finder** — Finder에서 폴더 위치 표시
- [ ] **Rename** — 인라인 이름 변경
- [ ] **Copy Folder Path** — 클립보드에 폴더 경로 복사
- [ ] **Delete** — 폴더 삭제 (하위 내용 포함)

### 2.5 파일 트리 컨텍스트 메뉴 — 빈 영역 우클릭

- [ ] **New File** — 루트에 새 파일 생성 모달
- [ ] **New Folder** — 루트에 새 폴더 생성 모달
- [ ] **Show in Finder** — MarkNotes 루트 폴더 Finder 표시

### 2.6 인라인 이름 변경

- [ ] Rename 클릭 시 파일/폴더명이 input으로 변환
- [ ] 확장자(`.md`)는 편집 영역에서 제외
- [ ] Enter로 확정, Escape로 취소
- [ ] 이름 변경 후 파일 트리 갱신

### 2.7 드래그 앤 드롭

- [ ] 파일을 다른 폴더로 드래그 가능
- [ ] 폴더를 다른 폴더로 드래그 가능
- [ ] 드래그 중 타겟 폴더에 시각적 피드백 (하이라이트)
- [ ] 드롭 후 파일 이동 완료 및 파일 트리 갱신

### 2.8 외부 파일 변경 감지

- [ ] 외부 에디터에서 `~/Documents/MarkNotes/` 내 파일 수정 시 파일 트리 자동 갱신
- [ ] 현재 열린 파일이 외부에서 수정된 경우 에디터 내용 갱신

---

## 3. 파일 생성 모달 (Create Modal)

### 3.1 새 파일 생성

- [ ] Cmd+N 또는 툴바 버튼 → 파일 이름 입력 모달 표시
- [ ] 이름 입력 후 Enter 또는 Create 버튼 → `.md` 파일 생성
- [ ] `.md` 확장자 미입력 시 자동 추가
- [ ] 빈 이름 제출 불가
- [ ] 중복 이름 시 오류 메시지
- [ ] Escape로 모달 닫기

### 3.2 새 폴더 생성

- [ ] Cmd+Shift+N 또는 툴바 버튼 → 폴더 이름 입력 모달 표시
- [ ] 이름 입력 후 Enter 또는 Create 버튼 → 폴더 생성
- [ ] 빈 이름 제출 불가
- [ ] 중복 이름 시 오류 메시지

---

## 4. 타이틀바 툴바 (TitleBar)

### 4.1 좌측 — 파일 조작

- [ ] **사이드바 토글 버튼** — 클릭 시 사이드바 표시/숨김 전환
- [ ] **New File 버튼** — 새 파일 모달 열기
- [ ] **New Folder 버튼** — 새 폴더 모달 열기

### 4.2 실행취소/다시실행

- [ ] **Undo 버튼** — 편집 실행취소 (Cmd+Z와 동일)
- [ ] **Redo 버튼** — 실행취소 되돌리기 (Cmd+Shift+Z와 동일)
- [ ] 실행취소 불가 시 Undo 버튼 비활성화
- [ ] 다시실행 불가 시 Redo 버튼 비활성화

### 4.3 제목 스타일 셀렉트박스

- [ ] Normal Text / Heading 1~6 선택 가능
- [ ] 현재 커서 위치의 스타일이 셀렉트박스에 반영
- [ ] 스타일 변경 시 해당 블록에 즉시 적용

### 4.4 인라인 서식 버튼

- [ ] **Bold** (Cmd+B) — 굵게 토글, heading에서 비활성화
- [ ] **Italic** (Cmd+I) — 기울임 토글, heading에서 비활성화
- [ ] **Strikethrough** (Cmd+Shift+X) — 취소선 토글, heading에서 비활성화
- [ ] **Inline Code** (Cmd+E) — 인라인 코드 토글, heading에서 비활성화
- [ ] **Link** (Cmd+K) — 링크 모달 열기, heading에서 비활성화
- [ ] 각 버튼 활성 시 `active` 스타일 표시

### 4.5 블록 서식 버튼

- [ ] **Numbered List** (Cmd+Shift+7) — 번호 목록 토글
- [ ] **Bullet List** (Cmd+Shift+8) — 불릿 목록 토글
- [ ] **Task List** (Cmd+Shift+9) — 체크 목록 토글
- [ ] **Indent** (Tab) — 목록 항목 들여쓰기
- [ ] **Outdent** (Shift+Tab) — 목록 항목 내어쓰기
- [ ] **Blockquote** (Cmd+Shift+B) — 인용문 토글
- [ ] **Code Block** (Cmd+Option+C) — 코드 블록 토글
- [ ] Indent/Outdent는 목록 안에서만 활성화
- [ ] Blockquote는 목록 안에서 비활성화

### 4.6 삽입 버튼

- [ ] **Horizontal Rule** — 수평선 삽입
- [ ] **Table** — 3x3 테이블 삽입 (테이블 안에서는 비활성화)
- [ ] **Image** — 이미지 삽입 모달 열기

### 4.7 내보내기 및 닫기

- [ ] **Export as PDF** (Cmd+Shift+P) — PDF 내보내기
- [ ] **Close File** (Cmd+W) — 현재 파일 닫기

### 4.8 툴팁

- [ ] 모든 버튼에 마우스 호버 시 툴팁 표시 (기능명 + 단축키)

---

## 5. 에디터 — WYSIWYG 모드 (Edit Mode)

### 5.1 기본 텍스트 편집

- [ ] 텍스트 입력, 삭제, 선택, 복사, 붙여넣기 정상 동작
- [ ] 빈 에디터에 placeholder 텍스트 표시

### 5.2 마크다운 서식

- [ ] **Heading 1~6** — 각 수준 정상 렌더링, ID 자동 생성
- [ ] **Bold** — `**text**` → 굵은 텍스트
- [ ] **Italic** — `*text*` → 기울임 텍스트
- [ ] **Strikethrough** — `~~text~~` → 취소선
- [ ] **Inline Code** — `` `code` `` → 인라인 코드
- [ ] **Blockquote** — `>` → 인용문 블록
- [ ] **Bullet List** — `- item` → 불릿 목록
- [ ] **Ordered List** — `1. item` → 번호 목록
- [ ] **Task List** — `- [ ] item` → 체크박스 목록
- [ ] **Code Block** — 구문 강조 (highlight.js), 언어 자동 감지
- [ ] **Horizontal Rule** — `---` → 수평선
- [ ] **Link** — 클릭 가능한 링크 렌더링
- [ ] **Image** — 이미지 렌더링 (크기 클래스 지원)

### 5.3 테이블

- [ ] 3x3 헤더 포함 테이블 생성 (툴바 또는 컨텍스트 메뉴)
- [ ] 셀 간 Tab으로 이동
- [ ] 셀 간 Shift+Tab으로 역방향 이동
- [ ] 마지막 셀에서 Tab → 새 행 추가
- [ ] 테이블 내 텍스트 입력/편집

### 5.4 Heading에서 서식 제한

- [ ] Heading 블록에서 Bold, Italic, Strike, Code, Link 비활성화
- [ ] Heading 블록에서 List, Blockquote, Code Block 비활성화

### 5.5 키보드 단축키

- [ ] `Cmd+B` — Bold
- [ ] `Cmd+I` — Italic
- [ ] `Cmd+E` — Inline Code
- [ ] `Cmd+K` — Link 모달
- [ ] `Cmd+Shift+X` — Strikethrough
- [ ] `Cmd+Shift+7` — Ordered List
- [ ] `Cmd+Shift+8` — Bullet List
- [ ] `Cmd+Shift+9` — Task List
- [ ] `Cmd+Shift+B` — Blockquote
- [ ] `Cmd+Option+C` — Code Block
- [ ] `Cmd+Z` — Undo
- [ ] `Cmd+Shift+Z` — Redo
- [ ] `Tab` — 목록 들여쓰기 / 테이블 셀 이동
- [ ] `Shift+Tab` — 목록 내어쓰기 / 테이블 셀 역방향 이동

### 5.6 Bold/Italic 마크다운 문법 호환

- [ ] Bold: `**text**` 입력 시 자동 서식 적용
- [ ] Italic: `*text*` 입력 시 자동 서식 적용
- [ ] HTML 출력이 `<b>` / `<i>` 대신 `<strong>` / `<em>` 사용

---

## 6. 에디터 컨텍스트 메뉴 (WYSIWYG 모드)

### 6.1 텍스트 선택 시 우클릭

- [ ] **Cut** — 선택 텍스트 잘라내기
- [ ] **Copy** — 선택 텍스트 복사
- [ ] **Copy as Markdown** — 선택 영역을 마크다운으로 변환하여 복사
- [ ] **Bold** — 굵게 토글
- [ ] **Italic** — 기울임 토글
- [ ] **Strikethrough** — 취소선 토글
- [ ] **Inline Code** — 인라인 코드 토글
- [ ] **Add Link / Edit Link** — 링크 모달 열기 (기존 링크면 "Edit Link")
- [ ] **Numbered List / Bullet List / Task List** — 목록 토글
- [ ] **Indent / Outdent** — 목록 들여쓰기/내어쓰기
- [ ] **Blockquote** — 인용문 토글
- [ ] **Code Block** — 코드 블록 토글

### 6.2 빈 영역 우클릭 (텍스트 선택 없음)

- [ ] **Paste** — 클립보드 내용 붙여넣기 (이미지, HTML, 텍스트 순서)
- [ ] **Select All** — 전체 선택
- [ ] 서식 버튼들 (Bold~Code Block) 정상 동작
- [ ] **Horizontal Rule** — 수평선 삽입
- [ ] **Insert Table** — 테이블 삽입
- [ ] **Insert Image** — 이미지 모달 열기

### 6.3 이미지 우클릭

- [ ] **Cut Image** — 이미지 잘라내기
- [ ] **Copy Image** — 이미지 복사
- [ ] **Small (300px)** — 이미지 크기 변경
- [ ] **Medium (600px)** — 이미지 크기 변경
- [ ] **Large (900px)** — 이미지 크기 변경
- [ ] **Original Size** — 원본 크기로 복원
- [ ] **Edit Alt Text** — Alt 텍스트 편집 모달 열기
- [ ] **Embed in Document** — 로컬 `.assets` 이미지를 Base64로 인라인 변환
- [ ] **Delete Image** — 이미지 삭제 (빨간색 위험 표시)
- [ ] Embed 버튼: `.assets` 이미지가 아닌 경우 비활성화

### 6.4 테이블 내 우클릭

- [ ] **Add Row Above** — 현재 행 위에 행 추가
- [ ] **Add Row Below** — 현재 행 아래에 행 추가
- [ ] **Add Column Left** — 현재 열 왼쪽에 열 추가
- [ ] **Add Column Right** — 현재 열 오른쪽에 열 추가
- [ ] **Align Left** — 현재 열 전체 왼쪽 정렬
- [ ] **Align Center** — 현재 열 전체 가운데 정렬
- [ ] **Align Right** — 현재 열 전체 오른쪽 정렬
- [ ] **Delete Row** — 현재 행 삭제 (마지막 행이면 테이블 전체 삭제)
- [ ] **Delete Column** — 현재 열 삭제
- [ ] **Delete Table** — 테이블 전체 삭제

---

## 7. 에디터 — 분할 모드 (Code/Split Mode)

### 7.1 모드 전환

- [ ] Cmd+1 → WYSIWYG(Edit) 모드 전환
- [ ] Cmd+2 → Split(Code) 모드 전환
- [ ] 메뉴바 View > Edit Mode / Code Mode 로도 전환 가능

### 7.2 분할 화면 구성

- [ ] 좌측: 마크다운 소스 코드 편집 (textarea)
- [ ] 우측: 실시간 미리보기 (HTML 렌더링)
- [ ] 좌측 편집 시 우측 미리보기 실시간 갱신

### 7.3 마크다운 → HTML 변환

- [ ] Heading (H1~H6) 정상 렌더링, 각 heading에 id 속성 자동 생성
- [ ] Bold, Italic, Strikethrough 정상 변환
- [ ] 코드 블록 구문 강조 (highlight.js)
- [ ] 테이블 GFM 문법 정상 렌더링
- [ ] 체크박스 목록 렌더링 (체크/해제 상태 반영)
- [ ] 이미지 렌더링 (사이즈 클래스 `{.small}`, `{.medium}`, `{.large}` 지원)
- [ ] 링크 정상 렌더링

### 7.4 미리보기 내 링크 동작

- [ ] 외부 링크 (http/https) 클릭 → 시스템 기본 브라우저에서 열기
- [ ] 앵커 링크 (`#heading-id`) 클릭 → 미리보기 내 해당 heading으로 스크롤
- [ ] 상대 경로 `.md` 파일 링크 클릭 → 해당 파일 열기

### 7.5 모드 간 데이터 보존

- [ ] WYSIWYG → Split 전환 시 내용 보존 (HTML → Markdown 변환)
- [ ] Split → WYSIWYG 전환 시 내용 보존 (Markdown → HTML 변환)
- [ ] 전환 시 데이터 손실 없음 (round-trip 검증)

---

## 8. HTML ↔ Markdown 변환 (Round-trip)

### 8.1 Markdown → HTML (marked)

- [ ] GFM 테이블 정상 파싱
- [ ] Task list `- [x]` / `- [ ]` 파싱
- [ ] 코드 블록 언어 태그 보존
- [ ] 이미지 사이즈 클래스 `{.small}` 파싱 후 적용
- [ ] `.assets/` 경로 이미지 resolve (file:// 프로토콜로 변환)

### 8.2 HTML → Markdown (Turndown)

- [ ] `<strong>` → `**text**`
- [ ] `<em>` → `*text*`
- [ ] `<del>` → `~~text~~`
- [ ] `<code>` → `` `code` ``
- [ ] `<table>` → GFM 테이블 문법
- [ ] `<ul>` → `- item`
- [ ] `<ol>` → `1. item`
- [ ] Task list → `- [x]` / `- [ ]`
- [ ] 이미지 → `![alt](src)` + 사이즈 클래스 보존
- [ ] 코드 블록 → 백틱 3개 + 언어 태그
- [ ] Heading → `#` 문법

---

## 9. 링크 모달 (Link Modal)

### 9.1 새 링크 추가

- [ ] 텍스트 선택 후 Cmd+K 또는 툴바 Link 버튼 → 모달 열기
- [ ] **Text** 필드: 선택한 텍스트가 자동 입력
- [ ] **URL** 필드: URL 입력
- [ ] Insert 버튼 → 링크 삽입
- [ ] Escape 또는 Cancel → 취소

### 9.2 기존 링크 편집

- [ ] 링크 위에 커서 두고 Cmd+K → 기존 URL과 텍스트가 모달에 표시
- [ ] URL 수정 후 Insert → 링크 업데이트

### 9.3 링크 클릭 동작 (WYSIWYG 모드)

- [ ] Cmd+클릭 → 외부 브라우저에서 링크 열기
- [ ] 일반 클릭 → 링크 편집 위치로 커서 이동

---

## 10. 이미지 모달 (Image Modal)

### 10.1 이미지 삽입

- [ ] 툴바 이미지 버튼 또는 컨텍스트 메뉴 → 이미지 모달 열기
- [ ] 파일 선택 버튼으로 이미지 업로드
- [ ] Alt 텍스트 입력 가능
- [ ] 선택한 이미지 미리보기 표시
- [ ] Insert 후 에디터에 이미지 표시

### 10.2 이미지 업로드

- [ ] 이미지 파일 선택 시 `.assets/` 폴더에 저장
- [ ] 파일명 자동 생성 (타임스탬프 기반)
- [ ] 허용 확장자: `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp`
- [ ] 최대 파일 크기 제한 (10MB)

---

## 11. Alt 텍스트 모달 (Alt Text Modal)

- [ ] 이미지 우클릭 > Edit Alt Text → 모달 열기
- [ ] 현재 Alt 텍스트가 입력 필드에 표시
- [ ] 수정 후 Save → 이미지의 alt 속성 업데이트
- [ ] Cancel 또는 Escape → 변경 취소

---

## 12. 저장 (Save)

### 12.1 수동 저장

- [ ] Cmd+S → 즉시 저장

### 12.2 파일 닫기 시 저장

- [ ] Cmd+W로 파일 닫을 때 미저장 내용 자동 저장
- [ ] 앱 종료 시 미저장 내용 저장

---

## 13. 상태바 (Status Bar)

- [ ] 현재 파일 경로 표시 (루트 기준 상대 경로)
- [ ] 커서 위치 정보 표시 (Line)
- [ ] 단어 수 (Words) 표시
- [ ] 문자 수 (Characters) 표시
- [ ] 파일 미선택 시 빈 상태

---

## 14. 이미지 관리

### 14.1 이미지 참조 메타데이터

- [ ] 이미지 업로드 시 `.assets/.metadata.json`에 참조 기록
- [ ] 파일 저장 시 이미지 참조 업데이트

### 14.2 이미지 정리

- [ ] 메뉴 File > Clean Up Unused Images → 미참조 이미지 삭제
- [ ] 삭제 전 확인 알림 표시
- [ ] 참조 중인 이미지는 삭제되지 않음

### 14.3 이미지 리사이즈

- [ ] 이미지 컨텍스트 메뉴에서 Small/Medium/Large/Original 크기 변경
- [ ] 마크다운 저장 시 `{.small}`, `{.medium}`, `{.large}` 클래스 보존

### 14.4 이미지 임베드

- [ ] `.assets/` 이미지를 Base64로 인라인 변환
- [ ] 변환 후 `assetPath` 제거, `src`에 data URL 설정
- [ ] 성공/실패 알림 표시

### 14.5 클립보드 이미지 붙여넣기

- [ ] 클립보드에 이미지가 있는 상태에서 빈 영역 우클릭 > Paste → 이미지 삽입
- [ ] data URL 형태로 삽입

---

## 15. PDF 내보내기

### 15.1 내보내기 실행

- [ ] Cmd+Shift+P 또는 메뉴 File > Export as PDF
- [ ] 저장 다이얼로그 표시 (기본 파일명: 현재 파일명.pdf)
- [ ] PDF 파일 정상 생성

### 15.2 PDF 내용 검증

- [ ] A4 크기, 여백 포함
- [ ] Heading 스타일 정상 반영
- [ ] 코드 블록 구문 강조 포함
- [ ] 테이블 렌더링 정상
- [ ] 이미지 정상 포함 (`.assets/` 이미지 임베드)
- [ ] 체크박스 목록 렌더링
- [ ] 다크 모드 무관하게 밝은 배경으로 출력

---

## 16. 사이드바 토글

- [ ] Cmd+. 또는 툴바 사이드바 버튼 → 사이드바 표시/숨김 전환
- [ ] 숨김 시 에디터 영역이 전체 너비로 확장
- [ ] 메뉴 View > Toggle Sidebar 로도 동작

---

## 17. 다크 모드

### 17.1 시스템 연동

- [ ] macOS 시스템 다크 모드 설정에 따라 자동 전환
- [ ] 시스템 설정 실시간 변경 시 즉시 반영

### 17.2 시각적 검증

- [ ] 다크 모드: 어두운 배경, 밝은 텍스트
- [ ] 라이트 모드: 밝은 배경, 어두운 텍스트
- [ ] 파일 트리, 에디터, 상태바, 모달, 컨텍스트 메뉴 모두 다크 모드 적용

---

## 18. 네이티브 메뉴 (macOS)

### 18.1 App 메뉴

- [ ] About, Services, Hide, Quit 정상 동작

### 18.2 File 메뉴

- [ ] **New File** (Cmd+N)
- [ ] **New Folder** (Cmd+Shift+N)
- [ ] **Save** (Cmd+S)
- [ ] **Export as PDF** (Cmd+Shift+P)
- [ ] **Clean Up Unused Images**
- [ ] **Close File** (Cmd+W)

### 18.3 Edit 메뉴

- [ ] Undo (Cmd+Z), Redo (Cmd+Shift+Z)
- [ ] Cut (Cmd+X), Copy (Cmd+C), Paste (Cmd+V)
- [ ] Paste and Match Style
- [ ] Delete, Select All (Cmd+A)

### 18.4 View 메뉴

- [ ] **Edit Mode** (Cmd+1) — WYSIWYG 모드
- [ ] **Code Mode** (Cmd+2) — Split 모드
- [ ] **Toggle Sidebar** (Cmd+.)
- [ ] Reload, Force Reload
- [ ] Toggle Developer Tools
- [ ] Zoom In/Out/Reset, Fullscreen

### 18.5 Window 메뉴

- [ ] Minimize, Zoom, Close, Front

### 18.6 Help 메뉴

- [ ] **About MarkNotes**
- [ ] **Keyboard Shortcuts** (Cmd+/)

---

## 19. 전체 키보드 단축키 정리

| 단축키       | 기능                           | 테스트 결과 |
| ------------ | ------------------------------ | ----------- |
| Cmd+N        | 새 파일                        |             |
| Cmd+Shift+N  | 새 폴더                        |             |
| Cmd+S        | 저장                           |             |
| Cmd+W        | 파일 닫기                      |             |
| Cmd+Shift+P  | PDF 내보내기                   |             |
| Cmd+1        | Edit 모드                      |             |
| Cmd+2        | Code 모드                      |             |
| Cmd+.        | 사이드바 토글                  |             |
| Cmd+/        | 키보드 단축키                  |             |
| Cmd+Z        | Undo                           |             |
| Cmd+Shift+Z  | Redo                           |             |
| Cmd+B        | Bold                           |             |
| Cmd+I        | Italic                         |             |
| Cmd+E        | Inline Code                    |             |
| Cmd+K        | Link 모달                      |             |
| Cmd+Shift+X  | Strikethrough                  |             |
| Cmd+Shift+7  | Ordered List                   |             |
| Cmd+Shift+8  | Bullet List                    |             |
| Cmd+Shift+9  | Task List                      |             |
| Cmd+Shift+B  | Blockquote                     |             |
| Cmd+Option+C | Code Block                     |             |
| Tab          | 목록 들여쓰기 / 테이블 셀 이동 |             |
| Shift+Tab    | 목록 내어쓰기 / 테이블 역이동  |             |
| Cmd+A        | Select All                     |             |
| Cmd+X        | Cut                            |             |
| Cmd+C        | Copy                           |             |
| Cmd+V        | Paste                          |             |

---

## 20. 엣지 케이스 및 특수 상황

### 20.1 빈 상태

- [ ] 파일이 하나도 없는 상태에서 앱 동작 정상
- [ ] 빈 파일 열기 → placeholder 표시
- [ ] 빈 파일에서 PDF 내보내기 시 빈 PDF 생성

### 20.2 깊은 중첩 폴더

- [ ] 3단계 이상 중첩된 폴더 내 파일 생성/열기/저장
- [ ] 중첩 폴더의 expand/collapse 정상

### 20.3 특수 문자 파일명

- [ ] 한글, 공백, 특수문자가 포함된 파일명 지원
- [ ] 파일 열기/저장/이름변경 정상 동작

### 20.4 큰 파일

- [ ] 1,000줄 이상의 마크다운 파일 열기 시 성능 문제 없음
- [ ] 대용량 파일에서 자동 저장 정상 동작

### 20.5 동시 작업

- [ ] 외부에서 파일 수정 + 에디터에서 편집 동시 발생 시 처리
- [ ] 파일 삭제된 상태에서 저장 시도 시 에러 처리

### 20.6 보안

- [ ] `~/Documents/MarkNotes/` 외부 경로 접근 불가 확인
- [ ] 경로 탐색 공격 (`../`) 방어 확인

---

## 테스트 결과 기록

| 섹션                    | 전체 항목 수 | 통과 | 실패 | 미테스트 | 비고 |
| ----------------------- | ------------ | ---- | ---- | -------- | ---- |
| 1. 앱 시작              | 5            |      |      |          |      |
| 2. 파일 트리            | 22           |      |      |          |      |
| 3. 생성 모달            | 8            |      |      |          |      |
| 4. 타이틀바             | 25           |      |      |          |      |
| 5. WYSIWYG 편집         | 30           |      |      |          |      |
| 6. 에디터 컨텍스트 메뉴 | 35           |      |      |          |      |
| 7. Split 모드           | 12           |      |      |          |      |
| 8. MD↔HTML 변환         | 18           |      |      |          |      |
| 9. 링크 모달            | 6            |      |      |          |      |
| 10. 이미지 모달         | 6            |      |      |          |      |
| 11. Alt 텍스트 모달     | 4            |      |      |          |      |
| 12. 자동 저장           | 7            |      |      |          |      |
| 13. 상태바              | 5            |      |      |          |      |
| 14. 이미지 관리         | 11           |      |      |          |      |
| 15. PDF 내보내기        | 8            |      |      |          |      |
| 16. 사이드바            | 3            |      |      |          |      |
| 17. 다크 모드           | 4            |      |      |          |      |
| 18. 네이티브 메뉴       | 18           |      |      |          |      |
| 19. 키보드 단축키       | 28           |      |      |          |      |
| 20. 엣지 케이스         | 10           |      |      |          |      |
| **총계**                | **265**      |      |      |          |      |
