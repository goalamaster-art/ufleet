// 유플릿 상담 신청 폼 — 정적 사이트용 클라이언트 로직.
// Google Apps Script 웹앱을 배포한 뒤 그 URL을 아래에 넣으면 폼 제출이
// 구글 시트(리드 DB) 저장 + 잔디 알림까지 자동으로 연결된다.
// 배포 방법은 apps-script-backend.gs 상단 주석 참고.
const LEAD_ENDPOINT = ""; // TODO: Apps Script 웹앱 배포 URL 입력 (예: https://script.google.com/macros/s/xxx/exec)

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") || "",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
    utmTerm: params.get("utm_term") || "",
    utmContent: params.get("utm_content") || "",
    landingPage: window.location.pathname,
  };
}

// ---------------------------------------------------------------
// UTM 소재별 동적 헤드카피 — admin/utm-guide.html 규칙과 동일한 매칭표.
// utm_content 값에 키워드가 들어있으면 히어로 헤드라인을 자동 교체한다.
// 우선순위: 배열 순서대로 첫 매칭 규칙이 적용된다 (구체적 업종 규칙이
// negative/video 같은 형식 플래그보다 먼저 와야 함).
// ---------------------------------------------------------------
const HEADLINE_RULES = [
  { test: /pos.*zero/i, headline: "포스기 0원으로 지금 바로 시작" },
  { test: /internet|인터넷/i, headline: "인터넷 요금 월 최대 3만원 절감" },
  { test: /beauty|뷰티|nail/i, headline: "뷰티샵 카드단말기 월 0원" },
  { test: /restaurant|요식/i, headline: "식당 포스기 0원으로 시작" },
  { test: /startup|창업/i, headline: "창업 준비 중이라면 지금이 기회" },
  { test: /academy|학원/i, headline: "학원 카드단말기 월 0원" },
  { test: /negative|부정/i, headline: "아직도 비싸게 내고 계신가요?" },
  { test: /video|영상/i, headline: "영상에서 보셨죠? 포스기 0원 진짜입니다" },
];

function applyDynamicHeadline() {
  const utmContent = new URLSearchParams(window.location.search).get("utm_content");
  if (!utmContent) return;
  const rule = HEADLINE_RULES.find((r) => r.test.test(utmContent));
  if (!rule) return;
  const h1 = document.querySelector(".hero h1");
  if (h1) h1.textContent = rule.headline;
}

// ---------------------------------------------------------------
// 메타 픽셀 이벤트 — admin/utm-guide.html의 이벤트 설계와 동일.
// fbq는 각 HTML의 <head> 베이스 코드(YOUR_PIXEL_ID 교체 후)가 있어야 동작한다.
// ---------------------------------------------------------------
function trackFbq(event, params) {
  if (typeof window.fbq !== "function") return;
  window.fbq("track", event, params || {});
}

function initPixelEvents() {
  const utm = getUtmParams();
  const contentName = document.title;

  // ViewContent — 랜딩 진입 시
  trackFbq("ViewContent", {
    content_name: contentName,
    utm_source: utm.utmSource,
    utm_content: utm.utmContent,
  });

  // Contact — 전화 상담 버튼 클릭 시
  document.querySelectorAll('a[href^="tel:"]').forEach((el) => {
    el.addEventListener("click", () => {
      trackFbq("Contact", { utm_content: utm.utmContent });
    });
  });

  // InitiateCheckout — 메인 CTA(히어로 1차 버튼) 클릭 시
  document.querySelectorAll("[data-cta='primary']").forEach((el) => {
    el.addEventListener("click", () => {
      trackFbq("InitiateCheckout", { utm_content: utm.utmContent });
    });
  });
}

function initLeadForm() {
  const form = document.getElementById("lead-form");
  if (!form) return;

  const fieldsWrap = document.getElementById("form-fields");
  const successWrap = document.getElementById("form-success");
  const errorEl = document.getElementById("form-error");
  const submitBtn = document.getElementById("submit-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const consentRequired = document.getElementById("consentRequired").checked;
    if (!consentRequired) {
      errorEl.textContent = "개인정보 수집·이용에 동의해주세요.";
      errorEl.hidden = false;
      return;
    }

    const payload = {
      storeName: form.storeName.value.trim(),
      phone: form.phone.value.trim(),
      industry: form.industry.value,
      region: form.region.value.trim(),
      preferredTime: form.preferredTime.value.trim(),
      consentRequired: true,
      consentMarketing: document.getElementById("consentMarketing").checked,
      ...getUtmParams(),
    };

    if (!payload.storeName || !payload.phone || !payload.industry) {
      errorEl.textContent = "필수 항목(상호명, 연락처, 업종)을 입력해주세요.";
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "접수 중...";

    try {
      if (LEAD_ENDPOINT) {
        // Apps Script 웹앱은 커스텀 CORS 응답 헤더를 못 붙이므로 no-cors로 전송.
        // text/plain 지정 시 프리플라이트(OPTIONS)가 안 붙어 Apps Script와 궁합이 좋다.
        // 응답 본문은 읽을 수 없지만(opaque), fetch가 에러 없이 끝나면 전송은 성공한 것.
        await fetch(LEAD_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
      } else {
        // 백엔드 연결 전: 콘솔에 기록만 하고 성공 처리 (엔드포인트 연결 시 위 분기가 실행됨)
        console.info("[유플릿 리드 - 로컬 임시 처리]", payload);
      }
      trackFbq("Lead", {
        content_name: document.title,
        store_status: payload.industry,
        utm_campaign: payload.utmCampaign,
        utm_content: payload.utmContent,
      });
      fieldsWrap.hidden = true;
      successWrap.hidden = false;
    } catch (err) {
      console.error(err);
      errorEl.textContent = "신청 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.";
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "상담 신청하기";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyDynamicHeadline();
  initPixelEvents();
  initLeadForm();
});
