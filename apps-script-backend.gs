/**
 * 유플릿 상담 신청(리드) 수집 백엔드 — Google Apps Script
 *
 * 사용법:
 * 1. 새 Google 스프레드시트를 만든다 (예: "유플릿 리드 DB").
 * 2. 확장 프로그램 > Apps Script 클릭.
 * 3. 기본 코드를 지우고 이 파일 내용을 전부 붙여넣는다.
 * 4. JANDI_WEBHOOK_URL에 잔디 Incoming Webhook 주소를 넣는다 (없으면 빈 문자열로 둬도 동작함).
 * 5. 배포 > 새 배포 > 유형: 웹앱
 *    - 실행 계정: 나
 *    - 액세스 권한이 있는 사용자: 모든 사용자
 * 6. 배포 후 나오는 웹앱 URL을 복사해서 script.js의 LEAD_ENDPOINT에 붙여넣는다.
 */

const JANDI_WEBHOOK_URL = ""; // TODO: 잔디 Incoming Webhook URL (선택)
const SHEET_NAME = "leads";

function doPost(e) {
  const sheet = getOrCreateSheet();
  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(),
    data.storeName || "",
    data.phone || "",
    data.industry || "",
    data.region || "",
    data.preferredTime || "",
    data.consentRequired ? "Y" : "N",
    data.consentMarketing ? "Y" : "N",
    data.utmSource || "",
    data.utmMedium || "",
    data.utmCampaign || "",
    data.utmContent || "",
    data.landingPage || "",
  ]);

  if (JANDI_WEBHOOK_URL) {
    notifyJandi(data);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "접수일시", "상호명", "연락처", "업종", "지역", "희망상담시간",
      "필수동의", "마케팅동의", "utm_source", "utm_medium", "utm_campaign",
      "utm_content", "landing_page",
    ]);
  }
  return sheet;
}

function notifyJandi(data) {
  const payload = {
    body: `[유플릿 신규 상담 신청] ${data.storeName} / ${data.phone} / ${data.industry}`,
    connectColor: "#2F5FD6",
    connectInfo: [
      { title: "지역", description: data.region || "미입력" },
      { title: "희망 상담 시간", description: data.preferredTime || "미입력" },
      { title: "유입 경로", description: `${data.utmSource || "direct"} / ${data.utmCampaign || "-"}` },
    ],
  };
  try {
    UrlFetchApp.fetch(JANDI_WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      headers: { Accept: "application/vnd.tosslab.jandi-v2+json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (err) {
    Logger.log("Jandi notify failed: " + err);
  }
}
