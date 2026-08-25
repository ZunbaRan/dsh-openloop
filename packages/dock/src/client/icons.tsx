/**
 * 极简线性图标集（DSH 风格 16px 描边，原型 icons.jsx 直搬 + TS 化）。
 * 只收录 M1/M2 实际用到的图标——原型里的 sun/moon/dots/external/refresh 等
 * 演示设施图标不进包（工程原则：不搬死代码）。
 */
import type { ReactNode } from 'react'

export interface IconProps { size?: number; sw?: number }

function I({ d, size = 15, sw = 1.5 }: IconProps & { d: string[] }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

export const icons = {
  board: (p: IconProps): ReactNode => <I {...p} d={['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z']} />,
  apps: (p: IconProps): ReactNode => <I {...p} d={['M12 2l9 5-9 5-9-5 9-5z', 'M3 12l9 5 9-5', 'M3 17l9 5 9-5']} />,
  pin: (p: IconProps): ReactNode => <I {...p} d={['M9 4h6l1 7 3 3H5l3-3 1-7z', 'M12 14v7']} />,
  search: (p: IconProps): ReactNode => <I {...p} d={['M11 19a8 8 0 100-16 8 8 0 000 16z', 'M21 21l-4.35-4.35']} />,
  chevronR: (p: IconProps): ReactNode => <I {...p} d={['M9 18l6-6-6-6']} />,
  chevronL: (p: IconProps): ReactNode => <I {...p} d={['M15 18l-6-6 6-6']} />,
  list: (p: IconProps): ReactNode => <I {...p} d={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} />,
  grid: (p: IconProps): ReactNode => <I {...p} d={['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z']} />,
  x: (p: IconProps): ReactNode => <I {...p} d={['M18 6L6 18', 'M6 6l12 12']} />,
  plus: (p: IconProps): ReactNode => <I {...p} d={['M12 5v14', 'M5 12h14']} />,
  check: (p: IconProps): ReactNode => <I {...p} d={['M20 6L9 17l-5-5']} />,
  trash: (p: IconProps): ReactNode => <I {...p} d={['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6']} />,
  sort: (p: IconProps): ReactNode => <I {...p} d={['M11 5h10', 'M11 9h7', 'M11 13h4', 'M3 17l3 3 3-3', 'M6 18V4']} />,
} as const
