/** Open a PDF blob in a new tab (view / save-as). */
export function openReceiptPdfInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
}

/** Trigger the browser print dialog for a PDF blob (may fall back to a new tab). */
export function printReceiptPdf(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0')
  iframe.src = url
  document.body.appendChild(iframe)
  const cleanup = () => {
    URL.revokeObjectURL(url)
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
  }
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      openReceiptPdfInNewTab(blob)
    }
    window.setTimeout(cleanup, 120_000)
  }
}
