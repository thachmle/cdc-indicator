import React, { PropTypes } from 'react';
import ChartData from '../lib/ChartData';
import C3ChartUpdatable from './C3ChartUpdatable';
import 'c3/c3.css';

const BarChart = ({ data, majorAxis }) => {
  // if data is empty, return empty component
  if (data.length === 0) {
    return null;
  }

  const chartConfig = new ChartData(data, majorAxis).chartConfig();
  chartConfig.data.type = 'bar';
  chartConfig.axis.rotated = true;

  if (_.get(chartConfig, 'axis.x.label')) {
    chartConfig.axis.x.label.position = 'outer-middle';
  }

  if (_.get(chartConfig, 'axis.y.label')) {
    chartConfig.axis.y.label.position = 'outer-center';
  }

  return (
    <C3ChartUpdatable {...chartConfig} />
  );
};

BarChart.propTypes = {
  data: PropTypes.array.isRequired,
  majorAxis: PropTypes.oneOf(['year', 'breakout']).isRequired
};

BarChart.defaultProps = {
  majorAxis: 'year'
};

export default BarChart;
