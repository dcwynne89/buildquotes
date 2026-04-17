/* ============================================================
   modern.js — "Modern Estimate" quote template
   Clean, professional, accent colour header block
   ============================================================ */

module.exports = function modernTemplate(data, options) {
  const {
    from, to, quote = {}, items, tax_rate = 0, discount = 0,
    notes, terms, totals, valid_until,
  } = data;

  const {
    color = "#4F46E5",
    pageSize = "letter",
    currency_symbol = "$",
    watermark = false,
  } = options;

  const fmt = (n) => `${currency_symbol}${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  const lightColor = hexToLight(color);

  // ── Header row: from info left, quote meta right ──────────────
  const header = {
    columns: [
      {
        stack: [
          { text: from.name || "Your Company", style: "fromName" },
          from.address ? { text: from.address, style: "fromDetail" } : null,
          from.email   ? { text: from.email,   style: "fromDetail" } : null,
          from.phone   ? { text: from.phone,   style: "fromDetail" } : null,
        ].filter(Boolean),
        width: "*",
      },
      {
        stack: [
          { text: "ESTIMATE", style: "quoteLabel" },
          { text: `#${quote.number || "001"}`, style: "quoteNumber", color },
          quote.date       ? { text: `Date: ${quote.date}`,             style: "quoteMeta" } : null,
          valid_until      ? { text: `Valid Until: ${valid_until}`,     style: "quoteMeta", color: "#e53e3e" } : null,
        ].filter(Boolean),
        width: "auto",
        alignment: "right",
      },
    ],
    margin: [0, 0, 0, 20],
  };

  // ── Coloured divider ─────────────────────────────────────────
  const divider = {
    canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 4, r: 2, color }],
    margin: [0, 0, 0, 16],
  };

  // ── Bill To block ────────────────────────────────────────────
  const billTo = {
    columns: [
      {
        stack: [
          { text: "PREPARED FOR", style: "sectionLabel", color },
          { text: to.name || "Client Name", style: "toName" },
          to.company ? { text: to.company, style: "toDetail" } : null,
          to.address ? { text: to.address, style: "toDetail" } : null,
          to.email   ? { text: to.email,   style: "toDetail" } : null,
        ].filter(Boolean),
        width: "*",
      },
      quote.project ? {
        stack: [
          { text: "PROJECT", style: "sectionLabel", color },
          { text: quote.project, style: "toName" },
        ],
        width: "auto",
        alignment: "right",
      } : {},
    ],
    margin: [0, 0, 0, 20],
  };

  // ── Line items table ─────────────────────────────────────────
  const tableBody = [
    [
      { text: "DESCRIPTION", style: "tableHeader", fillColor: color, color: "#ffffff" },
      { text: "QTY",         style: "tableHeader", fillColor: color, color: "#ffffff", alignment: "center" },
      { text: "UNIT PRICE",  style: "tableHeader", fillColor: color, color: "#ffffff", alignment: "right" },
      { text: "AMOUNT",      style: "tableHeader", fillColor: color, color: "#ffffff", alignment: "right" },
    ],
    ...items.map((item, i) => [
      { text: item.description, style: "tableCell", fillColor: i % 2 === 0 ? "#f9f9f9" : "#ffffff" },
      { text: String(item.quantity ?? 1), style: "tableCell", alignment: "center", fillColor: i % 2 === 0 ? "#f9f9f9" : "#ffffff" },
      { text: fmt(item.rate ?? 0),        style: "tableCell", alignment: "right",  fillColor: i % 2 === 0 ? "#f9f9f9" : "#ffffff" },
      { text: fmt((item.quantity ?? 1) * (item.rate ?? 0)), style: "tableCell", alignment: "right", fillColor: i % 2 === 0 ? "#f9f9f9" : "#ffffff" },
    ]),
  ];

  const itemsTable = {
    table: {
      widths: ["*", 50, 80, 80],
      body: tableBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => "#e2e8f0",
    },
    margin: [0, 0, 0, 16],
  };

  // ── Totals block ─────────────────────────────────────────────
  const totalsRows = [
    ["Subtotal", fmt(totals.subtotal)],
    tax_rate > 0 ? [`Tax (${tax_rate}%)`, fmt(totals.tax)] : null,
    discount > 0 ? ["Discount", `-${fmt(totals.discount)}`] : null,
  ].filter(Boolean);

  const totalsTable = {
    columns: [
      { text: "", width: "*" },
      {
        width: 220,
        stack: [
          ...totalsRows.map(([label, val]) => ({
            columns: [
              { text: label, style: "totalsLabel" },
              { text: val,   style: "totalsValue", alignment: "right" },
            ],
            margin: [0, 2, 0, 2],
          })),
          {
            canvas: [{ type: "line", x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: color }],
            margin: [0, 4, 0, 4],
          },
          {
            columns: [
              { text: "ESTIMATE TOTAL", style: "grandTotalLabel", color },
              { text: fmt(totals.total), style: "grandTotalValue", color, alignment: "right" },
            ],
          },
        ],
      },
    ],
    margin: [0, 0, 0, 20],
  };

  // ── Validity callout ─────────────────────────────────────────
  const validityBlock = valid_until ? {
    table: {
      widths: ["*"],
      body: [[{
        text: `⏱ This estimate is valid until ${valid_until}. Prices are subject to change after this date.`,
        style: "validityNote",
        fillColor: lightColor,
      }]],
    },
    layout: "noBorders",
    margin: [0, 0, 0, 16],
  } : null;

  // ── Notes & Terms ─────────────────────────────────────────────
  const notesBlock = notes ? {
    stack: [
      { text: "NOTES", style: "sectionLabel", color },
      { text: notes, style: "noteText" },
    ],
    margin: [0, 0, 0, 12],
  } : null;

  const termsBlock = terms ? {
    stack: [
      { text: "TERMS & CONDITIONS", style: "sectionLabel", color },
      { text: terms, style: "noteText" },
    ],
    margin: [0, 0, 0, 12],
  } : null;

  // ── Acceptance signature block ────────────────────────────────
  const signatureBlock = {
    margin: [0, 20, 0, 0],
    columns: [
      {
        stack: [
          { canvas: [{ type: "line", x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: "#cccccc" }] },
          { text: "Accepted by (Client Signature)", style: "signLabel" },
          { canvas: [{ type: "line", x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: "#cccccc" }], margin: [0, 16, 0, 0] },
          { text: "Date", style: "signLabel" },
        ],
        width: 200,
      },
      { text: "", width: "*" },
      {
        stack: [
          { canvas: [{ type: "line", x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: "#cccccc" }] },
          { text: "Authorized by (Issuer Signature)", style: "signLabel" },
          { canvas: [{ type: "line", x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: "#cccccc" }], margin: [0, 16, 0, 0] },
          { text: "Date", style: "signLabel" },
        ],
        width: 200,
      },
    ],
  };

  // ── Watermark ─────────────────────────────────────────────────
  const watermarkDef = watermark
    ? { text: "BUILDQUOTE FREE TIER", color: "#cccccc", opacity: 0.3, bold: true, italics: true }
    : undefined;

  // ── Footer ───────────────────────────────────────────────────
  const footerFn = (currentPage, pageCount) => ({
    columns: [
      { text: `Generated by BuildQuote.co`, style: "footerText", color: "#999999" },
      { text: `Page ${currentPage} of ${pageCount}`, style: "footerText", alignment: "right", color: "#999999" },
    ],
    margin: [40, 10, 40, 0],
  });

  // ── Document definition ───────────────────────────────────────
  return {
    pageSize,
    pageMargins: [40, 50, 40, 60],
    watermark: watermarkDef,
    footer: footerFn,
    content: [
      header,
      divider,
      billTo,
      itemsTable,
      totalsTable,
      validityBlock,
      notesBlock,
      termsBlock,
      signatureBlock,
    ].filter(Boolean),
    styles: {
      fromName:        { fontSize: 16, bold: true, color: "#1a202c" },
      fromDetail:      { fontSize: 9,  color: "#718096", margin: [0, 1, 0, 0] },
      quoteLabel:      { fontSize: 10, bold: true, color: "#718096", letterSpacing: 2 },
      quoteNumber:     { fontSize: 22, bold: true, margin: [0, 2, 0, 4] },
      quoteMeta:       { fontSize: 9,  color: "#4a5568" },
      sectionLabel:    { fontSize: 8,  bold: true, letterSpacing: 1, margin: [0, 0, 0, 4] },
      toName:          { fontSize: 12, bold: true, color: "#1a202c" },
      toDetail:        { fontSize: 9,  color: "#718096", margin: [0, 1, 0, 0] },
      tableHeader:     { fontSize: 9,  bold: true, margin: [4, 6, 4, 6] },
      tableCell:       { fontSize: 9,  color: "#2d3748", margin: [4, 5, 4, 5] },
      totalsLabel:     { fontSize: 9,  color: "#4a5568" },
      totalsValue:     { fontSize: 9,  color: "#1a202c" },
      grandTotalLabel: { fontSize: 11, bold: true },
      grandTotalValue: { fontSize: 13, bold: true },
      validityNote:    { fontSize: 9,  color: "#744210", margin: [8, 6, 8, 6], italics: true },
      noteText:        { fontSize: 9,  color: "#4a5568", lineHeight: 1.5 },
      signLabel:       { fontSize: 8,  color: "#999999", margin: [0, 4, 0, 0] },
      footerText:      { fontSize: 8 },
    },
    defaultStyle: { font: "Roboto", fontSize: 10 },
  };
};

// Convert hex to a very light tint for backgrounds
function hexToLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * 0.88);
  const lg = Math.round(g + (255 - g) * 0.88);
  const lb = Math.round(b + (255 - b) * 0.88);
  return `#${lr.toString(16).padStart(2,"0")}${lg.toString(16).padStart(2,"0")}${lb.toString(16).padStart(2,"0")}`;
}
