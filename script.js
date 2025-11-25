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
        const mainImg = cols[idxImage].trim(); // 원본 이미지 경로

        const locationParts = locationRaw.split("/");
        const validLocations = locationParts.map(loc => {
            const match = loc.trim().match(/^([A-Za-z]\d+)-\d+$/);
            return match ? match[1] : null;
        }).filter(Boolean);

        return {
            name,
            locationRaw,
            mainThumbnail: `drug/thumb/${mainImg}`, // 표에 표시되는 썸네일
            mainOriginal: `drug/${mainImg}`,        // 클릭 시 표시되는 원본
            locationImages: validLocations.map(loc => ({
                thumb: `location/thumb/${loc}.png`,
                original: `location/${loc}.png`
            }))
        };
    });
}

/* ---------------------------
   Lazy Loading 썸네일 로딩 (Default.png fallback)
----------------------------- */
const thumbObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const div = entry.target;
        const thumbUrl = div.dataset.thumb;

        const img = new Image();
        img.onload = () => {
            div.style.backgroundImage = `url('${thumbUrl}')`;
            div.classList.remove("pending");
        };
        img.onerror = () => {
            div.style.backgroundImage = `url('location/thumb/Default.png')`;
            div.classList.remove("pending");
        };
        img.src = thumbUrl;

        thumbObserver.unobserve(div);
    });
});

/* ---------------------------
   썸네일 슬롯 생성기
----------------------------- */
function createThumbSlot(thumb, original) {
    const div = document.createElement("div");
    div.className = "image-slot pending";
    div.dataset.thumb = gistBase + thumb;

    // Lazy loading
    thumbObserver.observe(div);

    // 클릭 시 원본 팝업
    div.addEventListener("click", () => showImagePopup(gistBase + original));

    return div;
}

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

        // 메인 약 이미지 슬롯
        const mainSlot = createThumbSlot(drug.mainThumbnail, drug.mainOriginal);

        // 위치 이미지 슬롯 묶음
        const locContainer = document.createElement("div");
        locContainer.className = "location-container";
        drug.locationImages.forEach(loc => {
            const locSlot = createThumbSlot(loc.thumb, loc.original);
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
