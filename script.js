const gistUrl = "https://gist.githubusercontent.com/helian77/636699d654546e461d13702adbf34eff/raw/drug_list.txt";

const imageCache = {}; // 원본 이미지 캐시
let currentModal = null; // 현재 표시중인 모달

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

        // 새 규칙: 항목 뒤에 "-숫자"가 있으면 제거
        const normalizedLocations = locationParts.map(loc =>
            loc.trim().replace(/-\d+$/, "")
        );

        // 중복 제거 + 이미지 경로 만들기
        const locationImages = [...new Set(
            normalizedLocations.map(loc => `location/thumbnail/${loc}.png`)
        )];

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

    // 이미지 클릭 이벤트
    document.querySelectorAll(".drug-img").forEach(img => {
        img.addEventListener("click", function () {
            let originalSrc = this.src;

            if (originalSrc.includes("/thumbnail/")) {
                originalSrc = originalSrc.replace("/thumbnail/", "/");
            }

            showImagePopup(originalSrc);
        });
    });
}

// 모달 팝업 표시
function showImagePopup(imageSrc) {
    // 기존 모달이 있으면 제거
    if (currentModal) currentModal.remove();

    // 캐시에 이미지가 없으면 새로 생성
    let imgElement;
    if (imageCache[imageSrc]) {
        imgElement = imageCache[imageSrc];
    } else {
        imgElement = document.createElement("img");
        imgElement.src = imageSrc;
        imgElement.classList.add("modal-img");
        imageCache[imageSrc] = imgElement;
    }

    const modal = document.createElement("div");
    modal.classList.add("modal");
    const modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");
    modalContent.appendChild(imgElement);
    modal.appendChild(modalContent);

    modal.addEventListener("click", () => modal.remove());

    document.body.appendChild(modal);
    currentModal = modal;
}

window.onload = displayDrugList;
