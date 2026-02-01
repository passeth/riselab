# Next build 에러 수정 (products 라우트 충돌)

## 증상
`next build` 실패:

- Error: Ambiguous app routes detected
- Ambiguous route pattern `/products/[*]` matches:
  - `/products/[prdcode]`
  - `/products/[productCode]`

## 원인
Next.js App Router에서 dynamic segment 이름이 달라도 URL 패턴은 동일합니다.
즉, `[prdcode]`와 `[productCode]`는 모두 `/products/:any`로 매칭되어 라우팅이 모호해집니다.

## 조치
1) 문서(HANDOVER)에서 레거시 라우트 표기 수정:
- `/products/[prdcode]` → `/products/[productCode]`

2) 코드 기준 canonical route param은 `productCode`로 유지
- 실제 라우트: `src/app/products/[productCode]/...`

3) **중요: HEAD(원격/배포 기준)에 `[prdcode]` 라우트가 존재함**
- `git ls-files` 기준으로 아래 두 파일이 동시에 존재:
  - `src/app/products/[prdcode]/page.tsx`
  - `src/app/products/[productCode]/page.tsx`
- 이 상태로 배포/빌드하면 Next가 `/products/:any`를 구분 못해서 실패.
- 해결: `[prdcode]` 라우트를 **삭제하고 커밋/푸시** 해야 함.

## 검증
`npm run build` 성공 확인.

## 참고 (공식 문서)
- Next.js Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- Route Groups “conflicting paths” 주의: https://nextjs.org/docs/app/building-your-application/routing/route-groups
