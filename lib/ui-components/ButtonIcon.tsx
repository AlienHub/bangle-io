import PropTypes from 'prop-types';
import React from 'react';

import { cx } from '@bangle.io/utils';

ButtonIcon.propTypes = {
  className: PropTypes.string,
  hint: PropTypes.string,
  hintPos: PropTypes.string,
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
  active: PropTypes.bool,
  style: PropTypes.object,
};

export function ButtonIcon({
  className = '',
  hint,
  hintPos = 'bottom',
  children,
  onClick,
  active,
  style,
  removeFocus = true,
}) {
  return (
    <button
      type="button"
      aria-label={hint}
      data-bangle-editor-pos={hintPos}
      data-bangle-editor-break={true}
      className={cx(
        active && 'active',
        removeFocus && 'focus:outline-none',
        className,
      )}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}
