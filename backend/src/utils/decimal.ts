import Decimal from 'decimal.js';

// Central configuration for calculation precision and rounding
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

export class DecimalMath {
  static add(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a || 0).plus(new Decimal(b || 0));
  }

  static subtract(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a || 0).minus(new Decimal(b || 0));
  }

  static multiply(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a || 0).times(new Decimal(b || 0));
  }

  static divide(a: number | string | Decimal, b: number | string | Decimal, precision?: number): Decimal {
    const divisor = new Decimal(b || 0);
    if (divisor.isZero()) {
      return new Decimal(0);
    }
    const res = new Decimal(a || 0).dividedBy(divisor);
    return precision !== undefined ? this.round(res, precision) : res;
  }

  static round(val: number | string | Decimal, decimalPlaces = 2): Decimal {
    return new Decimal(val || 0).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
  }

  static roundMoney(val: number | string | Decimal): number {
    return this.round(val, 2).toNumber();
  }

  static roundQuantity(val: number | string | Decimal): number {
    return this.round(val, 4).toNumber();
  }

  static formatINR(val: number | string | Decimal): string {
    const num = this.roundMoney(val);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  static calculateGrossQuantity(
    calcType: 'VOLUME' | 'AREA' | 'RUNNING_LENGTH' | 'COUNT' | string,
    numberCount: number,
    length = 0,
    breadth = 0,
    depthOrHeight = 0
  ): Decimal {
    const n = new Decimal(numberCount || 0);
    const l = new Decimal(length || 0);
    const b = new Decimal(breadth || 0);
    const d = new Decimal(depthOrHeight || 0);

    switch (calcType.toUpperCase()) {
      case 'VOLUME':
        return n.times(l).times(b).times(d);
      case 'AREA':
        return n.times(l).times(d.isZero() ? (b.isZero() ? 1 : b) : d);
      case 'RUNNING_LENGTH':
        return n.times(l);
      case 'COUNT':
        return n;
      default:
        return n.times(l).times(b.isZero() ? 1 : b).times(d.isZero() ? 1 : d);
    }
  }

  static calculateDepreciatedValue(
    cost: number | string | Decimal,
    futureLifeYp: number | string | Decimal,
    totalLifeYp: number | string | Decimal
  ): Decimal {
    const c = new Decimal(cost || 0);
    const fy = new Decimal(futureLifeYp || 1);
    const ty = new Decimal(totalLifeYp || 1);

    if (ty.isZero()) return c;
    return this.round(c.times(fy).dividedBy(ty), 2);
  }
}
