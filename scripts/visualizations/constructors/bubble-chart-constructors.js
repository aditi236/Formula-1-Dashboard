// ----------------------------------------------------------------------
// 1) Main Function: initConstructorsBubbleChart
// ----------------------------------------------------------------------
async function initConstructorsBubbleChart(selector, data, initialMetric = "totalRaceWins") {
  // ----------------------------------------------------------------------
  // 1.1) Configuration Variables (Key values to adjust)
  // ----------------------------------------------------------------------
  const CONFIG = {
    fallbackWidth: 600,           // Fallback width (px) if container width is undefined
    containerHeight: 650,         // Fixed container height (px)
    fallbackHeight: 400,          // Fallback height (px) if container height is undefined
    minRadius: 35,                // Minimum bubble radius (px)
    maxRadiusRange: 180,          // Maximum range for bubble scaling (px)
    xForceStrength: 0.002,        // Force simulation strength in x-direction
    yForceStrength: 0.002,        // Force simulation strength in y-direction
    collisionPadding: 2,          // Padding for collision force (px)
    tooltipFadeIn: 200,           // Tooltip fade-in duration (ms)
    tooltipFadeOut: 500,          // Tooltip fade-out duration (ms)
    glowStdDeviation: 15,          // Standard deviation for the glow filter blur
    textFitMinFontSize: 6         // Minimum font size when fitting text inside bubbles
  };

  // ----------------------------------------------------------------------
  // 1.2) Select and Set Up the Chart Container
  // ----------------------------------------------------------------------
  const chartContainer = d3.select(selector)
    .html("")  // Clear any existing content
    .style("width", "100%")
    .style("height", CONFIG.containerHeight + "px")
    .style("position", "relative")
    .style("overflow", "visible");

  // Measure container dimensions (using fallback values if necessary)
  const rect = chartContainer.node().getBoundingClientRect();
  const width = rect.width || CONFIG.fallbackWidth;
  const height = rect.height || CONFIG.fallbackHeight;

  // ----------------------------------------------------------------------
  // 1.3) Set Up the Metric Dropdown (Already in HTML)
  // ----------------------------------------------------------------------
  const metricSelect = d3.select("#constructor-bubble-metric")
    .on("change", (event) => {
      updateMetric(event.target.value);
    });

  // Populate dropdown options
  metricSelect.selectAll("option")
    .data([
      { value: "totalRaceWins", label: "Race Wins" },
      { value: "totalChampionshipWins", label: "Championships" },
      { value: "totalPoints", label: "Total Points" }
    ])
    .join("option")
    .attr("value", d => d.value)
    .text(d => d.label);

  // Set initial metric
  let currentMetric = initialMetric;
  metricSelect.property("value", currentMetric);

  // ----------------------------------------------------------------------
  // 1.4) Create the SVG Element
  // ----------------------------------------------------------------------
  const svg = chartContainer.append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("position", "absolute")
    .style("top", 0)
    .style("left", 0);

  // ----------------------------------------------------------------------
  // 1.5) Load Data if Not Provided
  // ----------------------------------------------------------------------
  if (!data || !Array.isArray(data) || data.length === 0) {
    try {
      const csvData = await d3.csv("assets/data/f1db-constructors.csv");
      csvData.forEach(d => {
        d.totalRaceWins = +d.totalRaceWins || 0;
        d.totalChampionshipWins = +d.totalChampionshipWins || 0;
        d.totalPoints = +d.totalPoints || 0;
      });
      data = csvData;
    } catch (error) {
      console.error("Error loading fallback CSV:", error);
      data = [];
    }
  }

  if (!data.length) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .text("No data available.");
    return;
  }

  // ----------------------------------------------------------------------
  // 1.6) Create Node Objects from Data
  // ----------------------------------------------------------------------
  const nodes = data.map(d => ({
    constructorId: d.id,
    fullName: d.fullName,
    name: d.name,
    country: d.countryId,
    totalRaceWins: +d.totalRaceWins,
    totalChampionshipWins: +d.totalChampionshipWins,
    totalPoints: +d.totalPoints,
    radius: 0,
    x: Math.random() * width,
    y: Math.random() * height
  }));

  // ----------------------------------------------------------------------
  // 1.7) Create Color Scale Based on Constructor IDs
  // ----------------------------------------------------------------------

  // Create an array of unique constructor IDs from the nodes data.
  const uniqueIds = [...new Set(nodes.map(d => d.constructorId))];

  // ----------------------------------------------------------------------
  // Define Grid Parameters for HSL Colors
  // ----------------------------------------------------------------------
  // HUE_STEPS: Number of distinct hue slices over the full 360° range.
  // SAT_STEPS: Number of discrete saturation values.
  // LIG_STEPS: Number of discrete lightness values.
  const HUE_STEPS = 16;     // distinct "hue" slices
  const SAT_STEPS = 3;      // saturation steps
  const LIG_STEPS = 4;      // lightness steps

  // Define the minimum and maximum values for saturation and lightness.
  // These limits ensure the colors are neither too dull nor too bright.
  const SAT_MIN = 0.6;
  const SAT_MAX = 1.0;
  const LIG_MIN = 0.3;
  const LIG_MAX = 0.8;

  let allColors = [];

  // ----------------------------------------------------------------------
  // Build a Grid of HSL Colors
  // ----------------------------------------------------------------------
  // Loop over each hue, saturation, and lightness value to generate a full grid.
  for (let h = 0; h < HUE_STEPS; h++) {
    // Calculate the hue value evenly spaced over 0° to 360°.
    const hue = (h / HUE_STEPS) * 360;

    for (let s = 0; s < SAT_STEPS; s++) {
      // Interpolate saturation between SAT_MIN and SAT_MAX.
      const saturation = SAT_MIN + (s / (SAT_STEPS - 1)) * (SAT_MAX - SAT_MIN);

      for (let l = 0; l < LIG_STEPS; l++) {
        // Interpolate lightness between LIG_MIN and LIG_MAX.
        const lightness = LIG_MIN + (l / (LIG_STEPS - 1)) * (LIG_MAX - LIG_MIN);

        // Convert the HSL value to a hex color and add it to the allColors array.
        const color = d3.hsl(hue, saturation, lightness).formatHex();
        allColors.push(color);
      }
    }
  }

  // ----------------------------------------------------------------------
  // Select a Subset of Colors for the Scale
  // ----------------------------------------------------------------------
  // Slice out exactly 185 distinct colors from the generated grid.
  const colorRange = allColors.slice(0, 185);

  // ----------------------------------------------------------------------
  // Build the Ordinal Color Scale
  // ----------------------------------------------------------------------
  // Map each unique constructor ID to one of the 185 colors.
  const colorScale = d3.scaleOrdinal()
    .domain(uniqueIds)   // Domain: Unique constructor IDs.
    .range(colorRange);  // Range: The selected 185 colors.


  // ----------------------------------------------------------------------
  // 1.8) Create Glow Filter (Optional)
  // ----------------------------------------------------------------------
  const defs = svg.append("defs");
  const glowFilter = defs.append("filter")
    .attr("id", "glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");
  glowFilter.append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", CONFIG.glowStdDeviation)
    .attr("result", "blur");
  const feMerge = glowFilter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "blur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");

  // ----------------------------------------------------------------------
  // 1.9) Create Group Elements for Each Node
  // ----------------------------------------------------------------------
  const nodeSel = svg.selectAll("g.node")
    .data(nodes)
    .join("g")
    .attr("class", "node");

  // Append circles for each node
  const circles = nodeSel.append("circle")
    .attr("fill", d => colorScale(d.constructorId))
    .attr("fill-opacity", 0.85)
    .attr("stroke", "#333")
    .attr("stroke-width", 1);

  // Append text label for constructor name
  const nameLabel = nodeSel.append("text")
    .attr("class", "bubble-label-name")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.3em")
    .style("pointer-events", "none")
    .style("fill", "#fff")
    .style("font-weight", "bold");

  // Append text label for metric value
  const valueLabel = nodeSel.append("text")
    .attr("class", "bubble-label-value")
    .attr("text-anchor", "middle")
    .attr("dy", "1em")
    .style("pointer-events", "none")
    .style("fill", "#fff")
    .style("font-size", "10px");

  // ----------------------------------------------------------------------
  // 1.10) Initialize Tooltip for Bubble Chart
  // ----------------------------------------------------------------------
  const tooltipSel = d3.select("body").selectAll(".constructor-info-card").data([0]);
  const newTooltip = tooltipSel.enter()
    .append("div")
    .attr("class", "constructor-info-card")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("z-index", 9999)
    .style("pointer-events", "none")
    .style("background", "rgba(0,0,0,0.8)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "0.9rem");
  const mergedTooltip = tooltipSel.merge(newTooltip);

  // ----------------------------------------------------------------------
  // 1.11) Tooltip and Interaction Events for Circles
  // ----------------------------------------------------------------------
  circles
    .on("mouseover", function (event, d) {
      // Increase circle opacity on hover
      d3.select(this).attr("fill-opacity", 1);
      const tooltipHTML = `
        <div class="constructor-info-header">
          <h4>${d.fullName}</h4>
        </div>
        <div class="constructor-info-content">
          <p>Country: ${d.country || 'N/A'}</p>
          <p>Race Wins: ${d.totalRaceWins || 0}</p>
          <p>Championship Wins: ${d.totalChampionshipWins || 0}</p>
          <p>Total Points: ${d.totalPoints || 0}</p>
        </div>
      `;
      // Show tooltip with transition
      mergedTooltip
        .transition()
        .duration(CONFIG.tooltipFadeIn)
        .style("opacity", 1);
      mergedTooltip
        .html(tooltipHTML)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px")
        .style("box-shadow", `5px 5px 5px ${colorScale(d.constructorId)}`)
        .style("background", "#292929")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        // Reset opacity inline to let the transition work
        .style("opacity", "0");
    })
    .on("mousemove", function (event) {
      // Update tooltip position with mouse movement
      mergedTooltip
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill-opacity", 0.85);
      mergedTooltip
        .transition()
        .duration(CONFIG.tooltipFadeOut)
        .style("opacity", 0);
    })
    .on("click", function (event, d) {
      window.selectionManager.toggle(d.constructorId);
    });

  // ----------------------------------------------------------------------
  // 1.12) Subscribe to Global Selection Changes for Highlights
  // ----------------------------------------------------------------------
  window.selectionManager.subscribe(updateBubbleHighlights);
  function updateBubbleHighlights() {
    circles
      .attr("stroke", d => window.selectionManager.selection.includes(d.constructorId) ? "#fff" : "#333")
      .attr("stroke-width", d => window.selectionManager.selection.includes(d.constructorId) ? 3 : 1)
      .attr("fill-opacity", d => window.selectionManager.selection.includes(d.constructorId) ? 1 : 0.85)
      .attr("filter", d => window.selectionManager.selection.includes(d.constructorId) ? "url(#glow)" : null);
  }
  updateBubbleHighlights();

  // ----------------------------------------------------------------------
  // 1.13) Initialize Force Simulation for Bubble Layout
  // ----------------------------------------------------------------------
  const simulation = d3.forceSimulation(nodes)
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2).strength(CONFIG.xForceStrength))
    .force("y", d3.forceY(height / 2).strength(CONFIG.yForceStrength))
    .on("tick", ticked);

  function ticked() {
    nodeSel.each(d => {
      d.x = Math.max(d.radius, Math.min(width - d.radius, d.x));
      d.y = Math.max(d.radius, Math.min(height - d.radius, d.y));
    })
      .attr("transform", d => `translate(${d.x}, ${d.y})`);
  }

  // ----------------------------------------------------------------------
  // 1.14) Optional: Fit Text Labels Within Bubbles
  // ----------------------------------------------------------------------
  function fitTextToCircle(textSelection, radius, maxFontSize) {
    textSelection
      .style("display", null)
      .style("font-size", maxFontSize + "px");

    const node = textSelection.node();
    if (!node) return;

    let bbox = node.getBBox();
    let fontSize = maxFontSize;
    const diameter = 2 * radius - 10;

    while ((bbox.width > diameter || bbox.height > diameter) && fontSize > CONFIG.textFitMinFontSize) {
      fontSize--;
      textSelection.style("font-size", fontSize + "px");
      bbox = node.getBBox();
    }
    if (bbox.width > diameter || bbox.height > diameter) {
      textSelection.style("display", "none");
    }
  }

  // ----------------------------------------------------------------------
  // 1.15) Update Metric and Recalculate Bubble Sizes
  // ----------------------------------------------------------------------
  function updateMetric(newMetric) {
    currentMetric = newMetric;
    const maxVal = d3.max(nodes, d => +d[newMetric]) || 1;
    const scale = d3.scaleSqrt()
      .domain([0, maxVal])
      .range([0, CONFIG.maxRadiusRange]);

    // Update each node's radius based on the new metric
    nodeSel.each(d => {
      const val = +d[newMetric];
      if (newMetric === "totalPoints" && val < 50) {
        d.radius = 0;
      } else {
        d.radius = val === 0 ? 0 : Math.max(scale(val), CONFIG.minRadius);
      }
    });

    // Toggle node display based on metric values
    nodeSel.transition().duration(800)
      .style("display", d => {
        if (newMetric === "totalPoints") {
          return d.totalPoints < 50 ? "none" : null;
        } else {
          return d[newMetric] === 0 ? "none" : null;
        }
      });

    // Animate circles to their new radii and update labels
    circles.transition().duration(800)
      .attr("r", d => d.radius)
      .on("end", function (d) {
        const group = d3.select(this.parentNode);
        const nLabel = group.select(".bubble-label-name");
        const vLabel = group.select(".bubble-label-value");

        nLabel.text(d.name);
        vLabel.text(
          (newMetric === "totalPoints" && d.totalPoints < 50) || d[newMetric] === 0
            ? ""
            : d[newMetric]
        );

        fitTextToCircle(nLabel, d.radius, 18);
        fitTextToCircle(vLabel, d.radius, 14);
      });

    // Update collision force based on new radii and restart simulation
    simulation.force("collide", d3.forceCollide().radius(d => d.radius + CONFIG.collisionPadding).iterations(1));
    simulation.alpha(1).restart();
  }

  // ----------------------------------------------------------------------
  // 1.16) Initialize Visualization with the Current Metric
  // ----------------------------------------------------------------------
  updateMetric(currentMetric);
}
