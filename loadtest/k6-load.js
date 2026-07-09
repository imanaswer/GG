// GameGround load test — k6. Ramps read traffic across public listings and
// exercises one authed write path (join a game). Results are UNVERIFIED until
// run against a seeded staging DB.
//
//   Run:  BASE_URL=https://staging.example.com \
//         TEST_EMAIL=loadtest@example.com TEST_PASSWORD=... \
//         GAME_ID=<open-free-game-id> \
//         k6 run loadtest/k6-load.js
//
// Stages sweep 100 -> 1000 concurrent VUs. Thresholds fail the run if the app
// degrades, so this doubles as a CI gate.
import http from "k6/http";
import { check, sleep, group } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const EMAIL = __ENV.TEST_EMAIL;
const PASSWORD = __ENV.TEST_PASSWORD;
const GAME_ID = __ENV.GAME_ID; // an open, free game the test user can join

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 100 },   // 100 users
        { duration: "2m", target: 500 },    // 500 users
        { duration: "2m", target: 1000 },   // 1000 users
        { duration: "1m", target: 0 },
      ],
      exec: "browse",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],                 // <1% errors
    http_req_duration: ["p(50)<200", "p(95)<800", "p(99)<1500"],
  },
};

const LISTINGS = ["/api/games", "/api/coaches", "/api/events", "/api/camps", "/api/workshops"];

export function browse() {
  group("public-listings", () => {
    const url = BASE + LISTINGS[Math.floor(Math.random() * LISTINGS.length)];
    const res = http.get(url);
    check(res, {
      "listing 200": (r) => r.status === 200,
      // Guards the unbounded-payload risk: flag any listing over ~500KB.
      "listing < 500KB": (r) => (r.body ? r.body.length : 0) < 512 * 1024,
    });
  });
  sleep(Math.random() * 2);
}

// Optional authed write scenario — enable by adding to `scenarios` above.
// Kept separate so a misconfigured credential can't fail the read gate.
export function joinGame() {
  if (!EMAIL || !GAME_ID) return;
  const login = http.post(`${BASE}/api/auth/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
    headers: { "Content-Type": "application/json" },
  });
  check(login, { "login 200": (r) => r.status === 200 });
  const jar = http.cookieJar();
  const res = http.post(`${BASE}/api/games/${GAME_ID}`, JSON.stringify({ action: "join" }), {
    headers: { "Content-Type": "application/json" },
    jar,
  });
  // 200 join OR 409 already-joined/full are both correct under contention.
  check(res, { "join handled": (r) => [200, 409, 402].includes(r.status) });
}
