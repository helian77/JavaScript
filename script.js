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

// 규칙 추가: A1-1 → A1 추출
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

        // A1-1 형태 → A1 추출
        const validLocations = locationParts.map(loc => {
            const m = loc.trim().match(/^([A-Za-z]\d+)-\d+$/);
            return m ? m[1] : null;
        }).filter(Boolean);

        // 테이블에서는 썸네일 사용
        const locationImages = validLocations.map(prefix => `location/thumbnail/${prefix}.png`);

        return {
            name: parts[nameIndex].trim(),
            location: locationRaw,
            imageUrl: parts[imageIndex].trim(),
            locationImages
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

        // 여러 위치 이미지를 하나의 HTML 문자열로 변환
        const locationImagesHtml = drug.locationImages.map(img =>
            `<img src="${img}" class="drug-img small" onerror="this.onerror=null; this.src='location/default.png';">`
        ).join(" ");

        row.innerHTML = `
            <td><img src="${drug.imageUrl}" class="drug-img" onerror="this.onerror=null; this.src='default.png';"></td>
            <td class="drug-name">${drug.name}</td>
            <td>${drug.location}</td>
            <td>${locationImagesHtml}</td>
        `;
        drugTableBody.appendChild(row);
    });

    // 이미지 클릭 시 팝업 (썸네일 -> 원본 이미지)
    document.querySelectorAll(".drug-img").forEach(img => {
        img.addEventListener("click", function() {
            let originalSrc = this.src;

            // 썸네일 경로일 경우 원본 경로로 변환
            if (originalSrc.includes("/thumbnail/")) {
                originalSrc = originalSrc.replace("/thumbnail/", "/");
            }

            showImagePopup(originalSrc);
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
