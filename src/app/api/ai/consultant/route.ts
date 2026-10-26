import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = await req.json();
    const { userQuestion, inventoryContext } = body;

    if (!userQuestion) {
      return NextResponse.json({ error: "Pertanyaan tidak boleh kosong" }, { status: 400 });
    }

    if (!apiKey) {
      // Offline fallback consultant untuk demo jika API key belum diisi
      let response = `Halo! Saya AI Konsultan MM Smart Stock (Mode Offline / Demo). `;
      const q = userQuestion.toLowerCase();
      if (q.includes("kritis") || q.includes("habis") || q.includes("restock")) {
        response += `Berdasarkan data kartu stok saat ini, barang yang menyentuh batas kritis (ROP) adalah:\n1. B-002: Bearing Laher 6201 (Sisa: 4 Pcs, Min: 15 Pcs)\n2. D-001: Dinamo Motor DC 12V 775 (Sisa: 3 Unit, Min: 10 Unit)\n3. S-001: Silinder Baja Hidrolik 50mm (Sisa: 5 Pcs, Min: 12 Pcs).\n\nRekomendasi: Segera terbitkan Purchase Order (PO) untuk ketiga SKU tersebut sebelum terjadi kekosongan stok di gudang.`;
      } else if (q.includes("modal") || q.includes("aset") || q.includes("uang")) {
        response += `Total estimasi nilai modal stok yang tersimpan di gudang adalah sekitar Rp 15.800.000,-. Nilai modal terbesar saat ini tertahan pada Silinder Baja Hidrolik dan Oli Pelumas Mesin.`;
      } else if (q.includes("rak")) {
        response += `Lokasi Rak B-1 dan Rak A-3 merupakan rak dengan perputaran (burn rate) paling aktif bulan ini. Pastikan akses lorong menuju rak ini tetap leluasa untuk petugas.`;
      } else {
        response += `Saya siap menganalisis data pergerakan buku Kwarto Anda. Anda bisa menanyakan: barang mana yang perlu direstock, estimasi nilai modal, atau evaluasi selisih opname.`;
      }

      return NextResponse.json({ success: true, source: "demo-consultant", answer: response });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `
Anda adalah Senior Inventory & Warehouse Consultant untuk MM Smart Stock.
Tugas Anda menjawab pertanyaan pemilik gudang UMKM berdasarkan DATA AKTUAL GUDANG di bawah ini.

DATA INVENTARIS GUDANG SAAT INI (STRICT READ-ONLY):
${JSON.stringify(inventoryContext || [], null, 2)}

ATURAN WAJIB & KLAUSUL KEAMANAN:
1. JANGAN PERNAH berasumsi atau mengarang data barang yang tidak terdaftar di atas (Zero Hallucination).
2. Analisis barang mati (Dead Stock), barang kritis yang perlu segera direstock, dan total nilai aset yang tertahan.
3. Anda TIDAK MEMILIKI AKSES TULIS atau hak mengubah data database.
4. Gunakan bahasa Indonesia yang ramah, profesional, ringkas, dan fokus pada efisiensi arus kas UMKM.
`;

    const chatResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nPertanyaan Pemilik Gudang: ${userQuestion}` }],
        },
      ],
    });

    return NextResponse.json({
      success: true,
      source: "gemini-ai",
      answer: chatResponse.text,
    });
  } catch (error: any) {
    console.error("AI Consultant Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses konsultasi AI" },
      { status: 500 }
    );
  }
}
