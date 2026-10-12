/* The pass. A QR drawn as SVG; green once the car has started at the lot. */
import React, { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import QRCode from 'qrcode';
import { theme } from '../theme';

export function QR({ value, size = 180, green }: { value: string; size?: number; green?: boolean }) {
  const modules = useMemo(() => {
    const q = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const n = q.modules.size, data = q.modules.data as Uint8Array;
    const cells: [number, number][] = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (data[y * n + x]) cells.push([x, y]);
    return { n, cells };
  }, [value]);
  const cell = size / (modules.n + 2);
  const ink = green ? theme.color.good : theme.color.ink;
  return (
    <Svg width={size} height={size} accessibilityLabel={green ? 'Pass, car started' : 'Pass'}>
      <Rect x={0} y={0} width={size} height={size} rx={12} fill={theme.color.cloud} />
      {modules.cells.map(([x, y]) => <Rect key={`${x}-${y}`} x={(x + 1) * cell} y={(y + 1) * cell} width={cell + 0.3} height={cell + 0.3} fill={ink} />)}
    </Svg>
  );
}
