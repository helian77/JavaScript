const gistUrl = "https://gist.githubusercontent.com/helian77/636699d654546e461d13702adbf34eff/raw/drug_list.txt";

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

// 🎯 규칙을 원하는 만큼 추가 가능
const locationPatterns = [
    /^([A-Za-z]\d+)-\d+$/,        // A1
//    /^[A-Za-z]\d-\d+$/,        // A1-1
//    /^[A-Za-z]\d+$/,           // C4
//    /^[A-Za-z]\d+-\d+$/,       // B12-34
//    /^[가-힣]+\d+$/,            // 카세트96
//    loc => loc.startsWith("특약"),   // 문자열 규칙도 가능
];

function parseCsv(csvData) {
    const lines = csvData.trim().split("\n");
    const headers = lines[0].split("\t");
    const nameIndex = headers.indexOf("name");
    const locationIndex = headers.indexOf("location");
    const imageIndex = headers.indexOf("image");

    if (nameIndex === -1 || locationIndex === -1 || imageIndex === -1) {
        console.error("CSV 헤더가 올바르지 않습니다.");
        return [];
    }

    return lines.slice(1).map(line => {
        const parts = line.split("\t");
        const locationRaw = parts[locationIndex].trim();

        // 🔥 위치를 슬래시로 분할
        const locationParts = locationRaw.split("/");

        // 🔥 정규식으로 A1-1 같은 형식만 필터링
        // const validLocations = locationParts.filter(loc => /^[A-Za-z]\d-\d+$/.test(loc.trim()));
        // 🔥 여러 규칙 중 하나라도 맞으면 true
        const validLocations = locationParts.filter(loc =>
            locationPatterns.some(pattern => pattern.test(loc.trim()))
        );

        // 🔥 이미지 경로 생성
        const locationImages = validLocations.map(loc => `location/${loc}.jpg`);

        return { 
            name: parts[nameIndex].trim(), 
            location: locationRaw,
            imageUrl: parts[imageIndex].trim(),
            locationImages: locationImages   // 여러 개의 이미지 목록
        };
    });
}

async function searchDrug() {
    const query = document.getElementById("searchBox").value.trim().toLowerCase();
    const rows = document.querySelectorAll("#drugTable tbody tr");

    rows.forEach(row => {
        const drugName = row.querySelector(".drug-name").textContent.toLowerCase();
        row.style.display = drugName.includes(query) ? "" : "none";
    });
}

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

        // 🔥 여러 위치 이미지를 하나의 HTML 문자열로 변환
        const locationImagesHtml = drug.locationImages.map(img =>
            `<img src="${img}" class="drug-img small" onerror="this.onerror=null; this.src='location/default.jpg';">`
        ).join(" ");

        row.innerHTML = `
            <td><img src="${drug.imageUrl}" class="drug-img" onerror="this.onerror=null; this.src='default.png';"></td>
            <td class="drug-name">${drug.name}</td>
            <td>${drug.location}</td>
            <td>${locationImagesHtml}</td>
        `;
        drugTableBody.appendChild(row);
    });

    // 이미지 클릭 시 확대
    document.querySelectorAll(".drug-img").forEach(img => {
        img.addEventListener("click", function() {
            showImagePopup(this.src);
        });
    });
}

function showImagePopup(imageSrc) {
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.innerHTML = `
        <div class="modal-content">
            <img src="${imageSrc}" class="modal-img">
        </div>
    `;
    modal.addEventListener("click", () => modal.remove());
    document.body.appendChild(modal);
}

window.onload = displayDrugList;
