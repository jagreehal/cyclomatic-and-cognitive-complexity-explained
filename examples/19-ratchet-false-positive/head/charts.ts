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
};

export type Chart = Required<ChartOptions>;

/** New on this PR. Eleven defaults, no logic. */
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
}: ChartOptions = {}): Chart {
  return { width, height, title, theme, legend, grid, animate, xLabel, yLabel, locale };
}
