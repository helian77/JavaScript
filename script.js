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

    if (nameIndex === -1 || locationIndex === -1) {
        console.error("CSV 헤더가 올바르지 않습니다.");
        return [];
    }

    return lines.slice(1).map(line => {
        const parts = line.split("\t");
        return { name: parts[nameIndex].trim(), location: parts[locationIndex].trim() };
    });
}

async function searchDrug() {
    const query = document.getElementById("searchBox").value.trim();
    if (!query) return;

    const drugs = await fetchDrugData();
    const match = drugs.find(drug => drug.name.toLowerCase() === query.toLowerCase());

    const resultText = match ? `위치: ${match.location}` : "위치를 찾을 수 없습니다.";
    document.getElementById("result").textContent = resultText;
}

async function displayDrugList() {
    const drugListElement = document.getElementById("drugList");
    drugListElement.innerHTML = "<li>약품 목록을 불러오는 중...</li>";

    const drugs = await fetchDrugData();
    if (drugs.length === 0) {
        drugListElement.innerHTML = "<li>약품 데이터를 불러올 수 없습니다.</li>";
        return;
    }

    drugListElement.innerHTML = ""; // 기존 리스트 초기화
    drugs.forEach(drug => {
        const li = document.createElement("li");
        li.textContent = `${drug.name} - 위치: ${drug.location}`;
        drugListElement.appendChild(li);
    });
}

// 페이지 로드 시 자동 실행
window.onload = displayDrugList;
