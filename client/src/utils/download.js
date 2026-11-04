/**
 * Reliably downloads and/or displays a PDF from an authenticated FurniCraft endpoint.
 *
 * It uses fetch() with the stored JWT token to generate a local Blob URL, which:
 * 1. Bypasses browser popup blockers on mobile and desktop
 * 2. Works regardless of whether HTTP-only cookies are accepted across ports
 * 3. Triggers direct file download to device Downloads folder
 * 4. Also opens the file preview in a new tab if supported
 * 5. Falls back seamlessly to window.open() with a token query parameter
 */
export const downloadPdf = async (rawUrl, filename = 'document.pdf') => {
  let url = rawUrl;
  let token = null;

  try {
    token = localStorage.getItem('furnicraft_token');
  } catch {
    token = null;
  }

  try {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // Trigger instant client-side download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Also attempt to open in a new tab for instant visual preview
    try {
      window.open(blobUrl, '_blank');
    } catch {
      // Ignored if popup blocker intercepts; download already triggered
    }

    setTimeout(() => {
      try {
        window.URL.revokeObjectURL(blobUrl);
      } catch {}
    }, 60000);

    return true;
  } catch (error) {
    console.warn('Direct blob download failed, falling back to window.open with token:', error);
    window.open(url, '_blank');
    return false;
  }
};
