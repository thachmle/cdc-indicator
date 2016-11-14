/**
 * ChartData - data model to transform SODA output to chart ready format
 */

import _ from 'lodash';
import { CONFIG } from '../constants';

/** Helper functions **/

// find data from year specified
function getDataForYear(array, key, year) {
  const dataForYear = _.find(array, { year });
  const value = _.get(dataForYear, key);

  // return null if value is invalid
  // isNaN(undefined) returns true (whereas _.isNaN would've returned false)
  return isNaN(value) ? 'N/A' : value;
}

/** main class **/
export default class ChartData {
  constructor(options) {
    this.breakoutColumn = options.breakoutColumn;
    this.breakoutLabelColumn = options.breakoutLabelColumn;
    this.data = options.data;
    this.dataSeries = options.dataSeries;
    this.latestYear = options.latestYear;
    this.locationColumn = options.locationColumn;
    this.locationLabelColumn = options.locationLabelColumn;
  }

  chartConfig() {
    // if there is no data, return an empty object
    if (this.data.length === 0) {
      return {};
    }

    switch (this.dataSeries) {
      case 'latest':
        return this._getConfigByBreakout();
      case 'trend':
        return this._getConfigByYear();
      case 'pie':
        return this._getConfigForPieChart();
      default:
        // do nothing
    }

    return {};
  }

  _getConfigByYear() {
    // group data
    const groupedData = _.chain(this.data)
      // group by location and breakout IDs
      .groupBy((row) =>
        `${row[this.locationColumn]} - ${row[this.breakoutColumn]}`
      )
      .reduce((acc, array) => {
        // use label columns for display
        const key = `${array[0][this.locationLabelColumn]} - ${array[0][this.breakoutLabelColumn]}`;
        return Object.assign({}, acc, {
          // keyBy ensures we get just one result (last occurrence)
          [key]: _.keyBy(array, 'year')
        });
      }, {})
      .value();

    // generate x axis values
    const years = _.chain(this.data)
      .groupBy('year')
      .keys()
      .sortBy()
      .value();

    // generate data array based on categories (order is important)
    const columns = [['year'].concat(years)].concat(
      _.map(groupedData, (values, key) => {
        return [key].concat(years.map((year) => {
          if (!values[year] || !values[year].data_value) {
            return null;
          }
          // return _.round(+values[year].data_value, 1);
          return values[year].data_value;
        }));
      })
    );

    const limits = _.reduce(groupedData, (acc, values, key) => {
      return Object.assign({}, acc, {
        [key]: years.map((year) => {
          const hc = _.get(values, `[${year}].high_confidence_limit`);
          const lc = _.get(values, `[${year}].low_confidence_limit`);
          return {
            high: isNaN(hc) ? 'N/A' : hc,
            low: isNaN(lc) ? 'N/A' : lc
          };
        })
      });
    }, {});

    const yLabel = ((this.data[0].data_value_unit || '').length > 1) ?
      `${this.data[0].data_value_type || ''} (${this.data[0].data_value_unit})` :
      (this.data[0].data_value_type || '');

    return {
      size: {
        height: CONFIG.map.defaults.height || 320
      },
      data: {
        columns,
        x: 'year',
        xFormat: '%Y'
      },
      axis: {
        x: {
          type: 'timeseries',
          tick: {
            format: '%Y'
          }
        },
        y: {
          label: {
            text: yLabel,
            position: 'outer-middle'
          }
        }
      },
      custom: {
        unit: this.data[0].data_value_unit || '',
        limits
      }
    };
  }

  // generate C3 configuration object, when major axis is breakout categories
  _getConfigByBreakout() {
    // group data by state (main data series),
    // then by breakout, and get values from the latest year
    const groupedData = _.chain(this.data)
      .groupBy(this.locationColumn)
      .reduce((groupByLocation, valuesByLocation) => {
        const location = valuesByLocation[0][this.locationLabelColumn];

        return Object.assign({}, groupByLocation, {
          [location]: _.chain(valuesByLocation)
            .groupBy(this.breakoutColumn)
            .reduce((groupByBreakout, valuesByBreakout) => {
              const breakout = valuesByBreakout[0][this.breakoutLabelColumn];

              return Object.assign({}, groupByBreakout, {
                [breakout]: {
                  value: getDataForYear(valuesByBreakout, 'data_value', this.latestYear),
                  limits: {
                    high: getDataForYear(
                      valuesByBreakout,
                      'high_confidence_limit',
                      this.latestYear
                    ),
                    low: getDataForYear(valuesByBreakout, 'low_confidence_limit', this.latestYear)
                  }
                }
              });
            }, {})
            .value()
        });
      }, {})
      .value();

    // generate x axis values
    const categories = _.chain(this.data)
      .keyBy(this.breakoutColumn)
      .map(value => value[this.breakoutLabelColumn])
      .sortBy()
      .value();

    // generate data array based on categories (order is important)
    const columns = _.map(groupedData, (value, key) =>
      [key].concat(categories.map((breakout) =>
        _.get(value, `${breakout}.value`, null)
      ))
    );

    // generate data array based on categories (order is important)
    const limits = _.reduce(groupedData, (acc, value, key) => {
      return Object.assign({}, acc, {
        [key]: categories.map((breakout) =>
          _.get(value, `${breakout}.limits`, null)
        )
      });
    }, {});

    const yLabel = ((this.data[0].data_value_unit || '').length > 1) ?
      `${this.data[0].data_value_type || ''} (${this.data[0].data_value_unit})` :
      (this.data[0].data_value_type || '');

    return {
      size: {
        height: CONFIG.map.defaults.height || 320
      },
      data: {
        columns
      },
      axis: {
        x: {
          categories,
          type: 'category'
        },
        y: {
          label: {
            text: yLabel,
            position: 'outer-middle'
          }
        }
      },
      custom: {
        unit: this.data[0].data_value_unit || '',
        limits
      }
    };
  }

  // get C3 config for a pie chart, where data array is a breakout category
  _getConfigForPieChart() {
    // group data by state (data series) to see if we are displaying state or national data
    const groupedByLocation = _.groupBy(this.data, 'locationabbr');

    // use National data by default
    let groupedData = groupedByLocation.US;

    // .. but if there are two locations, use state's
    if (_.size(groupedByLocation) === 2) {
      const state = _.without(Object.keys(groupedByLocation), 'US').shift();
      groupedData = groupedByLocation[state];
    }

    // use side effects to get a single unit value
    let unit;

    const transformedData = _.chain(groupedData)
      .groupBy('breakoutid')
      .reduce((groupedByBreakout, valuesByBreakout, breakout) => {
        // side effect
        unit = valuesByBreakout[0].data_value_unit || '';

        return Object.assign({}, groupedByBreakout, {
          [breakout]: {
            value: getDataForYear(valuesByBreakout, 'data_value', this.latestYear),
            label: valuesByBreakout[0][this.breakoutColumn]
          }
        });
      }, {})
      .value();

    // generate data array based on categories (order is important)
    const columns = _.chain(groupedData)
      .groupBy('breakoutid')
      .keys()
      .sortBy()
      .value()
      .map((breakout) => {
        return [transformedData[breakout].label].concat(transformedData[breakout].value);
      });

    return {
      size: {
        height: CONFIG.map.defaults.height || 320
      },
      data: {
        columns
      },
      custom: {
        unit
      }
    };
  }

}
