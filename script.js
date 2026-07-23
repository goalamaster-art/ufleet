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
    utmContent: params.get("utm_content") || "",
    landingPage: window.location.pathname,
  };
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

document.addEventListener("DOMContentLoaded", initLeadForm);
