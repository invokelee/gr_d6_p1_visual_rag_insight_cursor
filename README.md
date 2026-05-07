# Visual RAG Insight Platform

문서/이미지 업로드 → 청킹 → 임베딩 → 코사인 검색 → GBM 기반 3·6·12개월 예측 → 마크다운 리포트까지의 RAG 4단계를 시각화하는 데모 웹앱입니다.

## 기술 스택

- **UI**: Vite 5 + React 18 + TypeScript + TailwindCSS + shadcn/ui 스타일
- **상태**: Zustand, TanStack Query
- **차트/애니메이션**: Recharts, framer-motion
- **백엔드**: Vercel Serverless Functions (`api/*.ts`, Node 20)
- **AI**: OpenAI (`gpt-4o` chat/vision, `text-embedding-3-small` embedding)
- **Vector DB**: Supabase pgvector (env 미설정 시 in-memory 자동 폴백)
- **검증/테스트**: Zod, Vitest

## 디렉토리 구조

```
api/
  ingest.ts            # PDF/TXT/IMG → raw text
  process-rag.ts       # 청킹 + 임베딩 + 업서트
  search.ts            # 질의 임베딩 + 코사인 검색 + 답변
  forecast.ts          # GBM 시뮬레이션 + 분위수 밴드
  _lib/                # 서버 공용 (openai, vector-store, gbm, chunker, schemas)
src/
  features/{ingest,rag,predict,report}/
  components/ui/       # shadcn 스타일 프리미티브
  lib/                 # api-client, tokenizer, markdown
  stores/useRAGStore.ts
supabase/migrations/0001_init.sql
```

## 시작하기

```bash
cd goorm_ws/AI_Fit_T/Day6/cursor/visual-rag-insight-cursor
npm install
cp .env.example .env.local      # 그리고 OPENAI_API_KEY를 채우세요
npm run dev                     # http://localhost:8753 — vite + 내장 dev API 라우터
```

`vercel dev`로 실제 Vercel runtime을 모사하려면:

```bash
npm i -g vercel
vercel dev
```

## 환경 변수 (서버 전용)

| 키 | 필수 | 설명 |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | 임베딩·답변·이미지 OCR |
| `SUPABASE_URL` | no | 미설정 시 in-memory 폴백 |
| `SUPABASE_SERVICE_ROLE_KEY` | no | 서버 전용. 클라이언트 노출 금지 |
| `EMBEDDING_MODEL` | no | 기본 `text-embedding-3-small` |
| `CHAT_MODEL` | no | 기본 `gpt-4o` |

> 모든 키는 서버 전용입니다. `VITE_*` 접두사로 노출하지 마세요.

## Vercel 업로드 제한

- Vercel 배포 환경에서는 요청 바디 크기 제한으로 큰 파일 업로드 시
  `FUNCTION_PAYLOAD_TOO_LARGE` / `Request Entity Too Large`가 발생할 수 있습니다.
- 현재 앱은 업로드 단계에서 **4MB 초과 파일**을 사전에 차단합니다.
- 더 큰 파일 처리가 필요하면 Vercel Blob 또는 외부 스토리지 연동 후 서버에서 처리하세요.

## Supabase 설정 (선택)

```bash
psql $DATABASE_URL -f supabase/migrations/0001_init.sql
```

## 테스트

```bash
npm test            # gbm, similarity, chunker 단위 테스트
```

## API 파이프라인

1. `POST /api/ingest` — multipart `file` (pdf/txt/png/jpg/webp). 응답: `{ documentId, rawText, tokens }`
2. `POST /api/process-rag` — `{ documentId, text }` → 청킹+임베딩+업서트. 응답: `{ chunks, model_versions }`
3. `POST /api/search` — `{ documentId, query, topK? }` → 응답: `{ answer, results: [{ chunkId, similarity, content }], model_versions }`
4. `POST /api/forecast` — `{ series: number[], horizons: ["3M","6M","12M"] }` → 응답: `{ horizons: { "3M": Band, "6M": Band, "12M": Band }, params }`

응답마다 `request_id`, `model_versions`가 포함됩니다.

## 보안

API 키는 모두 서버 사이드 (`/api/*.ts`)에서만 사용합니다. Vite 클라이언트 번들에 절대 포함되지 않으며, `.env*`는 `.gitignore`로 제외됩니다.

## Repository Identity

This repository uses the `invokelee` GitHub identity for commits and deployments.
