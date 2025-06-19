// ----------------------------------------------------------------------
// 1) Helper Function: arraysEqual
// ----------------------------------------------------------------------
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ----------------------------------------------------------------------
// 2) Main Function: initConstructorsLineChart
// ----------------------------------------------------------------------
/**
 * Initializes the line chart visualization for constructors.
 *
 * @param {string} selector - CSS selector for the container element.
 * @param {Array} allConstructors - Array of constructor objects.
 * @param {Array} seasonConstructorStandingsData - Season-by-season standings data.
 * @param {Array} raceResultsAggregatedData - Aggregated race results data (race wins, podiums, pole positions) per constructor per year.
 */
function initConstructorsLineChart(selector, allConstructors, seasonConstructorStandingsData, raceResultsAggregatedData) {
  // ----------------------------------------------------------------------
  // 2.1) Configuration Variables (Key values to adjust)
  // ----------------------------------------------------------------------
  const CONFIG = {
    fallbackWidth: 600,           // Fallback container width in pixels
    containerHeight: 650,         // Fixed container height in pixels
    margin: { top: 30, right: 220, bottom: 80, left: 100 },
    tooltipFadeIn: 200,           // Tooltip fade-in duration (ms)
    tooltipFadeOut: 500,          // Tooltip fade-out duration (ms)
    placeholderFontSize: "16px",  // Font size for placeholder text
    xAxisFontSize: "18px",        // Font size for X-axis label
    yAxisFontSize: "18px"         // Font size for Y-axis label
  };

  // ----------------------------------------------------------------------
  // 2.2) Select and Clear the Container, Set Dimensions
  // ----------------------------------------------------------------------
  const container = d3.select(selector).html("");
  const rect = container.node().getBoundingClientRect();
  let width = rect.width || CONFIG.fallbackWidth,
    height = CONFIG.containerHeight;

  // ----------------------------------------------------------------------
  // 2.3) Get the Header Container for Controls
  // ----------------------------------------------------------------------
  const headerContainer = d3.select("#constructors-line-chart-header");

  // ----------------------------------------------------------------------
  // 2.4) Prepare Data and Global Selection
  // ----------------------------------------------------------------------
  const constructorsData = allConstructors;
  let selectedConstructorIds = window.selectionManager ? window.selectionManager.selection.slice() : [];

  // ----------------------------------------------------------------------
  // 2.5) Create a Color Scale Using a Custom HSL Grid
  // ----------------------------------------------------------------------
  const HUE_STEPS = 16;     // distinct "hue" slices
  const SAT_STEPS = 3;      // saturation steps
  const LIG_STEPS = 4;      // lightness steps

  const SAT_MIN = 0.6;
  const SAT_MAX = 1.0;
  const LIG_MIN = 0.3;
  const LIG_MAX = 0.8;

  let allColors = [];
  for (let h = 0; h < HUE_STEPS; h++) {
    const hue = (h / HUE_STEPS) * 360;
    for (let s = 0; s < SAT_STEPS; s++) {
      const saturation = SAT_MIN + (s / (SAT_STEPS - 1)) * (SAT_MAX - SAT_MIN);
      for (let l = 0; l < LIG_STEPS; l++) {
        const lightness = LIG_MIN + (l / (LIG_STEPS - 1)) * (LIG_MAX - LIG_MIN);
        const color = d3.hsl(hue, saturation, lightness).formatHex();
        allColors.push(color);
      }
    }
  }

  const colorRange = allColors.slice(0, 185);
  const colorScale = d3.scaleOrdinal()
    .domain(constructorsData.map(d => d.id))
    .range(colorRange);

  // ----------------------------------------------------------------------
  // 2.6) Setup Constructor Dropdown (Searchable Multi-Select)
  // ----------------------------------------------------------------------
  setupConstructorDropdown(
    constructorsData.map(d => d.id),
    (newSelection) => {
      window.selectionManager.setSelection(newSelection);
      updateChart();
    },
    { maxConstructors: 5 }
  );

  // ----------------------------------------------------------------------
  // 2.7) Listen for External Selection Changes
  // ----------------------------------------------------------------------
  if (window.selectionManager) {
    window.selectionManager.subscribe((newSel) => {
      if (!arraysEqual(newSel, selectedConstructorIds)) {
        selectedConstructorIds = newSel.slice();
        updateConstructorTokens();
        updateChart();
      }
    });
  }

  // ----------------------------------------------------------------------
  // 2.8) Set Up Metric Dropdown in Header
  // ----------------------------------------------------------------------
  const metricSelect = headerContainer.select("#constructor-metric");
  metricSelect.selectAll("option")
    .data([
      { value: "points", label: "Points" },
      { value: "positionNumber", label: "Championship Position" },
      { value: "raceWins", label: "Race Wins" },
      { value: "podiums", label: "Podiums" },
      { value: "polePositions", label: "Pole Positions" }
    ])
    .join("option")
    .attr("value", d => d.value)
    .text(d => d.label);
  metricSelect.property("value", "points");
  metricSelect.on("change", () => updateChart());

  // ----------------------------------------------------------------------
  // 2.9) Set Up the SVG and Chart Group (with Margins)
  // ----------------------------------------------------------------------
  const margin = CONFIG.margin;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // ----------------------------------------------------------------------
  // 2.10) Create Axis Groups and Labels
  // ----------------------------------------------------------------------
  const xAxisG = g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${chartHeight})`);
  const yAxisG = g.append("g").attr("class", "y-axis");

  g.append("text")
    .attr("class", "x-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 50)
    .attr("text-anchor", "middle")
    .style("fill", "#fff")
    .style("font-size", CONFIG.xAxisFontSize)
    .text("Years");

  const yLabel = g.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -chartHeight / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .style("fill", "#fff")
    .style("font-size", CONFIG.yAxisFontSize)
    .text("Points");

  // ----------------------------------------------------------------------
  // 2.11) Initialize Tooltip for the Line Chart
  // ----------------------------------------------------------------------
  const tooltip = d3.select("body").selectAll(".linechart-tooltip").data([0]);
  const tooltipEnter = tooltip.enter()
    .append("div")
    .attr("class", "linechart-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("font-size", "0.9rem")
    .style("opacity", 0);
  const mergedTooltip = tooltip.merge(tooltipEnter);

  let prevYScale = null;

  // ----------------------------------------------------------------------
  // Helper Function: getMetricLabelAndValue
  // ----------------------------------------------------------------------
  /**
   * Given the data object and the chosen metric, returns an object
   * with { label, value } for the tooltip.
   */
  function getMetricLabelAndValue(d, chosenMetric) {
    switch (chosenMetric) {
      case "positionNumber":
        return { label: "Position", value: d.positionNumber };
      case "points":
        return { label: "Points", value: d.points };
      case "raceWins":
        return { label: "Race Wins", value: d.raceWins };
      case "podiums":
        return { label: "Podiums", value: d.podiums };
      case "polePositions":
        return { label: "Pole Positions", value: d.polePositions };
      default:
        return { label: "Unknown Metric", value: "N/A" };
    }
  }

  // ----------------------------------------------------------------------
  // 2.12) Define the updateChart Function
  // ----------------------------------------------------------------------
  function updateChart() {
    selectedConstructorIds = window.selectionManager ? window.selectionManager.selection.slice() : [];
    const chosenMetric = metricSelect.property("value");
    console.log("Currently chosen metric is:", chosenMetric);

    // ------------------- NO SELECTION CASE -------------------
    if (!selectedConstructorIds.length) {
      g.selectAll(".constructor-line").remove();
      g.selectAll(".constructor-circle").remove();
      g.selectAll(".constructor-legend").remove();
      g.selectAll(".placeholder-text").remove();

      const xScaleEmpty = d3.scaleLinear().domain([0, 1]).range([0, chartWidth]);
      const yScaleEmpty = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0]);
      const xAxisEmpty = d3.axisBottom(xScaleEmpty).tickValues([]).tickSize(0);
      const yAxisEmpty = d3.axisLeft(yScaleEmpty).tickValues([]).tickSize(0);

      xAxisG.call(xAxisEmpty);
      yAxisG.call(yAxisEmpty);

      g.append("text")
        .attr("class", "placeholder-text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#ccc")
        .style("font-size", CONFIG.placeholderFontSize)
        .text("Select Constructor(s) to Display Statistics");
      return;
    }

    // ------------------- DETERMINE DATA BASED ON METRIC -------------------
    let dataToUse;
    if (chosenMetric === "points" || chosenMetric === "positionNumber") {
      dataToUse = seasonConstructorStandingsData;
    } else {
      dataToUse = raceResultsAggregatedData;
    }

    g.selectAll(".placeholder-text").remove();

    // Convert data to numeric + handle missing fields
    const filtered = dataToUse
      .filter(d => selectedConstructorIds.includes(d.constructorId))
      .map(d => ({
        constructorId: d.constructorId,
        year: +d.year,
        points: +d.points || 0,
        positionNumber: +d.positionNumber > 0 ? +d.positionNumber : 13,
        raceWins: d.raceWins || 0,
        podiums: d.podiums || 0,
        polePositions: d.polePositions || 0
      }));

    if (!filtered.length) {
      g.selectAll(".constructor-line").remove();
      g.selectAll(".constructor-circle").remove();
      g.selectAll(".constructor-legend").remove();
      return;
    }

    const grouped = d3.groups(filtered, d => d.constructorId);
    const minYear = d3.min(filtered, d => d.year);
    const maxYear = d3.max(filtered, d => d.year);

    const xScale = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, chartWidth]);

    let yScale;
    if (chosenMetric === "positionNumber") {
      const maxPos = d3.max(filtered, d => d.positionNumber) || 13;
      yScale = d3.scaleLinear()
        .domain([maxPos, 1])
        .range([chartHeight, 0])
        .nice();
      yLabel.text("Championship Position");
    } else if (chosenMetric === "points") {
      const maxPoints = d3.max(filtered, d => d.points) || 0;
      yScale = d3.scaleLinear()
        .domain([0, maxPoints])
        .range([chartHeight, 0])
        .nice();
      yLabel.text("Points");
    } else if (chosenMetric === "raceWins") {
      const maxWins = d3.max(filtered, d => d.raceWins) || 0;
      yScale = d3.scaleLinear()
        .domain([0, maxWins])
        .range([chartHeight, 0])
        .nice();
      yLabel.text("Race Wins");
    } else if (chosenMetric === "podiums") {
      const maxPodiums = d3.max(filtered, d => d.podiums) || 0;
      yScale = d3.scaleLinear()
        .domain([0, maxPodiums])
        .range([chartHeight, 0])
        .nice();
      yLabel.text("Podiums");
    } else if (chosenMetric === "polePositions") {
      const maxPoles = d3.max(filtered, d => d.polePositions) || 0;
      yScale = d3.scaleLinear()
        .domain([0, maxPoles])
        .range([chartHeight, 0])
        .nice();
      yLabel.text("Pole Positions");
    }

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(yScale);
    xAxisG.transition().duration(1000).call(xAxis);
    yAxisG.transition().duration(1000).call(yAxis);

    const lineGen = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d[chosenMetric]))
      .curve(d3.curveMonotoneX);

    const lines = g.selectAll(".constructor-line")
      .data(grouped, d => d[0]);

    lines.exit().remove();

    const linesEnter = lines.enter().append("path")
      .attr("class", "constructor-line")
      .attr("fill", "none")
      .attr("stroke", d => colorScale(d[0]))
      .attr("stroke-width", 4)
      .style("stroke-opacity", 0)
      .attr("d", d => {
        if (!prevYScale) {
          return lineGen(d[1].map(r => ({ ...r, [chosenMetric]: 0 })));
        } else {
          return d3.line()
            .x(r => xScale(r.year))
            .y(r => prevYScale(r[chosenMetric]))
            .curve(d3.curveMonotoneX)(d[1]);
        }
      });

    linesEnter.merge(lines)
      .transition().duration(1000)
      .style("stroke-opacity", 1)
      .attr("d", d => lineGen(d[1]));

    // 1) Create or update the circles:
    const circles = g.selectAll(".constructor-circle")
      .data(
        grouped.flatMap(d => d[1].map(pt => ({ ...pt, _cid: d[0] }))),
        d => d.constructorId + "-" + d.year
      );

    circles.exit()
      .transition()
      .duration(1000)
      .attr("cy", chartHeight)
      .style("opacity", 0)
      .remove();

    // 2) circlesEnter for newly added circles:
    const circlesEnter = circles.enter()
      .append("circle")
      .attr("class", "constructor-circle")
      .attr("r", 6)
      .attr("fill", d => colorScale(d._cid))
      .attr("cx", d => xScale(d.year))
      .attr("cy", d => (!prevYScale ? chartHeight : prevYScale(d[chosenMetric])))
      .style("opacity", 0);

    // 3) Now merge so we can apply transitions AND events to ALL circles:
    const circlesAll = circlesEnter.merge(circles);

    // 4) Re-bind event listeners on BOTH new and existing circles:
    circlesAll
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", 5);

        // Grab constructor info
        const cdata = allConstructors.find(tc => tc.id === d.constructorId);
        const fullName = cdata ? cdata.fullName : d.constructorId;
        const country = cdata ? cdata.countryId : "N/A";

        // Dynamically get the metric label + value
        const { label, value } = getMetricLabelAndValue(d, chosenMetric);

        // Build the tooltip
        const tooltipHTML = `
    <div style="font-weight:600; margin-bottom:4px;">
      ${fullName}
    </div>
    <div>Year: ${d.year}</div>
    <div>Country of Origin: ${country}</div>
    <div>${label}: ${value}</div>
  `;

        mergedTooltip
          .transition()
          .duration(CONFIG.tooltipFadeIn)
          .style("opacity", 1);

        mergedTooltip
          .html(tooltipHTML)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px")
          .style("box-shadow", `5px 5px 5px ${colorScale(d._cid)}`)
          .style("background", "#292929")
          .style("color", "#fff")
          .style("padding", "6px 10px")
          .style("border-radius", "4px");
      })
      .on("mousemove", function (event) {
        mergedTooltip
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("r", 3);
        mergedTooltip
          .transition()
          .duration(CONFIG.tooltipFadeOut)
          .style("opacity", 0)

      });

    // 5) Apply transitions to all circles:
    circlesAll
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .attr("cx", d => xScale(d.year))
      .attr("cy", d => yScale(d[chosenMetric]));


    prevYScale = yScale;

    g.selectAll(".constructor-legend").remove();
    const legendGroup = g.append("g")
      .attr("class", "constructor-legend")
      .attr("transform", `translate(${chartWidth + 20}, 0)`);

    grouped.forEach((arr, i) => {
      const constructorId = arr[0];
      const legendRow = legendGroup.append("g")
        .attr("transform", `translate(0, ${i * 25})`);

      legendRow.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", colorScale(constructorId));

      legendRow.append("text")
        .attr("x", 24)
        .attr("y", 14)
        .attr("fill", "#fff")
        .style("font-size", "13px")
        .text(constructorId);
    });
  }

  // ----------------------------------------------------------------------
  // 2.13) Initialize Chart Rendering
  // ----------------------------------------------------------------------
  updateChart();

  // ----------------------------------------------------------------------
  // 2.14) Setup Constructor Dropdown Logic (Like Driver Selection)
  // ----------------------------------------------------------------------
  function setupConstructorDropdown(constructorsArray, onSelectionChange, config) {
    const maxConstructors = config?.maxConstructors ?? 6;
    const containerEl = document.getElementById("constructor-select-container");
    const headerEl = document.getElementById("constructor-select-header");
    const dropdownEl = document.getElementById("constructor-dropdown");
    const searchInputEl = document.getElementById("constructor-search");
    const listEl = document.getElementById("constructor-list");
    const selectedListEl = document.getElementById("constructor-selected-list");

    if (!containerEl || !headerEl || !dropdownEl || !searchInputEl || !listEl || !selectedListEl) {
      console.warn("Some constructor dropdown elements not found.");
      return;
    }

    let isOpen = false;

    if (!window.selectionManager) {
      window.selectionManager = new SelectionManager([]);
    }

    headerEl.addEventListener("click", () => {
      isOpen = !isOpen;
      dropdownEl.classList.toggle("open", isOpen);
    });

    document.addEventListener("click", (e) => {
      if (!containerEl.contains(e.target)) {
        isOpen = false;
        dropdownEl.classList.remove("open");
      }
    });

    const constructorItems = constructorsArray.map(constructorId => {
      const wrapper = document.createElement("div");
      wrapper.className = "driver-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = constructorId;

      const label = document.createElement("label");
      label.textContent = constructorId;

      if (window.selectionManager.selection.includes(constructorId)) {
        checkbox.checked = true;
      }

      checkbox.addEventListener("change", () => {
        let currentSelection = window.selectionManager.selection.slice();
        if (checkbox.checked) {
          if (!currentSelection.includes(constructorId)) {
            if (currentSelection.length >= maxConstructors) {
              alert("You can only select up to " + maxConstructors + " constructors.");
              checkbox.checked = false;
              return;
            }
            currentSelection.push(constructorId);
          }
        } else {
          currentSelection = currentSelection.filter(d => d !== constructorId);
        }
        window.selectionManager.setSelection(currentSelection);
        onSelectionChange(currentSelection);
        updateConstructorTokens();
      });

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      return wrapper;
    });

    constructorItems.forEach(item => listEl.appendChild(item));

    searchInputEl.addEventListener("input", () => {
      const query = searchInputEl.value.toLowerCase();
      constructorItems.forEach(item => {
        const cid = item.querySelector("input").value.toLowerCase();
        item.style.display = cid.includes(query) ? "" : "none";
      });
    });

    function updateConstructorTokens() {
      const currentSelection = window.selectionManager.selection.slice();
      selectedListEl.innerHTML = "";
      if (currentSelection.length === 0) {
        const placeholder = document.createElement("span");
        placeholder.className = "placeholder-text";
        placeholder.textContent = "Select Constructor(s)";
        selectedListEl.appendChild(placeholder);
      } else {
        currentSelection.forEach(constructorId => {
          const token = document.createElement("span");
          token.className = "driver-token";
          token.textContent = constructorId;

          const removeBtn = document.createElement("span");
          removeBtn.className = "remove-token";
          removeBtn.textContent = "×";
          removeBtn.addEventListener("click", () => {
            const item = constructorItems.find(i => i.querySelector("input").value === constructorId);
            if (item) {
              const cb = item.querySelector("input[type='checkbox']");
              if (cb) cb.checked = false;
            }
            let current = window.selectionManager.selection.slice();
            current = current.filter(d => d !== constructorId);
            window.selectionManager.setSelection(current);
            updateConstructorTokens();
            onSelectionChange(current);
          });

          token.appendChild(removeBtn);
          selectedListEl.appendChild(token);
        });
      }
    }

    updateConstructorTokens();
  }

  // ----------------------------------------------------------------------
  // 2.15) Update Tokens When Selection Changes Externally
  // ----------------------------------------------------------------------
  function updateConstructorTokens() {
    let localSelected = window.selectionManager ? window.selectionManager.selection.slice() : [];
    const listEl = document.getElementById("constructor-list");
    if (!listEl) return;

    const items = listEl.querySelectorAll(".driver-item input[type='checkbox']");
    items.forEach(cb => {
      cb.checked = localSelected.includes(cb.value);
    });

    const selectedListEl = document.getElementById("constructor-selected-list");
    if (!selectedListEl) return;
    selectedListEl.innerHTML = "";

    if (localSelected.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "placeholder-text";
      placeholder.textContent = "Select Constructor(s)";
      selectedListEl.appendChild(placeholder);
    } else {
      localSelected.forEach(constructorId => {
        const token = document.createElement("span");
        token.className = "driver-token";
        token.textContent = constructorId;

        const removeBtn = document.createElement("span");
        removeBtn.className = "remove-token";
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", () => {
          const item = Array.from(items).find(i => i.value === constructorId);
          if (item) {
            item.checked = false;
          }
          localSelected = localSelected.filter(d => d !== constructorId);
          if (window.selectionManager) {
            window.selectionManager.setSelection(localSelected);
          }
          updateConstructorTokens();
          updateChart();
        });

        token.appendChild(removeBtn);
        selectedListEl.appendChild(token);
      });
    }
  }
}
