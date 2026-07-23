// 유플릿 상담 신청 폼 — 정적 사이트용 클라이언트 로직.
// 백엔드(잔디 웹훅 / 시트 API 등)가 확정되면 LEAD_ENDPOINT만 채우면 된다.
const LEAD_ENDPOINT = ""; // TODO: 베가네트웍스 팀 확정 후 실제 엔드포인트 URL 입력

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
        const res = await fetch(LEAD_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("submit failed");
      } else {
        // 백엔드 연결 전: 콘솔에 기록만 하고 성공 처리 (내일 엔드포인트 연결 시 위 분기가 실행됨)
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
