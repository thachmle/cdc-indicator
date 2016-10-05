/**
 * Helper to wrap elements into a grid layout
 */

import React, { PropTypes } from 'react';
import _ from 'lodash';
import styles from '../styles/grid.css';

function getGridStyle(length) {
  switch (length) {
    case 1:
      return 'gridFull';
    case 2:
      return 'gridHalf';
    default:
      return 'gridThird';
  }
}

const Grid = ({ children }) => {
  const childrenArray = _.castArray(children);
  const gridStyle = getGridStyle(childrenArray.length);
  const childElements = childrenArray.map((child, index) => (
    <div key={index} className={styles[gridStyle]}>
      {child}
    </div>
  ));

  return (
    <div className={styles.row}>
      {childElements}
    </div>
  );
};

Grid.propTypes = {
  children: PropTypes.element
};

export default Grid;
