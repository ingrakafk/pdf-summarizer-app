const MY_GROQ_API_KEY = "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";

const pdfFileInput = document.getElementById('pdfFile');
const fileLabel = document.getElementById('fileLabel');
const generateBtn = document.getElementById('generateBtn');
const btnIcon = document.getElementById('btnIcon');
const btnSpinner = document.getElementById('btnSpinner');
const btnText = document.getElementById('btnText');
const downloadBtn = document.getElementById('downloadBtn');
const outputLangSelect = document.getElementById('outputLang');

let extractedPdfText = "";
let uploadedFileName = "";

pdfFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        uploadedFileName = file.name;
        fileLabel.textContent = file.name;
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            
            let fullText = "";
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `[หน้า ${i}]\n${pageText}\n\n`;
            }
            extractedPdfText = fullText;
        } catch (err) {
            console.error("PDF Read Error:", err);
            alert("ไม่สามารถอ่านไฟล์ PDF นี้ได้");
        }
    }
});

generateBtn.addEventListener('click', async () => {
    const apiKey = MY_GROQ_API_KEY;
    if (!apiKey) {
        alert("กรุณาใส่ Groq API Key ในไฟล์ script.js ก่อนใช้งานครับ");
        return;
    }
    if (!extractedPdfText) {
        alert("กรุณาอัปโหลดไฟล์สไลด์ PDF ก่อนครับ");
        return;
    }

    setLoading(true);
    const lang = outputLangSelect.value;

    try {
        const result = await callGroqAPI(extractedPdfText, lang, apiKey, uploadedFileName);
        
        document.getElementById('previewTitle').textContent = uploadedFileName.replace(/\.[^/.]+$/, "").replace(/[-_/]/g, ' ');
        document.getElementById('aiSummaryContent').innerHTML = result.htmlContent;
        document.getElementById('previewFooterSource').textContent = `แหล่งอ้างอิง: ไฟล์ต้นฉบับ (${uploadedFileName})`;
    } catch (error) {
        console.error("Groq Error:", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        btnIcon.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
        btnText.textContent = "AI กำลังจัดหน้าและสรุปผล...";
        generateBtn.disabled = true;
    } else {
        btnIcon.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
        btnText.textContent = "สร้างสรุปเต็มหน้า A4 มืออาชีพ";
        generateBtn.disabled = false;
    }
}

async function callGroqAPI(text, lang, apiKey, fileName) {
    const endpoint = "https://api.groq.com/openai/v1/chat/completions";
    
    let langInstruction = "ภาษาไทย (พร้อมคำศัพท์เฉพาะภาษาอังกฤษในวงเล็บ)";
    if (lang === 'th') langInstruction = "ภาษาไทยเท่านั้น";
    if (lang === 'en') langInstruction = "อังกฤษเท่านั้น";

    const prompt = `คุณคือผู้เชี่ยวชาญด้านการสรุปและจัดหน้าเอกสารวิชาการ จงวิเคราะห์ข้อความจากสไลด์ PDF ด้านล่างนี้ แล้วจัดทำเป็น "บันทึกสรุป (Study Notes) ระดับมืออาชีพ ที่เต็มพื้นที่ 1 หน้ากระดาษ A4 พอดี"

กฎการจัดรูปแบบ HTML (บังคับใช้โครงสร้างนี้เท่านั้น):
1. แบ่งเนื้อหาออกเป็น 3 ถึง 4 การ์ดหัวข้อย่อย 
2. แต่ละการ์ดให้ใช้โครงสร้าง HTML นี้เป๊ะๆ:
   <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 shadow-sm space-y-1 mb-2.5">
       <h3 class="font-bold text-slate-900 text-xs">📌 [ชื่อหัวข้อกระชับ]</h3>
       <div class="text-[11px] text-slate-700 space-y-0.5">เนื้อหาย่อยหรือ bullet points</div>
   </div>
3. ตรวจสอบความถูกต้อง ห้ามมีข้อความตกหล่น ภาษาที่ใช้: ${langInstruction}
4. ห้ามใส่บล็อก markdown ครอบโค้ด ให้ส่งคืนเฉพาะโค้ด HTML ล้วนๆ เท่านั้น

เนื้อหาสไลด์จากไฟล์ (${fileName}):
${text}`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 4000
        })
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message);
    }

    if (!data.choices || data.choices.length === 0) {
        throw new Error("AI ไม่สามารถสร้างเนื้อหาได้ ลองใหม่อีกครั้ง");
    }

    let rawText = data.choices[0].message.content;
    rawText = rawText.replace(/```html/g, '').replace(/```/g, '').trim();    
    return { htmlContent: rawText };
}

downloadBtn.addEventListener('click', () => {
    const element = document.getElementById('a4Preview');
    
    downloadBtn.textContent = "กำลังสร้าง PDF...";
    downloadBtn.disabled = true;

    const originalZoom = element.style.zoom;
    element.style.zoom = '1';

    const opt = {
        margin: 0,
        filename: 'professional-study-notes.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            letterRendering: true,
            scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save().then(() => {
        element.style.zoom = originalZoom;
        downloadBtn.textContent = "ดาวน์โหลด PDF 1 หน้า A4 (Professional)";
        downloadBtn.disabled = false;
    }).catch(err => {
        console.error("PDF error:", err);
        element.style.zoom = originalZoom;
        alert("เกิดข้อผิดพลาดในการสร้าง PDF");
        downloadBtn.textContent = "ดาวน์โหลด PDF 1 หน้า A4 (Professional)";
        downloadBtn.disabled = false;
    });
});
