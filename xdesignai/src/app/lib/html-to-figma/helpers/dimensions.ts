export type Direction = 'left' | 'right' | 'top' | 'bottom';

function getDirectionMostOfElements(myWindow: Window, direction: Direction, elements: Element[]) {
  if (elements.length === 1) {
    return elements[0];
  }

  return elements.reduce((memo, value) => {
    if (!memo) {
      return value;
    }

    const valueDirection = getBoundingClientRect(myWindow, value)[direction];
    const memoDirection = getBoundingClientRect(myWindow, memo)[direction];

    if (direction === 'left' || direction === 'top') {
      if (valueDirection < memoDirection) {
        return value;
      }
    } else {
      if (valueDirection > memoDirection) {
        return value;
      }
    }
    return memo;
  }, null as Element | null) as Element;
}

function getAggregateRectOfElements(myWindow: Window, elements: Element[]) {
  if (!elements.length) {
    return null;
  }

  const { top } = getBoundingClientRect(myWindow, getDirectionMostOfElements(myWindow, 'top', elements));
  const { left } = getBoundingClientRect(myWindow, getDirectionMostOfElements(myWindow, 'left', elements));
  const { bottom } = getBoundingClientRect(myWindow, getDirectionMostOfElements(myWindow, 'bottom', elements));
  const { right } = getBoundingClientRect(myWindow, getDirectionMostOfElements(myWindow, 'right', elements));
  const width = right - left;
  const height = bottom - top;
  return {
    top,
    left,
    bottom,
    right,
    width,
    height,
  };
}

export interface Dimensions extends Pick<DOMRect, 'top' | 'left' | 'bottom' | 'width' | 'right' | 'height'> {}

export function getBoundingClientRect(myWindow: Window, el: Element): Dimensions {
  const { getComputedStyle } = myWindow;

  const computed = getComputedStyle(el);
  const display = computed.display;
  if (display.includes('inline') && el.children.length) {
    const elRect = el.getBoundingClientRect();
    const aggregateRect = getAggregateRectOfElements(myWindow, Array.from(el.children))!;

    if (elRect.width > aggregateRect.width) {
      return {
        ...aggregateRect,
        width: elRect.width,
        left: elRect.left,
        right: elRect.right,
      };
    }
    return aggregateRect;
  }

  return el.getBoundingClientRect();
}
