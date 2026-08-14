import type { RenderedCell, RenderedPoster } from '../../poster/layout';
import { FONTS } from '../../design/themes';

/** Uppercase, letter-spaced stat labels. Values carry the information; labels just orient. */
function StatBlock({ cell, muted, text }: { cell: RenderedCell; muted: string; text: string }) {
  if (cell.stats.length === 0 || cell.statColumns === 0) return null;

  const colWidth = cell.statColWidth;
  const rowHeight = cell.labelSize * 1.5 + cell.valueSize * 1.24;

  return (
    <g>
      {cell.stats.map((stat, i) => {
        const col = i % cell.statColumns;
        const row = Math.floor(i / cell.statColumns);
        const x = cell.statRect.x + col * colWidth;
        const labelY = cell.statRect.y + row * rowHeight + cell.labelSize;
        return (
          <g key={`${stat.label}-${i}`}>
            <text
              x={x}
              y={labelY}
              fill={muted}
              fontFamily={FONTS.body}
              fontSize={cell.labelSize}
              fontWeight={700}
              letterSpacing={cell.labelSize * 0.14}
            >
              {stat.label.toUpperCase()}
            </text>
            <text
              x={x}
              y={labelY + cell.valueSize * 1.14}
              fill={text}
              fontFamily={FONTS.body}
              fontSize={cell.valueSize}
              fontWeight={400}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {stat.value}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Cell({ cell, poster }: { cell: RenderedCell; poster: RenderedPoster }) {
  const { theme } = poster;
  return (
    <g>
      <path
        d={cell.pathData}
        fill="none"
        stroke={theme.route}
        strokeWidth={cell.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {cell.title ? (
        <text
          x={cell.rect.x}
          y={cell.titleY}
          fill={theme.text}
          fontFamily={FONTS.display}
          fontSize={cell.titleSize}
          letterSpacing={cell.titleSize * 0.01}
        >
          {cell.title}
        </text>
      ) : null}
      <StatBlock cell={cell} muted={theme.muted} text={theme.text} />
    </g>
  );
}

export interface PosterProps {
  model: RenderedPoster;
  /** Set on the root <svg> so the exporters can find the live node. */
  svgRef?: React.Ref<SVGSVGElement>;
  className?: string;
}

/**
 * The poster itself. The viewBox is in millimetres, so this single component is simultaneously
 * the on-screen preview (scaled by CSS) and the exact geometry handed to the PNG and PDF
 * exporters — there is no second rendering path that could drift out of sync.
 */
export function Poster({ model, svgRef, className }: PosterProps) {
  const { theme } = model;
  return (
    <svg
      ref={svgRef}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${model.width} ${model.height}`}
      width={`${model.width}mm`}
      height={`${model.height}mm`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={model.width} height={model.height} fill={theme.background} />

      {model.header ? (
        <g>
          {model.header.title ? (
            <text
              x={model.width / 2}
              y={model.header.y}
              fill={theme.text}
              fontFamily={FONTS.display}
              fontSize={model.header.titleSize}
              textAnchor="middle"
              letterSpacing={model.header.titleSize * 0.015}
            >
              {model.header.title}
            </text>
          ) : null}
          {model.header.subtitle ? (
            <text
              x={model.width / 2}
              y={model.header.y + model.header.subtitleSize * 2}
              fill={theme.muted}
              fontFamily={FONTS.body}
              fontSize={model.header.subtitleSize}
              textAnchor="middle"
              letterSpacing={model.header.subtitleSize * 0.22}
            >
              {model.header.subtitle.toUpperCase()}
            </text>
          ) : null}
        </g>
      ) : null}

      {model.cells.map((cell) => (
        <Cell key={cell.activityId} cell={cell} poster={model} />
      ))}

      {model.footer ? (
        <text
          x={model.width / 2}
          y={model.footer.y}
          fill={theme.muted}
          fontFamily={FONTS.body}
          fontSize={model.footer.size}
          textAnchor="middle"
          letterSpacing={model.footer.size * 0.16}
        >
          {model.footer.text}
        </text>
      ) : null}
    </svg>
  );
}
