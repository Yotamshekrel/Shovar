import { memo, useMemo } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { barcodePayload, canEncodeCode128, encodeCode128 } from '@/barcode/code128';
import { encodeQr, qrPath } from '@/barcode/qr';
import type { BarcodeFormat } from '@/domain/types';

/** Renders a code as Code 128 barcode or QR, always on a white quiet zone for scanners. */
export const CodeDisplay = memo(function CodeDisplay({ code, format, width }: { code: string; format: BarcodeFormat; width: number }) {
  const payload = barcodePayload(code);
  const effective: BarcodeFormat = format === 'code128' && !canEncodeCode128(payload) ? 'qr' : format;

  const barcode = useMemo(() => {
    if (effective !== 'code128') return null;
    const widths = encodeCode128(payload);
    const total = widths.reduce((a, b) => a + b, 0);
    const quiet = 10;
    const modules = total + quiet * 2;
    let x = quiet;
    let d = '';
    widths.forEach((w, i) => {
      if (i % 2 === 0) d += `M${x} 0h${w}v1h${-w}z`;
      x += w;
    });
    return { d, modules };
  }, [effective, payload]);

  const qr = useMemo(() => {
    if (effective !== 'qr') return null;
    const m = encodeQr(code.trim());
    return { d: qrPath(m), size: m.size };
  }, [effective, code]);

  if (barcode) {
    // Snap each module to a whole number of physical pixels so bars stay crisp for scanners.
    const scale = PixelRatio.get();
    const modulePx = Math.max(1, Math.floor((width * scale) / barcode.modules)) / scale;
    const svgWidth = modulePx * barcode.modules;
    const height = Math.round(width * 0.38);
    return (
      <View style={[styles.white, { width: svgWidth, height }]} accessibilityLabel={`Barcode ${payload}`} accessible>
        <Svg width={svgWidth} height={height} viewBox={`0 0 ${barcode.modules} 1`} preserveAspectRatio="none">
          <Rect x={0} y={0} width={barcode.modules} height={1} fill="#FFFFFF" />
          <Path d={barcode.d} fill="#000000" />
        </Svg>
      </View>
    );
  }
  if (qr) {
    const size = Math.min(width, 280);
    const margin = 4;
    const total = qr.size + margin * 2;
    return (
      <View style={[styles.white, { width: size, height: size }]} accessibilityLabel={`QR code ${code}`} accessible>
        <Svg width={size} height={size} viewBox={`${-margin} ${-margin} ${total} ${total}`}>
          <Rect x={-margin} y={-margin} width={total} height={total} fill="#FFFFFF" />
          <Path d={qr.d} fill="#000000" />
        </Svg>
      </View>
    );
  }
  return null;
});

const styles = StyleSheet.create({
  white: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', alignSelf: 'center' },
});
