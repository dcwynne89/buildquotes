/* ============================================================
   generate.js — Quote generation endpoint
   POST /api/v1/generate
   ============================================================ */

const { authenticate, jsonResponse, errorResponse } = require("./utils/auth");
const { incrementUsage, MAX_BODY_BYTES } = require("./utils/storage");

const TEMPLATES = {
  modern: require("./utils/templates/modern"),
};

exports.handler = async (event) => {
  const { auth, response } = await authenticate(event, { countUsage: true });
  if (response) return response;

  if (event.httpMethod !== "POST") return errorResponse(405, "Method not allowed. Use POST.");

  if (event.body && Buffer.byteLength(event.body, "utf-8") > MAX_BODY_BYTES) {
    return errorResponse(413, "Request body too large.");
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return errorResponse(400, "Invalid JSON body."); }

  const {
    from, to, items, quote = {}, tax_rate = 0, discount = 0,
    notes, terms, valid_until, options = {},
  } = body;

  if (!from?.name) return errorResponse(400, "Missing 'from.name'.", { example: { from: { name: "Acme Corp" } } });
  if (!to?.name)   return errorResponse(400, "Missing 'to.name'.",   { example: { to:   { name: "Jane Smith" } } });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return errorResponse(400, "Missing 'items' array.", { example: { items: [{ description: "Web Design", quantity: 1, rate: 2500 }] } });
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.description) return errorResponse(400, `Item ${i + 1} missing 'description'.`);
    if (typeof item.rate !== "number" || item.rate < 0) return errorResponse(400, `Item ${i + 1} has invalid 'rate'.`);
    if (item.quantity == null) item.quantity = 1;
  }

  if (from.logo && !auth.tier.logoEnabled) {
    return errorResponse(403, "Logo embedding requires Starter plan or above.", {
      currentTier: auth.tier.name, upgrade: "https://buildquote.co/api/docs#pricing",
    });
  }

  const subtotal       = items.reduce((s, i) => s + (i.quantity || 1) * (i.rate || 0), 0);
  const taxAmount      = subtotal * (tax_rate / 100);
  const discountAmount = typeof discount === "number" ? discount : 0;
  const total          = subtotal + taxAmount - discountAmount;
  const totals         = { subtotal: r2(subtotal), tax: r2(taxAmount), discount: r2(discountAmount), total: r2(total) };

  const templateName = options.template || "modern";
  const templateFn   = TEMPLATES[templateName];
  if (!templateFn) {
    return errorResponse(400, `Unknown template: '${templateName}'. Available: ${Object.keys(TEMPLATES).join(", ")}`);
  }

  try {
    const quoteData = { from, to, quote, items, tax_rate, discount, notes, terms, valid_until, totals };
    const templateOptions = {
      color:           options.color           || "#4F46E5",
      pageSize:        options.pageSize        || "letter",
      currency_symbol: options.currency_symbol || "$",
      watermark:       auth.tier.watermark,
    };

    const docDefinition = templateFn(quoteData, templateOptions);
    const pdfBuffer     = await renderPdf(docDefinition);
    await incrementUsage(auth.hash);

    return jsonResponse(200, {
      success:      true,
      pdf:          pdfBuffer.toString("base64"),
      pages:        countPages(pdfBuffer),
      sizeBytes:    pdfBuffer.length,
      quote_number: quote.number || null,
      totals,
      watermark:    auth.tier.watermark,
      template:     templateName,
      usage: {
        used:      auth.quota.used + 1,
        limit:     auth.quota.limit,
        remaining: auth.quota.remaining - 1,
      },
      powered_by: "https://buildquote.co",
    });
  } catch (err) {
    console.error("Quote generation error:", err);
    return errorResponse(500, "Quote generation failed. Please try again.");
  }
};

async function renderPdf(docDefinition) {
  const PdfPrinter = require("pdfmake/src/printer");
  const vfsData    = require("pdfmake/build/vfs_fonts");
  const fonts      = {
    Roboto: {
      normal:      Buffer.from(vfsData["Roboto-Regular.ttf"],      "base64"),
      bold:        Buffer.from(vfsData["Roboto-Medium.ttf"],       "base64"),
      italics:     Buffer.from(vfsData["Roboto-Italic.ttf"],       "base64"),
      bolditalics: Buffer.from(vfsData["Roboto-MediumItalic.ttf"],"base64"),
    },
  };
  const printer = new PdfPrinter(fonts);
  const pdfDoc  = printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    const chunks = [];
    pdfDoc.on("data", (c) => chunks.push(c));
    pdfDoc.on("end",  () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

function countPages(buffer) {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

function r2(n) { return Math.round(n * 100) / 100; }
