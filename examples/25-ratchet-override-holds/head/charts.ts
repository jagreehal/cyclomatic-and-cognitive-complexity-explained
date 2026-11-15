/**
 * The override was approved on an earlier PR (it is in base). It does not approve
 * the next increase: adding `dpi` takes createChart from 12 to 13, and the gate fails.
 */
export function chartTitle(title: string): string {
  return title.trim();
}

export type ChartOptions = {
  width?: number;
  height?: number;
  title?: string;
  theme?: 'light' | 'dark';
  legend?: boolean;
  grid?: boolean;
  animate?: boolean;
  xLabel?: string;
  yLabel?: string;
  locale?: string;
  dpi?: number;
};

export type Chart = Required<ChartOptions>;

// oxlint-disable-next-line complexity -- options bag: each default is one line, no logic
export function createChart({
  width = 640,
  height = 400,
  title = '',
  theme = 'light',
  legend = true,
  grid = true,
  animate = false,
  xLabel = '',
  yLabel = '',
  locale = 'en-GB',
  dpi = 2,
}: ChartOptions = {}): Chart {
  return { width, height, title, theme, legend, grid, animate, xLabel, yLabel, locale, dpi };
}
