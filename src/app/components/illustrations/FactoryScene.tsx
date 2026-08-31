import './factory-scene.css';

/**
 * 숲 line-art factory scene for the auth overlay.
 * Drawn in light strokes for dark gradient backgrounds.
 */
export function FactoryScene() {
  return (
    <svg
      aria-hidden="true"
      className="factory-scene"
      fill="none"
      viewBox="0 0 320 220"
    >
      {/* ground */}
      <path
        className="fs-line"
        d="M14 196h292"
        strokeLinecap="round"
        strokeWidth="2.5"
      />

      {/* main building */}
      <path
        className="fs-line"
        d="M60 196V96l52-22v122"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path
        className="fs-line"
        d="M112 196V74h96v122"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      {/* sawtooth roof */}
      <path
        className="fs-line"
        d="M112 74l24-18v18l24-18v18l24-18v18l24-18v18"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />

      {/* chimney + steam */}
      <path
        className="fs-line"
        d="M228 196V60h22v136"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <g className="fs-steam">
        <circle className="fs-puff fs-puff--1" cx="239" cy="44" r="7" />
        <circle className="fs-puff fs-puff--2" cx="247" cy="30" r="9" />
        <circle className="fs-puff fs-puff--3" cx="236" cy="14" r="11" />
      </g>

      {/* flag */}
      <path className="fs-line" d="M136 56V34" strokeWidth="2" />
      <path className="fs-flag" d="M136 34h20l-6 6 6 6h-20z" />

      {/* big arched window: lamp + books inside */}
      <path
        className="fs-line"
        d="M132 196v-52a28 28 0 0 1 56 0v52"
        strokeWidth="2.5"
      />
      <path className="fs-line" d="M146 196v-24h12v24" strokeWidth="2" />
      <path className="fs-lamp" d="M170 172l6-10 6 10z" />
      <path className="fs-line" d="M176 172v10" strokeWidth="2" />
      <path className="fs-line" d="M166 182h20" strokeWidth="2" />

      {/* side building windows */}
      <rect
        className="fs-window"
        height="14"
        rx="3"
        width="16"
        x="72"
        y="112"
      />
      <rect
        className="fs-window"
        height="14"
        rx="3"
        width="16"
        x="72"
        y="140"
      />
      <rect
        className="fs-window"
        height="14"
        rx="3"
        width="16"
        x="72"
        y="168"
      />

      {/* door */}
      <path
        className="fs-line"
        d="M196 196v-26a8 8 0 0 0-16 0v26"
        strokeWidth="2"
      />

      {/* trees */}
      <path
        className="fs-tree"
        d="M282 196v-16m0 0c-10 0-15-8-15-17 0-10 7-16 15-16s15 6 15 16c0 9-5 17-15 17z"
        strokeWidth="2.5"
      />
      <path
        className="fs-tree"
        d="M36 196v-12m0 0c-7 0-11-6-11-12 0-7 5-12 11-12s11 5 11 12c0 6-4 12-11 12z"
        strokeWidth="2.5"
      />

      {/* sparkles */}
      <path
        className="fs-spark fs-spark--1"
        d="M52 60l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"
      />
      <path
        className="fs-spark fs-spark--2"
        d="M290 92l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z"
      />
      <path
        className="fs-spark fs-spark--3"
        d="M206 28l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z"
      />
    </svg>
  );
}
