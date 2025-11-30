// ==================== 수정 요청 ====================
const gistRawUrl="https://gist.githubusercontent.com/helian77/2ba3078e640845962ad251c3f40e696a/raw/request_list.txt";
const gistId="2ba3078e640845962ad251c3f40e696a";
const gistFileName="request_list.txt";
const githubToken="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"; // 하드코딩

async function fetchRemoteRequests() {
    try {
        const resp = await fetch(gistRawUrl, { cache: "no-store" });
        if (!resp.ok) throw new Error("Gist 불러오기 실패");
        return (await resp.text()).trim().split("\n").filter(l => l.trim());
    } catch {
        return [];
    }
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c});
}

async function patchGist(content) {
    const url = `https://api.github.com/gists/${gistId}`;
    const body = { files: {} };
    body.files[gistFileName] = { content };
    const resp = await fetch(url, {
        method: "PATCH",
        headers: {
            "Authorization": "token " + githubToken,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error(await resp.text());
    return await resp.json();
}

async function renderRequestList() {
    const ul = document.getElementById("requestList");
    const requests = await fetchRemoteRequests();
    if (requests.length === 0) { ul.innerHTML = "<li>요청이 없습니다.</li>"; return; }
    ul.innerHTML = "";

    requests.forEach((line, idx) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <input type="checkbox" id="chk${idx}" style="margin-right:8px;">
            <label for="chk${idx}" style="flex:1;">${escapeHtml(line)}</label>
        `;
        li.style.display = "flex";
        li.style.alignItems = "center";
        ul.appendChild(li);
    });
}

async function deleteCheckedRequests() {
    const ul = document.getElementById("requestList");
    const requests = await fetchRemoteRequests();
    const checkedIndices = [];
    ul.querySelectorAll("input[type='checkbox']").forEach((chk, idx) => {
        if (chk.checked) checkedIndices.push(idx);
    });

    if (checkedIndices.length === 0) {
        alert("삭제할 항목을 선택하세요.");
        return;
    }
    if (!confirm("체크한 항목을 삭제하시겠습니까?")) return;

    const newRequests = requests.filter((_, idx) => !checkedIndices.includes(idx));
    try {
        await patchGist(newRequests.join("\n"));
        await renderRequestList();
        alert("선택 항목이 삭제되었습니다.");
    } catch (e) {
        alert("삭제 실패: " + e.message);
    }
}

// 추가 버튼
document.getElementById("addSharedBtn").onclick = async () => {
    const txt = document.getElementById("requestInput").value.trim();
    if (!txt) { alert("내용을 입력하세요."); return; }
    if (txt.length > 200) { alert("200자 이하로 입력하세요."); return; }
    const newLine = `${formatNow()} | ${txt}`;
    const existing = await fetchRemoteRequests();
    try {
        await patchGist(newLine + (existing.length ? "\n" + existing.join("\n") : ""));
        document.getElementById("requestInput").value = "";
        await renderRequestList();
        alert("Gist에 추가되었습니다.");
    } catch (e) {
        alert("추가 실패: " + e.message);
    }
};

// 삭제 버튼 이벤트
const delBtn = document.createElement("button");
delBtn.textContent = "체크 항목 삭제";
delBtn.style.marginTop = "6px";
delBtn.onclick = deleteCheckedRequests;
document.getElementById("requestSidebar").appendChild(delBtn);

// 초기 로드
document.addEventListener("DOMContentLoaded", renderRequestList);
