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
        const location = parts[locationIndex].trim();

        return { 
            name: parts[nameIndex].trim(), 
            location: location,
            imageUrl: parts[imageIndex].trim(),
            // 자동으로 위치 사진 경로 생성
            locationImageUrl: `location/${location}.jpg`
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
        row.innerHTML = `
            <td><img src="${drug.imageUrl}" class="drug-img" onerror="this.onerror=null; this.src='default.png';"></td>
            <td class="drug-name">${drug.name}</td>
            <td>${drug.location}</td>
            <td>
                <img src="${drug.locationImageUrl}" class="drug-img" 
                     onerror="this.onerror=null; this.src='location/default.jpg';">
            </td>
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
