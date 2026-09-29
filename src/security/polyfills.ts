/**
 * @noble/ciphers encodes GCM length blocks with DataView#setBigUint64. Hermes
 * has BigInt, but older engines may lack the 64-bit DataView accessors, so we
 * provide spec-equivalent versions built on 32-bit writes when missing.
 */
type BigDataView = DataView & {
  setBigUint64?: (byteOffset: number, value: bigint, littleEndian?: boolean) => void;
  getBigUint64?: (byteOffset: number, littleEndian?: boolean) => bigint;
};

const MASK32 = BigInt(0xffffffff);
const SHIFT32 = BigInt(32);

export function setBigUint64Polyfill(this: DataView, byteOffset: number, value: bigint, littleEndian = false): void {
  const v = BigInt.asUintN(64, value);
  const hi = Number((v >> SHIFT32) & MASK32);
  const lo = Number(v & MASK32);
  if (littleEndian) {
    this.setUint32(byteOffset, lo, true);
    this.setUint32(byteOffset + 4, hi, true);
  } else {
    this.setUint32(byteOffset, hi, false);
    this.setUint32(byteOffset + 4, lo, false);
  }
}

export function getBigUint64Polyfill(this: DataView, byteOffset: number, littleEndian = false): bigint {
  const a = BigInt(this.getUint32(byteOffset, littleEndian));
  const b = BigInt(this.getUint32(byteOffset + 4, littleEndian));
  return littleEndian ? (b << SHIFT32) | a : (a << SHIFT32) | b;
}

export function installDataViewBigIntPolyfills(proto: BigDataView = DataView.prototype as BigDataView): void {
  if (typeof proto.setBigUint64 !== 'function') {
    Object.defineProperty(proto, 'setBigUint64', { value: setBigUint64Polyfill, writable: true, configurable: true });
  }
  if (typeof proto.getBigUint64 !== 'function') {
    Object.defineProperty(proto, 'getBigUint64', { value: getBigUint64Polyfill, writable: true, configurable: true });
  }
}

installDataViewBigIntPolyfills();
