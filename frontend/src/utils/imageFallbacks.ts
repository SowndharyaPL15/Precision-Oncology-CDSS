// High-resolution Vector SVG histological and Grad-CAM representations
// Guaranteed zero network latency, 100% offline-ready, and immune to broken image icons.

export const FALLBACK_SCAN_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="heBg" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#F2C4E2" />
      <stop offset="40%" stop-color="#DE8EBE" />
      <stop offset="80%" stop-color="#AA4B83" />
      <stop offset="100%" stop-color="#6F2353" />
    </radialGradient>
    <radialGradient id="nuc" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#4A1E7A" />
      <stop offset="70%" stop-color="#280C4B" />
      <stop offset="100%" stop-color="#140228" />
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="url(#heBg)"/>
  
  <!-- Microscopic tissue stroma and collagen fibres -->
  <path d="M0,80 Q100,120 200,70 T400,90" fill="none" stroke="#C86D9F" stroke-width="6" opacity="0.4"/>
  <path d="M0,220 Q120,260 250,210 T400,240" fill="none" stroke="#C86D9F" stroke-width="8" opacity="0.35"/>
  <path d="M0,320 Q150,300 280,340 T400,310" fill="none" stroke="#B05587" stroke-width="7" opacity="0.4"/>

  <!-- Histopathological cellular nuclei clusters (Hematoxylin stain) -->
  <g fill="url(#nuc)" opacity="0.88">
    <circle cx="85" cy="110" r="14"/>
    <circle cx="115" cy="95" r="12"/>
    <circle cx="145" cy="120" r="16"/>
    <circle cx="175" cy="100" r="13"/>
    <circle cx="105" cy="145" r="15"/>
    <circle cx="138" cy="155" r="18"/>
    <circle cx="168" cy="140" r="14"/>
    <circle cx="80" cy="170" r="12"/>
    
    <circle cx="235" cy="195" r="17"/>
    <circle cx="265" cy="175" r="13"/>
    <circle cx="285" cy="215" r="20"/>
    <circle cx="255" cy="235" r="16"/>
    <circle cx="218" cy="225" r="14"/>
    <circle cx="310" cy="190" r="15"/>
    <circle cx="330" cy="225" r="18"/>
    
    <circle cx="125" cy="275" r="15"/>
    <circle cx="155" cy="295" r="19"/>
    <circle cx="185" cy="270" r="14"/>
    <circle cx="145" cy="325" r="16"/>
    <circle cx="115" cy="330" r="13"/>
    <circle cx="305" cy="115" r="13"/>
    <circle cx="325" cy="145" r="16"/>
    <circle cx="65" cy="225" r="12"/>
    <circle cx="80" cy="255" r="14"/>
  </g>

  <rect x="20" y="355" width="360" height="28" rx="6" fill="#000000" fill-opacity="0.65"/>
  <text x="200" y="374" font-family="Arial, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">H&amp;E Histopathology Biopsy Scan</text>
</svg>
`)}`;

export const FALLBACK_HEATMAP_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="jetGrad" cx="45%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#FF1100" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#FF6600" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#FFDD00" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#00EE88" stop-opacity="0.6" />
      <stop offset="88%" stop-color="#0066FF" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#050A30" stop-opacity="0.9" />
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="#050A30"/>
  <circle cx="190" cy="180" r="145" fill="url(#jetGrad)"/>
  <circle cx="280" cy="260" r="75" fill="url(#jetGrad)" opacity="0.6"/>
  <circle cx="110" cy="130" r="65" fill="url(#jetGrad)" opacity="0.4"/>
  
  <rect x="20" y="355" width="360" height="28" rx="6" fill="#000000" fill-opacity="0.65"/>
  <text x="200" y="374" font-family="Arial, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">Grad-CAM Feature Activation Heatmap</text>
</svg>
`)}`;

export const FALLBACK_OVERLAY_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="heBg2" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#E2A6CE" />
      <stop offset="40%" stop-color="#C576A5" />
      <stop offset="80%" stop-color="#8F386B" />
      <stop offset="100%" stop-color="#55143D" />
    </radialGradient>
    <radialGradient id="jetGrad2" cx="45%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#FF1100" stop-opacity="0.82" />
      <stop offset="25%" stop-color="#FF6600" stop-opacity="0.75" />
      <stop offset="50%" stop-color="#FFDD00" stop-opacity="0.6" />
      <stop offset="75%" stop-color="#00EE88" stop-opacity="0.35" />
      <stop offset="90%" stop-color="#0066FF" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#0000FF" stop-opacity="0.0" />
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="url(#heBg2)"/>
  
  <g fill="#21053D" opacity="0.82">
    <circle cx="85" cy="110" r="14"/>
    <circle cx="115" cy="95" r="12"/>
    <circle cx="145" cy="120" r="16"/>
    <circle cx="138" cy="155" r="18"/>
    <circle cx="235" cy="195" r="17"/>
    <circle cx="285" cy="215" r="20"/>
    <circle cx="255" cy="235" r="16"/>
    <circle cx="155" cy="295" r="19"/>
    <circle cx="330" cy="225" r="18"/>
  </g>

  <!-- Grad-CAM Superimposed activation highlight -->
  <circle cx="190" cy="180" r="145" fill="url(#jetGrad2)"/>
  
  <rect x="20" y="355" width="360" height="28" rx="6" fill="#000000" fill-opacity="0.75"/>
  <text x="200" y="374" font-family="Arial, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">Grad-CAM Superimposed Slide Overlay</text>
</svg>
`)}`;
