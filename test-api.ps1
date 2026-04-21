$apiKey = "bqte_-AOGNoQWJEbavQWJ9yNo8lSVQMWWCTzV"
$body = @{
    from = @{ name = "Acme Contracting"; email = "quotes@acme.com"; address = "123 Main St, Austin TX" }
    to   = @{ name = "Jane Smith"; email = "jane@client.com"; address = "456 Oak Ave, Denver CO" }
    quote = @{ number = "QTE-001"; date = "2026-04-17"; project = "Kitchen Renovation" }
    valid_until = "2026-05-17"
    items = @(
        @{ description = "Demo & Prep"; quantity = 1; rate = 800 }
        @{ description = "Tile Installation (per sq ft)"; quantity = 120; rate = 12 }
        @{ description = "Cabinet Installation"; quantity = 1; rate = 1500 }
    )
    tax_rate = 8.25
    notes = "This estimate is based on a site visit on April 17, 2026. Final costs may vary based on material selection."
    terms = "50% deposit required to begin work. Balance due upon completion."
    options = @{ color = "#4F46E5"; currency_symbol = "$" }
} | ConvertTo-Json -Depth 5

try {
    $r = Invoke-RestMethod -Uri "https://buildquotes.co/api/v1/generate" -Method POST -ContentType "application/json" -Headers @{"X-API-Key"=$apiKey} -Body $body
    if ($r.success) {
        $bytes = [Convert]::FromBase64String($r.pdf)
        [System.IO.File]::WriteAllBytes("test-quote.pdf", $bytes)
        Write-Host "SUCCESS! PDF saved as test-quote.pdf"
        Write-Host "Pages: $($r.pages) | Size: $($r.sizeBytes) bytes | Total: $$($r.totals.total)"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
