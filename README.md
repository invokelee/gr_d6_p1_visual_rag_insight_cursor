# Visual RAG Insight Platform

문서/이미지 업로드부터 RAG 파이프라인(청킹 → 임베딩 → 검색)과 GBM 예측(3M/6M/12M), 시각화 리포트까지 한 번에 확인할 수 있는 웹앱입니다.

## 주요 기능

- **Transparent RAG Pipeline**
  - 업로드 문서를 청크로 분해하고, 임베딩/검색 과정을 UI에서 시각적으로 확인
  - 청크 분포 차트, 임베딩 2D 맵, 코사인 유사도 차트 제공
- **Predictive Engine (GBM)**
  - 입력 시계열을 기반으로 GBM Monte Carlo 예측 수행
  - mean/median + p05~p95 신뢰구간(Area) 시각화
- **Visual Report + Markdown Export**
  - 사용자/분석자 친화적인 대시보드형 리포트
  - Answer & Sources + Markdown 복사/다운로드

## 화면 구성

- **Upload / Ask 패널**: 문서 업로드, 질의 입력
- **Pipeline 탭**: ChunkVisualizer + Chunk Distribution 차트
- **Vector Map 탭**: SimilarityGraph + Embedding Projection + SearchResults
- **Forecast 탭**: 3M/6M/12M 예측 및 신뢰구간 차트
- **Insight Report 섹션**:
  - Visual Summary (KPI + Retrieval/Forecast 차트)
  - Answer & Sources
  - Markdown Export

## 기술 스택

- **Frontend**: Vite 5, React 18, TypeScript, TailwindCSS
- **UI/State**: shadcn 스타일 컴포넌트, Zustand, TanStack Query
- **Visualization**: Recharts, framer-motion
- **Backend**: Vercel Serverless Functions (`api/*.ts`, Node 20)
- **AI**: OpenAI (`gpt-4o`, `text-embedding-3-small`)
- **RAG utilities**: `@langchain/textsplitters`, Zod
- **Vector DB**: Supabase pgvector (미설정 시 in-memory fallback)
- **Test**: Vitest

## 프로젝트 구조

```text
api/
  ingest.ts
  process-rag.ts
  search.ts
  forecast.ts
  _lib/
src/
  features/
    ingest/
    rag/
    predict/
    report/
  components/ui/
  lib/
  stores/useRAGStore.ts
supabase/migrations/0001_init.sql
```

## 요구 사항

- Node.js 20+
- npm 10+

## 로컬 실행

```bash
cd /home/invokelee/goorm_ws/AI_Fit_T/Day6/cursor/visual-rag-insight-cursor
npm install
cp .env.example .env
# .env 에 OPENAI_API_KEY 설정
npm run dev
```

- 기본 접속: `http://localhost:8753`
- 포트 고정: `vite.config.ts`에서 `strictPort: true` 설정

## 환경 변수

`.env` (서버 전용)

```env
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o
```

> 키는 절대 `VITE_*`로 노출하지 마세요.

## 테스트 / 빌드

```bash
npm test
npm run build
```

## API 요약

- `POST /api/ingest`
  - `multipart/form-data` (`file`)
  - PDF/TXT/이미지 OCR → `rawText`
- `POST /api/process-rag`
  - `{ documentId, text, chunkSize?, chunkOverlap? }`
  - 청킹 + 임베딩 + 벡터 업서트 + `embeddingPoints`(2D projection)
- `POST /api/search`
  - `{ documentId, query, topK?, generateAnswer? }`
  - 코사인 검색 + (옵션) 답변 생성
- `POST /api/forecast`
  - `{ series, horizons, paths, stepsPerMonth, seed }`
  - GBM 기반 신뢰구간 예측

모든 응답에 `request_id`, `model_versions` 포함.

## Forecast 사용법

1. 문서 업로드 후 `Process`
2. `Forecast` 탭 이동
3. 숫자 시계열 입력 (양수 5개 이상)
4. `3M / 6M / 12M` 선택 후 `Run forecast`

## GitHub 업로드

```bash
git init
git add .
git commit -m "feat: implement visual rag insight platform"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## Vercel 배포

### 방법 1) GitHub 연동 (권장)

1. Vercel Dashboard → **Add New Project**
2. GitHub 저장소 선택
3. Environment Variables 설정:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL` (선택)
   - `SUPABASE_SERVICE_ROLE_KEY` (선택)
   - `EMBEDDING_MODEL` / `CHAT_MODEL` (선택)
4. Deploy

### 방법 2) CLI

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

## Supabase pgvector 설정 (선택)

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
```

Supabase 설정이 없으면 자동으로 in-memory 벡터스토어로 동작합니다.

## 보안 주의

- API 키는 서버에서만 사용됩니다.
- `.env` 파일은 커밋하지 마세요.
- 노출된 키는 반드시 즉시 폐기(rotate)하세요.

