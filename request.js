// request.js

// === 설정: 사용자가 제공한 Gist RAW URL / Gist ID / 파일명 ===
const gistRawUrl = "https://gist.githubusercontent.com/helian77/2ba3078e640845962ad251c3f40e696a/raw/e31e019b67f5084cc63ee40c9f31f05023e3da2d/request_list.txt";
const gistId = "2ba3078e640845962ad251c3f40e696a"; // 제공하신 Gist ID
const gistFileName = "request_list.txt"; // raw URL 끝 파일명에 맞춤
// =========================================================

// LocalStorage 키 (로컬에만 저장한 항목)
const LOCAL_KEY = "local_requests_for_requests_txt";

function formatNow() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function fetchRemoteRequestsRaw() {
    try {
        const resp = await fetch(gistRawUrl, {cache: "no-store"});
        if (!resp.ok) throw new Error("원격 Gist를 불러올 수 없습니다: " + resp.status);
        const text = await resp.text();
        return text.trim();
    } catch (e) {
        console.error(e);
        return ""; // 실패 시 빈 문자열 반환
    }
}

function loadLocalRequests() {
    try {
        const arr = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function saveLocalRequests(arr) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(arr));
}

async function loadRequestsAndRender() {
    const listEl = document.getElementById("requestList");
    listEl.innerHTML = "<li>로딩 중...</li>";

    const remoteText = await fetchRemoteRequestsRaw(); // may be ""
    const remoteLines = remoteText === "" ? [] : remoteText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    const local = loadLocalRequests(); // 로컬에만 있는 항목 (배열 of strings, 이미 '날짜 | 텍스트' 형식으로 저장)
    // 우선순위: remote 먼저 (공유된 것), 그 다음 로컬(미발행 요청)
    const merged = [...remoteLines, ...local];

    if (merged.length === 0) {
        listEl.innerHTML = "<li>요청 항목이 없습니다.</li>";
        return;
    }

    listEl.innerHTML = "";
    merged.forEach((line, idx) => {
        const li = document.createElement("li");
        // 표시할 텍스트와 삭제 버튼(삭제는 remote 항목만 가능 — index < remoteLines.length)
        const isRemote = idx < remoteLines.length;
        li.innerHTML = `
            <span style="margin-right:12px; flex:1; text-align:left;">${escapeHtml(line)}</span>
            ${isRemote ? `<button class="delete-btn" data-idx="${idx}">공유에서 삭제(완료)</button>` : `<button class="delete-local-btn" data-idx="${idx-remoteLines.length}">로컬 삭제</button>`}
        `;
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.justifyContent = "space-between";
        li.style.marginBottom = "6px";

        listEl.appendChild(li);
    });

    // 이벤트 바인딩
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = async (e) => {
            const idx = Number(e.currentTarget.getAttribute("data-idx"));
            if (!confirm("정말 이 항목을 Gist에서 삭제하시겠습니까? (이 작업은 Gist 수정 권한이 필요합니다)")) return;
            // 요청 토큰을 입력 받아 삭제 수행
            const token = prompt("관리자 GitHub Personal Access Token을 입력하세요.\n(토큰은 이 브라우저 세션의 메모리에서만 사용되며 저장되지 않습니다.)");
            if (!token) { alert("토큰이 입력되지 않아 삭제가 취소되었습니다."); return; }
            await deleteRemoteLineByIndex(idx, token);
        };
    });

    document.querySelectorAll(".delete-local-btn").forEach(btn => {
        btn.onclick = (e) => {
            const localIdx = Number(e.currentTarget.getAttribute("data-idx"));
            const locals = loadLocalRequests();
            if (!confirm("로컬 항목을 삭제하시겠습니까?")) return;
            locals.splice(localIdx, 1);
            saveLocalRequests(locals);
            loadRequestsAndRender();
        };
    });
}

// HTML 이스케이프 (XSS 방지)
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// === Gist 수정 함수들 ===
// 원칙: PATCH /gists/:gist_id with {"files": {"filename": {"content": "...updated content..."}}}
// 먼저 remote raw를 GET(익명 가능)으로 읽고, 변경 후 PATCH 요청으로 덮어씀.

async function patchGistWithNewContent(token, newContent) {
    const url = `https://api.github.com/gists/${gistId}`;
    const body = {
        files: {}
    };
    body.files[gistFileName] = { content: newContent };

    const resp = await fetch(url, {
        method: "PATCH",
        headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error("Gist 수정 실패: " + resp.status + " " + text);
    }
    return await resp.json();
}

async function addRemoteRequestLine(text, token) {
    // 원격 기존 내용 불러오기
    const existing = await fetchRemoteRequestsRaw();
    const newLine = `${formatNow()} | ${text}`;
    const updated = existing === "" ? newLine : (newLine + "\n" + existing);
    await patchGistWithNewContent(token, updated);
}

async function deleteRemoteLineByIndex(index, token) {
    const existing = await fetchRemoteRequestsRaw();
    const lines = existing === "" ? [] : existing.split("\n").map(l => l.trim());
    if (index < 0 || index >= lines.length) {
        alert("삭제할 인덱스가 잘못되었습니다.");
        return;
    }
    lines.splice(index, 1);
    const updated = lines.join("\n");
    try {
        await patchGistWithNewContent(token, updated);
        alert("삭제 완료: Gist가 업데이트되었습니다.");
        loadRequestsAndRender();
    } catch (e) {
        console.error(e);
        alert("삭제 중 오류: " + e.message);
    }
}

// === UI 동작: 등록 버튼들 연결 ===
document.addEventListener("DOMContentLoaded", () => {
    // 초기 로드
    loadRequestsAndRender();

    document.getElementById("addSharedBtn").onclick = async () => {
        const textInput = document.getElementById("requestInput");
        const text = textInput.value.trim();
        if (!text) { alert("내용을 입력하세요."); return; }
        if (text.length > 200) { alert("200자 이하로 입력하세요."); return; }

        if (!confirm("이 요청을 Gist에 바로 공유하시려면 관리자의 Personal Access Token 입력이 필요합니다.\n토큰을 입력하겠습니까? (취소하면 로컬에만 저장됩니다)")) {
            // 저장 안함
            return;
        }

        const token = prompt("관리자 GitHub Token을 입력하세요.\n(이 토큰은 이 창의 메모리에서만 사용되며 저장되지 않습니다.)");
        if (!token) { alert("토큰이 제공되지 않아 공유 저장이 취소되었습니다."); return; }

        try {
            await addRemoteRequestLine(text, token);
            alert("Gist에 추가되었습니다.");
            textInput.value = "";
            loadRequestsAndRender();
        } catch (e) {
            console.error(e);
            alert("Gist에 추가하는 중 오류 발생: " + e.message + "\n(로컬에 저장하시겠습니까?)");
        }
    };

    document.getElementById("addLocalBtn").onclick = () => {
        const textInput = document.getElementById("requestInput");
        const text = textInput.value.trim();
        if (!text) { alert("내용을 입력하세요."); return; }
        if (text.length > 200) { alert("200자 이하로 입력하세요."); return; }
        const newLine = `${formatNow()} | ${text}`;
        const locals = loadLocalRequests();
        locals.unshift(newLine);
        saveLocalRequests(locals);
        textInput.value = "";
        loadRequestsAndRender();
    };
});
