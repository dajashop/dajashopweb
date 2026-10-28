// Lightweight, decorative vectors: no image requests or animation runtime.
export default function ServiceArtwork({ kind = 'engraving' }) {
  return (
    <svg className="svc-art" viewBox="0 0 320 280" width="320" height="280" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" opacity=".13">
        <circle cx="160" cy="140" r="113" />
        <circle cx="160" cy="140" r="93" strokeDasharray="2 7" />
        <path d="M23 140h20m234 0h20M160 3v20m0 234v20" />
      </g>
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'engraving' && <g transform="rotate(-20 160 140)">
          <path className="svc-art-fill" d="M134 77V28q26-7 52 0v49m-52 126v49q26 7 52 0v-49" />
          <path d="M140 38h40m-40 9h40m-40 9h40m-40 168h40m-40 10h40m-40 10h40" opacity=".3" />
          <circle className="svc-art-fill" cx="160" cy="140" r="68" />
          <circle cx="160" cy="140" r="59" />
          <rect className="svc-art-fill" x="229" y="131" width="8" height="18" rx="3" />
          <path d="M134 149v-23h9q14 0 14 12t-14 11h-9m27 0 10-23 10 23m-16-8h12" strokeWidth="2.5" />
          <path d="M135 163h50M148 114h24" opacity=".4" />
        </g>}
        {kind === 'battery' && <g transform="rotate(-18 160 140)">
          <path className="svc-art-fill" d="M76 130v38c0 31 38 56 84 56s84-25 84-56v-38" />
          <ellipse className="svc-art-fill" cx="160" cy="130" rx="84" ry="56" />
          <ellipse cx="160" cy="130" rx="70" ry="44" opacity=".4" />
          <path d="M143 130h34m-17-17v34" strokeWidth="3" />
          <path d="M88 168c29 43 117 47 145 0" opacity=".3" />
          <path d="m100 196 1 7m18 0 1 7m18-3 1 7m18-5 1 7m18-7 1 7m18-10 1 7" opacity=".4" />
        </g>}
        {kind === 'strap' && <g transform="rotate(22 160 140)">
          <rect className="svc-art-fill" x="117" y="25" width="86" height="94" rx="10" />
          <rect x="128" y="35" width="64" height="34" rx="4" />
          <path d="M160 33v43m-34 27h68m-63-23v17m58-17v17" />
          <path className="svc-art-fill" d="M117 145h86v77l-43 35-43-35z" />
          <path d="M126 154v65l34 27 34-27v-65" strokeDasharray="2 5" opacity=".4" />
          {[165, 182, 199, 216].map(y => <circle key={y} cx="160" cy={y} r="2" />)}
        </g>}
        {kind === 'sizing' && <g transform="rotate(-25 160 140)">
          {[70, 99, 128, 157, 186].map(y => <g key={y}>
            <rect className="svc-art-fill" x="99" y={y} width="122" height="24" rx="5" />
            <path d={`M133 ${y + 1}v22m54-22v22`} opacity=".45" />
          </g>)}
          <path d="M80 73v134m-7-127 7-7 7 7m-14 120 7 7 7-7M234 140h34m-7-7 7 7-7 7" />
          <path d="M106 57h108m-108 166h108" strokeDasharray="3 5" opacity=".4" />
        </g>}
        {kind === 'remote' && <g transform="rotate(-23 160 140)">
          <rect className="svc-art-fill" x="110" y="63" width="100" height="163" rx="27" />
          <rect x="120" y="73" width="80" height="143" rx="20" opacity=".35" />
          <circle cx="160" cy="86" r="3" />
          {[112, 152].map(y => <g key={y}>
            <rect x="130" y={y} width="25" height="28" rx="8" />
            <rect x="165" y={y} width="25" height="28" rx="8" />
          </g>)}
          <path d="M150 200h20m-17 27v12a7 7 0 0 0 14 0v-12M145 49a23 23 0 0 1 30 0m-42-14a41 41 0 0 1 54 0" />
        </g>}
      </g>
    </svg>
  );
}
