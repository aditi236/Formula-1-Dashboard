/**
 * constructor-standings.js
 *
 * Donut chart for constructor points for the chosen race as per the user.
 * - Data from f1db-races-race-results.csv
 * - Filter by (year, round)
 * - Group by constructor => sum points, gather drivers
 * - Polylines and outside labels to reduce overlap
 * - Hover tooltip shows points + drivers
 * - Responsive sizing to ensure all content is visible
 */

async function drawConstructorStandings(raceData, containerSelector) {
    let raceResults = [];
    try {
        raceResults = await d3.csv("assets/data/f1db-races-race-results.csv");
    } catch (error) {
        console.error("[ConstructorStandings] Error loading CSV:", error);
        d3.select(containerSelector)
            .append("div")
            .attr("class", "placeholder-message")
            .text("Error loading constructor standings data.");
        return;
    }

    // 2) Filter for this race
    const filtered = raceResults.filter(
        d => +d.year === +raceData.year && +d.round === +raceData.round
    );
    if (!filtered.length) {
        d3.select(containerSelector)
            .append("div")
            .attr("class", "placeholder-message")
            .text("No constructor data available for this race.");
        return;
    }

    // 3) Group by constructor => sum points + gather drivers
    const constructorMap = d3.rollups(
        filtered,
        v => {
            const totalPoints = d3.sum(v, d => +d.points || 0);
            const driversSet = new Set(v.map(d => d.driverName || d.driverId));
            return {
                totalPoints,
                drivers: [...driversSet]
            };
        },
        d => d.constructorName || d.constructorId
    );

    // Flatten for the donut
    const data = constructorMap.map(([name, info]) => ({
        constructor: (name || "Unknown").replace(/-/g, " "),
        points: info.totalPoints > 0 ? info.totalPoints : 0.5,
        originalPoints: info.totalPoints,
        drivers: info.drivers
    }));

    // 4) Clear + wrapper
    d3.select(containerSelector).selectAll("*").remove();

    const containerWidth = d3.select(containerSelector).node().getBoundingClientRect().width;
    const wrapperWidth = Math.min(1000, containerWidth);

    // Wrapper with dynamic width
    const wrapper = d3.select(containerSelector)
        .append("div")
        .attr("class", "constructor-standings-wrapper")
        .style("width", "100%")
        .style("max-width", "100%")
        .style("margin", "0")
        .style("text-align", "center")
        .style("background", "#111")
        .style("border-radius", "4px")
        .style("padding", "0")
        .style("overflow", "hidden")
        .style("box-shadow", "0 4px 8px rgba(0,0,0,0.5)");

    // 5) Title
    wrapper.append("div")
        .style("color", "#fff")
        .style("font-size", "1.6rem")
        .style("font-weight", "bold")
        .style("padding", "12px 0")
        .style("background", "#222")
        .style("border-radius", "4px 4px 0 0")
        .style("margin-bottom", "0")
        .style("border-bottom", "2px solid #333")
        .text("Constructor Standings");

    // 6) Dimensions for the SVG 
    const svgWidth = Math.min(700, containerWidth);
    const svgHeight = svgWidth;
    const margin = svgWidth * 0.05;
    const radius = Math.min(svgWidth, svgHeight) / 2 - margin;

    const svg = wrapper.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .style("background", "linear-gradient(to bottom, #000000, #1a1a1a)")
        .style("display", "block")
        .style("margin", "0 auto") // Center the SVG
        .style("width", "100%"); // Fill the container width

    // Center group
    const g = svg.append("g")
        .attr("transform", `translate(${svgWidth / 2}, ${svgHeight / 2})`);

    // 7) Tooltip
    const tooltip = d3.select("body").selectAll(".constructor-tooltip").data([0]);
    const tooltipEnter = tooltip.enter()
        .append("div")
        .attr("class", "constructor-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "#222")
        .style("color", "#fff")
        .style("padding", "6px 8px")
        .style("border-radius", "4px")
        .style("box-shadow", "0 2px 6px rgba(0,0,0,0.5)")
        .style("opacity", 0);
    const mergedTooltip = tooltip.merge(tooltipEnter);

    // 8) Pie + Arc
    const pie = d3.pie()
        .value(d => d.points)
        .sort(null);

    // Donut thickness: ~50% hole
    const arc = d3.arc()
        .innerRadius(radius * 0.5)
        .outerRadius(radius);

    // Label arc: place labels just outside the donut
    const labelArc = d3.arc()
        .innerRadius(radius * 1.05)
        .outerRadius(radius * 1.05);

    // 9) Color
    const color = d3.scaleOrdinal(d3.schemeSet2);

    // 10) Draw arcs
    const arcs = g.selectAll(".arc")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("class", "arc")
        .attr("fill", d => color(d.data.constructor))
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .each(function (d) {
            this._current = { startAngle: 0, endAngle: 0 };
        })
        .on("mouseover", function (event, d) {
            const driverList = d.data.drivers.join(", ");
            const pointsDisplay = d.data.originalPoints || 0;
            mergedTooltip
                .style("opacity", 1)
                .html(`
                <strong>${d.data.constructor}</strong><br/>
                Points: ${pointsDisplay}<br/>
                Drivers: ${driverList}
                `);
        })
        .on("mousemove", function (event) {
            mergedTooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
            mergedTooltip.style("opacity", 0);
        });

    // Animate arcs
    arcs.transition()
        .duration(3000)
        .attrTween("d", function (d) {
            const i = d3.interpolate(this._current, d);
            this._current = i(0);
            return t => arc(i(t));
        });

    const legendGroup = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${svgWidth / 2}, ${svgHeight - 20})`);

    // THe legend below the donut chart 
    const legendContainer = wrapper.append("div")
        .attr("class", "legend-container")
        .style("display", "flex")
        .style("flex-wrap", "wrap")
        .style("justify-content", "center")
        .style("padding", "10px 10px 20px 10px")
        .style("gap", "10px")
        .style("background", "#111")
        .style("width", "100%");

    data.forEach((d, i) => {
        const legendItem = legendContainer.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("margin", "5px");

        legendItem.append("div")
            .style("width", "12px")
            .style("height", "12px")
            .style("background-color", color(d.constructor))
            .style("margin-right", "5px");

        legendItem.append("div")
            .style("color", "#fff")
            .style("font-size", "12px")
            .text(`${d.constructor} (${d.originalPoints || 0})`);
    });
}