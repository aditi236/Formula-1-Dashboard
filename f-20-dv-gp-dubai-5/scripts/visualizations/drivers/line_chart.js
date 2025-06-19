document.addEventListener('DOMContentLoaded', async () => {
  async function initMetricsLineChart() {
    const config = {
      containerID: 'drivers-visualization',
      margin: { top: 90, right: 300, bottom: 60, left: 150 },
      colors: ['#6EA4F4', '#2857D0', '#FFD666', '#FF9E2C', '#7CEBA5', '#2AAE62'],
      maxDrivers: 6,
      transitionDuration: 3800,
      lineStrokeWidth: 4,
      pointRadius: 6
    };
    //container & dimensions
    const container = document.getElementById(config.containerID);
    if (!container) {
      console.error('Container not found:', config.containerID);
      return;
    }
    container.innerHTML = '';

    const containerWidth = container.clientWidth || 800;
    const containerHeight = container.clientHeight || 600;
    const adjustedContainerHeight = containerHeight - 30;
    const width = containerWidth - config.margin.left - config.margin.right;
    const height = containerHeight - config.margin.top - config.margin.bottom;

    //main SVG
    const svg = d3.select('#' + config.containerID)
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .append('g')
      .attr('transform', `translate(${config.margin.left},${config.margin.top})`);

    //tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'linechart-tooltip')
      .style('position', 'absolute')
      .style('background', '#292929')
      .style('color', '#fff')
      .style('padding', '6px 10px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    displayPlaceholder('Select drivers to show chart');

    //create metrics data
    let metrics;
    try {
      const { aggregateMetrics } = await import('./metric.js');
      metrics = await aggregateMetrics();
      console.log('Metrics loaded:', metrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
      metrics = createMockMetricsData();
    }

    //statw
    const state = {
      selectedDrivers: [],
      selectedMetric: null,
      allMetricsData: metrics,
      metricOptions: [
        { value: 'raceWins', label: 'Race Wins' },
        { value: 'podiums', label: 'Podiums' },
        { value: 'polePositions', label: 'Pole Positions' },
        { value: 'championshipPoints', label: 'Championship Points' },
        { value: 'championshipPosition', label: 'Championship Position' },
        { value: 'championshipWins', label: 'Championship Wins' },
      ]
    };

    if (!metrics) {
      displayPlaceholder('No metrics data available.');
      return;
    }

    //scales &axes
    const xScale = d3.scaleLinear().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);
    const xAxisGroup = svg.append('g')
      .attr('transform', `translate(0, ${height})`)
      .attr('class', 'x-axis');
    const yAxisGroup = svg.append('g')
      .attr('class', 'y-axis');

    setupDriverDropdown(getAllDrivers(metrics), selected => {
      state.selectedDrivers = selected;
      updateChart();
    }, config);

    setupMetricSelect(state);

    //update chart function
    function updateChart() {
      const metric = state.selectedMetric;
      const drivers = state.selectedDrivers;

      svg.selectAll('.placeholder-text').remove();
      svg.selectAll('.line-path').remove();
      svg.selectAll('.data-point').remove();
      svg.selectAll('.legend').remove();

      if (!metric || drivers.length === 0) {
        displayPlaceholder('Select up to 6 drivers and a metric.');
        return;
      }

      svg.selectAll('.placeholder-text').remove();
      svg.selectAll('.line-path').remove();
      svg.selectAll('.data-point').remove();
      svg.selectAll('.legend').remove();

      const driverSeries = [];
      drivers.forEach(driverId => {
        const yearObj = metrics[metric][driverId];
        if (!yearObj) return;

        //convert {year: numberOrArray} => [{year, value}]
        const arr = Object.entries(yearObj).map(([y, val]) => {
          if (typeof val === 'number') {
            return { year: +y, value: val };
          } else if (Array.isArray(val) && val.length > 0) {
            const row = val[0];
            const points = row.points ? +row.points : 0;
            return { year: +y, value: points };
          } else {
            return { year: +y, value: 0 };
          }
        }).sort((a, b) => a.year - b.year);

        driverSeries.push({ driverId, data: arr });
      });

      const allPoints = driverSeries.flatMap(d => d.data);
      if (!allPoints.length) {
        displayPlaceholder('No data for selected drivers/metric.');
        return;
      }
      const minYear = d3.min(allPoints, d => d.year);
      const maxYear = d3.max(allPoints, d => d.year);
      const maxValue = d3.max(allPoints, d => d.value);

      xScale.domain([minYear, maxYear]);
      //invert Y axis if metric is championshipPosition
      if (metric === 'championshipPosition') {
        const domainTop = Math.max(1, maxValue);
        yScale.domain([domainTop, 1]).nice();
      } else {
        yScale.domain([0, maxValue]).nice();
      }

      //axes
      const xAxis = d3.axisBottom(xScale).tickFormat(d3.format('d'));
      const yAxis = d3.axisLeft(yScale);
      xAxisGroup.transition().duration(750).call(xAxis);
      yAxisGroup.transition().duration(750).call(yAxis);

      //remove old labels
      svg.selectAll('.axis-label').remove();

      //X-axis label
      svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 55)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .style('font-size', '18px')
        .text('Years');

      //Y-axis label
      const selectedMetricObj = state.metricOptions.find(m => m.value === metric);
      const yAxisLabel = selectedMetricObj ? selectedMetricObj.label : metric;

      svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -60)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .style('font-size', '18px')
        .text(yAxisLabel);


      const lineGen = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.value));

      driverSeries.forEach((driverObj, idx) => {
        const color = config.colors[idx % config.colors.length];
        const path = svg.append('path')
          .datum(driverObj.data)
          .attr('class', 'line-path')
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', config.lineStrokeWidth)
          .attr('d', lineGen);

        const totalLength = path.node().getTotalLength();
        path
          .attr('stroke-dasharray', totalLength + ' ' + totalLength)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(2000)
          .attr('stroke-dashoffset', 0);

        svg.selectAll(`.point-${driverObj.driverId}`)
          .data(driverObj.data)
          .enter()
          .append('circle')
          .attr('class', `data-point point-${driverObj.driverId}`)
          .attr('cx', d => xScale(d.year))
          .attr('cy', d => yScale(d.value))
          .attr('r', config.pointRadius)
          .attr('fill', color)
          .on('mouseover', (event, d) => {
            tooltip
              .style('opacity', 1)
              .style('box-shadow', `4px 4px 8px -2px ${color}`)
              .html(`
                ${driverObj.driverId}<br/>
                <strong>Year- </strong> ${d.year}<br/>
                <strong>Value- </strong> ${d.value}
              `);
          })
          .on('mousemove', event => {
            tooltip
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 20) + 'px');
          })
          .on('mouseout', () => {
            tooltip
              .style('opacity', 0)
              .style('box-shadow', 'none');
          });
      });

      //legend
      const legendGroup = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + 20}, 0)`);

      driverSeries.forEach((driverObj, idx) => {
        let driverName = driverObj.driverId
          .split("-")
          .join(" ")
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ") || "Unknown Driver";

        const legendRow = legendGroup.append('g')
          .attr('transform', `translate(0, ${idx * 25})`);

        legendRow.append('rect')
          .attr('width', 18)
          .attr('height', 18)
          .attr('fill', config.colors[idx % config.colors.length]);

        legendRow.append('text')
          .attr('x', 24)
          .attr('y', 13)
          .attr('fill', '#fff')
          .style('font-size', '13px')
          .text(driverName);
      });

    }

    //driver IDs
    function getAllDrivers(metrics) {
      const driverSet = new Set();
      for (const metricKey in metrics) {
        for (const driverId in metrics[metricKey]) {
          driverSet.add(driverId);
        }
      }
      return Array.from(driverSet).sort();
    }

    //driver dropdown
    function setupDriverDropdown(drivers, onSelectionChange, config) {
      const container = document.getElementById('driver-select-container');
      const header = document.getElementById('driver-select-header');
      const dropdown = document.getElementById('driver-dropdown');
      const searchInput = document.getElementById('driver-search');
      const driverListDiv = document.getElementById('driver-list');
      const selectedList = document.getElementById('driver-selected-list');

      if (!container || !header || !dropdown || !searchInput || !driverListDiv || !selectedList) {
        console.warn("One or more driver dropdown elements not found.");
        return;
      }

      let isOpen = false;
      let selectedDrivers = [];

      //toggle the dropdown
      header.addEventListener('click', () => {
        isOpen = !isOpen;
        dropdown.classList.toggle('open', isOpen);
      });

      //close dropdown if user clicks outside
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          isOpen = false;
          dropdown.classList.remove('open');
        }
      });

      //driver dropdown items
      const driverItems = drivers.map(driverId => {
        const wrapper = document.createElement('div');
        wrapper.className = 'driver-item';

        const label = document.createElement('label');
        label.textContent = driverId;

        label.addEventListener('click', () => {
          if (selectedDrivers.includes(driverId)) {
            selectedDrivers = selectedDrivers.filter(d => d !== driverId);
            wrapper.classList.remove('selected');
          } else {
            if (selectedDrivers.length >= config.maxDrivers) {
              alert("You can only select up to " + config.maxDrivers + " drivers.");
              return;
            }
            selectedDrivers.push(driverId);
            wrapper.classList.add('selected');
          }

          updateSelectedTokens();
          onSelectionChange(selectedDrivers);
        });

        wrapper.appendChild(label);
        return wrapper;
      });

      driverItems.forEach(item => driverListDiv.appendChild(item));

      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        driverItems.forEach(item => {
          const driverId = item.textContent.toLowerCase();
          const formattedDriverId = driverId
            .split("-")
            .join(" ")
            .toLowerCase();
          if (driverId.includes(query) || formattedDriverId.includes(query)) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });
      });

      //show selected drivers as tokens in the header
      function updateSelectedTokens() {
        selectedList.innerHTML = '';
        if (selectedDrivers.length === 0) {
          const placeholder = document.createElement('span');
          placeholder.className = 'placeholder-text';
          placeholder.textContent = 'Select Driver(s)';
          selectedList.appendChild(placeholder);
        } else {
          selectedDrivers.forEach(driverId => {
            const token = document.createElement('span');
            token.className = 'driver-token';
            token.title = driverId;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'driver-name';
            nameSpan.textContent = driverId;

            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-token';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
              const item = driverItems.find(i => i.textContent === driverId);
              if (item) {
                item.classList.remove('selected');
              }
              selectedDrivers = selectedDrivers.filter(d => d !== driverId);
              updateSelectedTokens();
              onSelectionChange(selectedDrivers);
            });

            token.appendChild(nameSpan);
            token.appendChild(removeBtn);
            selectedList.appendChild(token);

            selectedList.scrollTo({
              left: selectedList.scrollWidth,
              behavior: 'smooth'

            });
          });
        }
      }
    }

    //metric select
    function setupMetricSelect(state) {
      const metricSelect = document.getElementById('driver-metric');
      if (!metricSelect) {
        console.warn('No driver-metric element found');
        return;
      }
      metricSelect.innerHTML = '';
      state.metricOptions.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.value;
        opt.textContent = m.label;
        metricSelect.appendChild(opt);
      });
      metricSelect.value = state.metricOptions[0].value;
      state.selectedMetric = metricSelect.value;

      metricSelect.addEventListener('change', () => {
        state.selectedMetric = metricSelect.value;
        updateChart();
      });
    }

    //placeholder
    function displayPlaceholder(msg) {
      svg.selectAll('.placeholder-text').remove();
      svg.append('text')
        .attr('class', 'placeholder-text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ccc')
        .text(msg);
    }

    //fallback
    function createMockMetricsData() {
      const mockDrivers = ['Lewis Hamilton', 'Max Verstappen', 'Charles Leclerc', 'Sebastian Vettel'];
      const metrics = {
        championshipWins: {},
        raceWins: {},
        podiums: {},
        polePositions: {},
        championshipPoints: {},
        championshipPosition: {}
      };
      mockDrivers.forEach(d => {
        metrics.championshipWins[d] = {};
        metrics.raceWins[d] = {};
        metrics.podiums[d] = {};
        metrics.polePositions[d] = {};
        metrics.championshipPoints[d] = {};
        metrics.championshipPosition[d] = {};
        for (let year = 2010; year <= 2023; year++) {
          metrics.championshipWins[d][year] = Math.random() > 0.8 ? 1 : 0;
          metrics.raceWins[d][year] = Math.floor(Math.random() * 6);
          metrics.podiums[d][year] = Math.floor(Math.random() * 10);
          metrics.polePositions[d][year] = Math.floor(Math.random() * 3);
          metrics.championshipPoints[d][year] = Math.floor(Math.random() * 200);
          metrics.championshipPosition[d][year] = 1 + Math.floor(Math.random() * 20);
        }
      });
      return metrics;
    }
  }

  try {
    await initMetricsLineChart();
  } catch (error) {
    console.error('Chart initialization failed:', error);
  }
});
