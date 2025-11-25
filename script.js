const gistBase = "https://gist.githubusercontent.com/helian77/636699d654546e461d13702adbf34eff/raw/";
const dataUrl = gistBase + "drug_list.txt";

/* ---------------------------
   CSV Fetch & Parse
----------------------------- */
async function fetchDrugData() {
    try {
        const response = await fetch(dataUrl);
        const data = await response.text();
        return parseCsv(data);
    } catch (error) {
        console.error("데이터 불러오기 오류:", error);
        return [];
    }
}

const locationPatterns = [/^([A-Za-z]\d+)-\d+$/];

function parseCsv(csvData) {
    const lines = csvData.trim().split("\n");
    const headers = lines[0].split("\t");

    const idxName = headers.indexOf("name");
    const idxLocation = headers.indexOf("location");
    const idxImage = headers.indexOf("image");

    return lines.slice(1).map(line => {
        const cols = line.split("\t");
        const name = cols[idxName].trim();
        const locationRaw = cols[idxLocation].trim();
        const mainImgUrl = cols[idxImage].trim(); // 약품 사진은 실제 URL

        const locationParts = locationRaw.split("/");
        const validLocations = locationParts.map(loc => {
            const match = loc.trim().match(/^([A-Za-z]\d+)-\d+$/);
            return match ? match[1] : null;
        }).filter(Boolean);

        return {
            name,
            locationRaw,
            mainImgUrl, // 약품 사진 실제 URL
            locationImages: validLocations.map(loc => ({
                thumb: `location/thumb/${loc}.png`,
                original: `location/${loc}.png`
            }))
        };
    });
}

/* ---------------------------
   Lazy Loading 썸네일 로딩
----------------------------- */
const thumbObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const div = entry.target;
        const thumbUrl = div.dataset.thumb;

        // 실제 이미지 로딩
        div.style.backgroundImage = `url('${thumbUrl}')`;
        div.classList.remove("pending");

        // 로딩 실패 시 default 처리
        const img = new Image();
        img.onerror = () => div.style.backgroundImage = "url('location/default.png')";
        img.src = thumbUrl;

        thumbObserver.unobserve(div);
    });
});

/* ---------------------------
   약품 리스트 출력
----------------------------- */
async function displayDrugList() {
    const tbody = document.querySelector("#drugTable tbody");
    tbody.innerHTML = "<tr><td colspan='4'>불러오는 중...</td></tr>";

    const drugs = await fetchDrugData();
    tbody.innerHTML = "";

    drugs.forEach(drug => {
        const tr = document.createElement("tr");

        // 🔹 메인 약 이미지 (URL 직접)
        const mainSlot = document.createElement("img");
        mainSlot.className = "drug-img";
        mainSlot.src = drug.mainImgUrl;
        mainSlot.onerror = () => mainSlot.src = "default.jpg";
        mainSlot.addEventListener("click", () => showImagePopup(drug.mainImgUrl));

        // 🔹 위치 사진 썸네일
        const locContainer = document.createElement("div");
        locContainer.className = "location-container";

        drug.locationImages.forEach(loc => {
            const locSlot = document.createElement("div");
            locSlot.className = "image-slot small pending";
            locSlot.dataset.thumb = gistBase + loc.thumb;

            // 클릭 시 원본
            locSlot.addEventListener("click", () => showImagePopup(gistBase + loc.original));

            thumbObserver.observe(locSlot);
            locContainer.appendChild(locSlot);
        });

        tr.innerHTML = `
            <td class='img-cell'></td>
            <td class='drug-name'>${drug.name}</td>
            <td>${drug.locationRaw}</td>
            <td class='loc-cell'></td>
        `;

        tr.querySelector(".img-cell").appendChild(mainSlot);
        tr.querySelector(".loc-cell").appendChild(locContainer);

        tbody.appendChild(tr);
    });
}

/* ---------------------------
   검색 기능
----------------------------- */
function searchDrug() {
    const query = document.getElementById("searchBox").value.trim().toLowerCase();
    const rows = document.querySelectorAll("#drugTable tbody tr");

    rows.forEach(row => {
        const name = row.querySelector(".drug-name").textContent.toLowerCase();
        row.style.display = name.includes(query) ? "" : "none";
    });
}

/* ---------------------------
   원본 확대 팝업
----------------------------- */
function showImagePopup(src) {
    const modal = document.createElement("div");
    modal.className = "modal";

    modal.innerHTML = `
        <div class="modal-content">
            <img src="${src}" class="modal-img">
        </div>
    `;
    modal.addEventListener("click", () => modal.remove());
    document.body.appendChild(modal);
}

window.onload = displayDrugList;
