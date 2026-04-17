$files = Get-ChildItem -Path "." -Recurse -Include "*.html","*.js","*.toml","*.xml","*.txt","*.css" |
    Where-Object { $_.FullName -notmatch "node_modules" }

foreach ($f in $files) {
    $c  = Get-Content $f.FullName -Raw -Encoding UTF8
    $c2 = $c -replace "buildquote\.co", "buildquotes.co"
    $c2 = $c2 -replace "BuildQuote(?!s)", "BuildQuotes"
    $c2 = $c2 -replace "💼 BuildQuotes", "💼 BuildQuotes"
    if ($c -ne $c2) {
        Set-Content $f.FullName $c2 -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($f.Name)"
    }
}
Write-Host "Done."
