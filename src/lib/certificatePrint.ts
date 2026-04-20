/**
 * Auto-generated training certificate.
 * Opens a print window with an A4-landscape certificate of completion.
 */
export function printCertificate(opts: {
  staffName: string;
  designation?: string;
  department?: string;
  courseName: string;
  score?: number | null;
  completedDate: string; // DD MMM YYYY
  validUntil?: string | null;
  certificateNumber?: string | null;
  hospitalName: string;
}) {
  const w = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=1100,height=800"
  );
  if (!w) {
    alert("Please allow popups to download the certificate");
    return;
  }
  const esc = (s?: string | null) =>
    (s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const subline = [opts.designation, opts.department].filter(Boolean).map(esc).join(" · ");
  const scoreLine = typeof opts.score === "number" ? `Score: ${opts.score}%` : "";
  const validLine = opts.validUntil ? `Valid until: ${esc(opts.validUntil)}` : "Valid: Lifetime";
  const certNo = opts.certificateNumber ? `Certificate No: ${esc(opts.certificateNumber)}` : "";

  w.document.write(`<!DOCTYPE html><html><head><title>Certificate — ${esc(opts.courseName)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Georgia', 'Times New Roman', serif; background: #f8fafc; }
  .cert {
    width: 297mm; height: 210mm; padding: 18mm;
    background: #fff; position: relative;
    border: 14px double #B8860B;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center;
  }
  .hospital { font-size: 16px; color: #1A2F5A; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px; text-transform: uppercase; }
  h1 { color: #B8860B; font-size: 30px; letter-spacing: 6px; margin: 4px 0 18px; }
  .intro { color: #475569; font-size: 14px; margin: 4px 0; }
  .name { color: #1A2F5A; font-size: 36px; font-weight: 700; margin: 14px 0 4px; font-family: 'Georgia', serif; }
  .sub { color: #64748b; font-size: 13px; margin-bottom: 14px; font-style: italic; }
  .body-line { color: #334155; font-size: 14px; margin-top: 10px; }
  .course { color: #1A2F5A; font-size: 22px; font-weight: 700; margin: 8px 0 16px; }
  .meta { color: #475569; font-size: 13px; margin: 3px 0; font-family: 'JetBrains Mono', monospace; }
  .footer {
    position: absolute; bottom: 22mm; left: 18mm; right: 18mm;
    display: flex; justify-content: space-between; align-items: flex-end;
    font-size: 12px; color: #475569;
  }
  .sig { width: 220px; text-align: center; }
  .sig .line { border-top: 1px solid #1e293b; margin-bottom: 4px; height: 1px; }
  .nabh { position: absolute; bottom: 8mm; left: 0; right: 0; text-align: center; color: #0E7B7B; font-weight: 700; font-size: 11px; letter-spacing: 1px; }
  @media print { body { background: #fff; } .cert { border-color: #B8860B; } }
</style></head>
<body>
  <div class="cert">
    <div class="hospital">${esc(opts.hospitalName)}</div>
    <h1>CERTIFICATE OF COMPLETION</h1>
    <p class="intro">This is to certify that</p>
    <p class="name">${esc(opts.staffName)}</p>
    ${subline ? `<p class="sub">${subline}</p>` : ""}
    <p class="body-line">has successfully completed the course</p>
    <p class="course">"${esc(opts.courseName)}"</p>
    ${scoreLine ? `<p class="meta">${scoreLine} &nbsp;|&nbsp; Date: ${esc(opts.completedDate)}</p>` : `<p class="meta">Date: ${esc(opts.completedDate)}</p>`}
    <p class="meta">${validLine}</p>
    ${certNo ? `<p class="meta">${certNo}</p>` : ""}
    <div class="footer">
      <div class="sig"><div class="line"></div>Hospital Director</div>
      <div class="sig"><div class="line"></div>Training Manager</div>
    </div>
    <div class="nabh">NABH Compliant Training — Powered by Aumrti HMS</div>
  </div>
  <script>setTimeout(() => window.print(), 250);</script>
</body></html>`);
  w.document.close();
  w.focus();
}
