/**
 * charts.js — Gráficos em SVG puro (sem bibliotecas externas)
 * -----------------------------------------------------------
 * Implementado do zero para funcionar 100% offline, sem depender
 * de nenhum CDN. Dois componentes:
 *
 *   Chart.renderLine(container, config)      → gráfico de linha
 *   Chart.renderDoseBand(container, config)  → faixa de dose (sem eixo Y)
 *
 * Nenhuma função aqui interpreta os dados; apenas os desenha.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

/** Escala linear simples de data (ISO) para posição X em pixels. */
function makeTimeScale(dateStartISO, dateEndISO, xLeft, xRight) {
  const start = new Date(dateStartISO + 'T00:00:00').getTime();
  const end = new Date(dateEndISO + 'T00:00:00').getTime();
  const span = Math.max(end - start, 1);
  return (iso) => {
    const t = new Date(iso + 'T00:00:00').getTime();
    const frac = (t - start) / span;
    return xLeft + frac * (xRight - xLeft);
  };
}

const Chart = {
  /**
   * config = {
   *   dateStart, dateEnd: 'YYYY-MM-DD',
   *   series: [{ label, color, points: [{date, value, dose}] }],
   *   yMin, yMax, yTicks: [numbers],
   *   height (opcional),
   *   onPointTap(point, seriesLabel) (opcional)
   * }
   */
  renderLine(container, config) {
    container.innerHTML = '';
    const width = Math.max(container.clientWidth || 340, 280);
    const height = config.height || 220;
    const padLeft = 34;
    const padRight = 12;
    const padTop = 14;
    const padBottom = 24;
    const xLeft = padLeft;
    const xRight = width - padRight;
    const yTop = padTop;
    const yBottom = height - padBottom;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width: '100%',
      height: height,
      class: 'chart-svg',
      role: 'img',
      'aria-label': config.ariaLabel || 'Gráfico de evolução',
    });

    const yScale = (v) => yBottom - ((v - config.yMin) / (config.yMax - config.yMin)) * (yBottom - yTop);
    const xScale = makeTimeScale(config.dateStart, config.dateEnd, xLeft, xRight);

    // linhas de grade horizontais + rótulos do eixo Y
    const ticks = config.yTicks || [config.yMin, config.yMax];
    ticks.forEach((t) => {
      const y = yScale(t);
      svg.appendChild(
        svgEl('line', { x1: xLeft, x2: xRight, y1: y, y2: y, class: 'chart-gridline' })
      );
      const label = svgEl('text', { x: xLeft - 6, y: y + 4, class: 'chart-axis-label', 'text-anchor': 'end' });
      label.textContent = t;
      svg.appendChild(label);
    });

    // eixo X (linha base)
    svg.appendChild(svgEl('line', { x1: xLeft, x2: xRight, y1: yBottom, y2: yBottom, class: 'chart-axis' }));

    // rótulos de data (início e fim)
    const dateStartLabel = svgEl('text', { x: xLeft, y: height - 6, class: 'chart-axis-label' });
    dateStartLabel.textContent = formatDateBR(config.dateStart);
    svg.appendChild(dateStartLabel);
    const dateEndLabel = svgEl('text', { x: xRight, y: height - 6, class: 'chart-axis-label', 'text-anchor': 'end' });
    dateEndLabel.textContent = formatDateBR(config.dateEnd);
    svg.appendChild(dateEndLabel);

    config.series.forEach((serie) => {
      if (!serie.points || serie.points.length === 0) return;
      const sorted = [...serie.points].sort((a, b) => (a.date < b.date ? -1 : 1));

      const pathD = sorted
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.date).toFixed(1)} ${yScale(p.value).toFixed(1)}`)
        .join(' ');
      svg.appendChild(svgEl('path', { d: pathD, class: 'chart-line', style: `stroke:${serie.color}` }));

      sorted.forEach((p) => {
        const cx = xScale(p.date);
        const cy = yScale(p.value);
        const circle = svgEl('circle', {
          cx: cx.toFixed(1),
          cy: cy.toFixed(1),
          r: 5,
          class: 'chart-point',
          style: `fill:${serie.color}`,
          tabindex: '0',
          'aria-label': `${formatDateBR(p.date)}: ${p.value}`,
        });
        circle.addEventListener('click', () => {
          if (config.onPointTap) config.onPointTap(p, serie.label);
        });
        svg.appendChild(circle);
      });
    });

    container.appendChild(svg);
  },

  /**
   * config = {
   *   dateStart, dateEnd: 'YYYY-MM-DD',
   *   stages: [{ id, startDate, endDate, dose, reductionPercent }],
   *   onSegmentTap(stage) (opcional)
   * }
   * Sem eixo Y — cada segmento é um retângulo cuja largura representa
   * o período em que aquela dose vigorou.
   */
  renderDoseBand(container, config) {
    container.innerHTML = '';
    const width = Math.max(container.clientWidth || 340, 280);
    const height = 64;
    const padLeft = 34;
    const padRight = 12;
    const xLeft = padLeft;
    const xRight = width - padRight;
    const bandTop = 10;
    const bandBottom = 40;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width: '100%',
      height,
      class: 'chart-svg dose-band-svg',
      role: 'img',
      'aria-label': 'Faixa de doses ao longo do tempo',
    });

    const xScale = makeTimeScale(config.dateStart, config.dateEnd, xLeft, xRight);

    const label = svgEl('text', { x: xLeft, y: height - 2, class: 'chart-axis-label dose-band-title' });
    label.textContent = 'Dose (mg/dia)';
    svg.appendChild(label);

    const stages = [...(config.stages || [])].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

    stages.forEach((stage) => {
      const segStart = stage.startDate < config.dateStart ? config.dateStart : stage.startDate;
      const segEndDate = stage.endDate || config.dateEnd;
      const segEnd = segEndDate > config.dateEnd ? config.dateEnd : segEndDate;
      if (segEnd < segStart) return;

      const x1 = xScale(segStart);
      const x2 = xScale(segEnd);
      const rectWidth = Math.max(x2 - x1, 2);

      const rect = svgEl('rect', {
        x: x1.toFixed(1),
        y: bandTop,
        width: rectWidth.toFixed(1),
        height: bandBottom - bandTop,
        rx: 4,
        class: 'dose-band-segment',
        tabindex: '0',
        'aria-label': `Dose ${stage.dose} mg a partir de ${formatDateBR(stage.startDate)}`,
      });
      rect.addEventListener('click', () => {
        if (config.onSegmentTap) config.onSegmentTap(stage);
      });
      svg.appendChild(rect);

      if (rectWidth > 30) {
        const doseLabel = svgEl('text', {
          x: (x1 + rectWidth / 2).toFixed(1),
          y: (bandTop + bandBottom) / 2 + 4,
          class: 'dose-band-value',
          'text-anchor': 'middle',
        });
        doseLabel.textContent = `${stage.dose}`;
        svg.appendChild(doseLabel);
      }
    });

    container.appendChild(svg);
  },
};
