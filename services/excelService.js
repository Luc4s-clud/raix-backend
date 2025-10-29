import XLSX from "xlsx";

export async function exportarExcel(dados) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dados);
  XLSX.utils.book_append_sheet(wb, ws, "Participações");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
}
