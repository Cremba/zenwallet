import React from 'react'
import PropTypes from 'prop-types'

import Chart from './Chart'

export default function BarChart(props) {
  const {
    xAxisType, data, tooltipHeaderFormat, tooltipPointFormat, current,
  } = props
  const config = {
    chart: {
      type: 'column',
    },
    xAxis: {
      type: xAxisType,
      min: 0,
      max: 90,
      labels: {
        rotation: -45,
        style: {
          fontSize: '13px',
          fontFamily: 'Verdana, sans-serif',
        },
      },
    },
    yAxis: {
      min: 0,
    },
    series: [
      {
        name: 'My current vote',
        data: current,
        color: '#fd3a3a',
      },
      {
        name: 'Community Vote',
        data,
      },
    ],
    tooltip: {
      headerFormat: tooltipHeaderFormat,
      pointFormat: tooltipPointFormat,
    },
  }
  return <Chart config={config} />
}

BarChart.propTypes = {
  xAxisType: PropTypes.string,
  // eslint-disable-next-line
  title: PropTypes.string,
  // eslint-disable-next-line
  seriesTitle: PropTypes.string,
  // eslint-disable-next-line
  data: PropTypes.array.isRequired,
  // eslint-disable-next-line
  current: PropTypes.array,
  tooltipHeaderFormat: PropTypes.string,
  tooltipPointFormat: PropTypes.string,
}

BarChart.defaultProps = {
  xAxisType: 'column',
  tooltipHeaderFormat: '<span style="font-size: 10px">{point.key}</span><br/>',
  tooltipPointFormat:
    '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.y}</b><br/>',
}
