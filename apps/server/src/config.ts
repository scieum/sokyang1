import "dotenv/config";

/** 환경변수 로딩 및 기본값. 비밀값은 .env 에서만 주입한다. */
export const config = {
  port: Number(process.env.SERVER_PORT ?? 4000),
  tagoServiceKey: process.env.TAGO_SERVICE_KEY ?? "",
  cityCode: process.env.SOKCHO_CITY_CODE ?? "32310",
  redisUrl: process.env.REDIS_URL ?? "",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 3000),
  // 키가 없거나 USE_MOCK=true 이면 모의 데이터로 구동
  useMock:
    (process.env.USE_MOCK ?? "true").toLowerCase() === "true" ||
    !process.env.TAGO_SERVICE_KEY,
};
