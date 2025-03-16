import React, { useState, useEffect } from "react";

const GIST_URL = "https://gist.githubusercontent.com/helian77/636699d654546e461d13702adbf34eff/raw/drug_list.txt";

const DrugFinder = () => {
  const [drugList, setDrugList] = useState([]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    fetch(GIST_URL)
      .then((res) => res.text())
      .then((data) => {
        const lines = data.split("\n").filter(line => line.trim() !== "");
        if (lines.length > 1) {
          const headers = lines[0].split("\t").map(h => h.trim());
          const nameIndex = headers.indexOf("name");
          const locationIndex = headers.indexOf("location");

          if (nameIndex !== -1 && locationIndex !== -1) {
            const list = lines.slice(1).map(line => {
              const parts = line.split("\t");
              return {
                name: parts[nameIndex]?.trim() || "",
                location: parts[locationIndex]?.trim() || ""
              };
            });
            setDrugList(list);
          }
        }
      })
      .catch(error => console.error("Error fetching drug list:", error));
  }, []);

  const handleSearch = () => {
    const drug = drugList.find(d => d.name.toLowerCase() === query.toLowerCase());
    setLocation(drug ? drug.location : "위치를 찾을 수 없습니다.");
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSuggestions(
      drugList.filter(d => d.name.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
    );
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>약 위치 찾기</h2>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="약 이름을 입력하세요"
        list="drug-suggestions"
        style={{ padding: "8px", width: "80%", maxWidth: "400px" }}
      />
      <datalist id="drug-suggestions">
        {suggestions.map((s, index) => (
          <option key={index} value={s.name} />
        ))}
      </datalist>
      <button onClick={handleSearch} style={{ marginLeft: "10px", padding: "8px 16px" }}>
        검색
      </button>
      <h3>위치: {location}</h3>
    </div>
  );
};

export default DrugFinder;
