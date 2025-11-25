테이블에 존재할 때는 이미지 크기가 작습니다. 그리고 이미지를 클릭하면 원본 사이즈로 확대해서 보여줍니다. 테이블로 이미지를 로드할 때는 해상도가 높을 필요가 없기 때문에 낮은 해상도로 로딩하면 데이터 사용량이 줄어들 수 있지 않을까요? 가능한지 검토해주세요.
const gistUrl = "https://gist.githubusercontent.com/helian77/636699d654546e461d13702adbf34eff/raw/drug_list.txt";

/* ---------------------------
    CSV Fetch & Parse
-----------------------------*/
async function fetchDrugData() {
    try {
        const response = await fetch(gistUrl);
        const data = await response.text();
        return parseCsv(data);
    } catch (error) {
        console.error("데이터를 불러오는 중 오류 발생:", error);
        return [];
    }
}

const locationPatterns = [
    /^([A-Za-z]\d+)-\d+$/,
];

function parseCsv(csvData) {
    const lines = csvData.trim().split("\n");
    const headers = lines[0].split("\t");
    const nameIndex = headers.indexOf("name");
    const locationIndex = headers.indexOf("location");
    const imageIndex = headers.indexOf("image");

    return lines.slice(1).map(line => {
        const parts = line.split("\t");

        const locationRaw = parts[locationIndex].trim();
        const locationParts = locationRaw.split("/");

        const validLocations = locationParts.map(loc => {
            const match = loc.trim().match(/^([A-Za-z]\d+)-\d+$/);
            return match ? match[1] : null;
        }).filter(Boolean);

        const locationImages = validLocations.map(x => `location/${x}.png`);

        return {
            name: parts[nameIndex].trim(),
            location: locationRaw,
            imageUrl: parts[imageIndex].trim(),
            locationImages   // array
        };
    });
}

/* ---------------------------
    Lazy Loading Observer
-----------------------------*/

const imageObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const div = entry.target;
        const realUrl = div.dataset.src;

        // 실제 이미지 로딩
        div.style.backgroundImage = `url('${realUrl}')`;

        div.classList.remove("pending");

        // 로딩 실패 처리
        const img = new Image();
        img.onload = () => {}; 
        img.onerror = () => div.classList.add("error");
        img.src = realUrl;

        imageObserver.unobserve(div);
    });
});

/* ---------------------------
    UI Rendering
-----------------------------*/

async function displayDrugList() {
    const drugTableBody = document.querySelector("#drugTable tbody");
    drugTableBody.innerHTML = "<tr><td colspan='4'>약품 목록을 불러오는 중...</td></tr>";

    const drugs = await fetchDrugData();
    if (drugs.length === 0) {
        drugTableBody.innerHTML = "<tr><td colspan='4'>약품 데이터를 불러올 수 없습니다.</td></tr>";
        return;
    }

    drugTableBody.innerHTML = "";

    drugs.forEach(drug => {
        const row = document.createElement("tr");

        /* 약 이미지 슬롯 생성 */
        const drugImgSlot = document.createElement("div");
        drugImgSlot.className = "image-slot pending";
        drugImgSlot.dataset.src = drug.imageUrl;

        imageObserver.observe(drugImgSlot);

        // 클릭 시 확대
        drugImgSlot.addEventListener("click", () => showImagePopup(drug.imageUrl));

        /* 위치 이미지 슬롯들 */
        const locContainer = document.createElement("div");
        locContainer.className = "location-container";

        drug.locationImages.forEach(url => {
            const locSlot = document.createElement("div");
            locSlot.className = "image-slot small pending";
            locSlot.dataset.src = url;

            locSlot.addEventListener("click", () => showImagePopup(url));

            imageObserver.observe(locSlot);
            locContainer.appendChild(locSlot);
        });

        /* 테이블 구성 */
        row.innerHTML = `
            <td class='img-cell'></td>
            <td class='drug-name'>${drug.name}</td>
            <td>${drug.location}</td>
            <td class='loc-cell'></td>
        `;

        row.querySelector(".img-cell").appendChild(drugImgSlot);
        row.querySelector(".loc-cell").appendChild(locContainer);

        drugTableBody.appendChild(row);
    });
}

/* ---------------------------
    검색 기능
-----------------------------*/
function searchDrug() {
    const query = document.getElementById("searchBox").value.trim().toLowerCase();
    const rows = document.querySelectorAll("#drugTable tbody tr");

    rows.forEach(row => {
        const name = row.querySelector(".drug-name").textContent.toLowerCase();
        row.style.display = name.includes(query) ? "" : "none";
    });
}

/* ---------------------------
    확대 팝업
-----------------------------*/
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
