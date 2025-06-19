/**
 * driver-standings.js
 *
 * A responsive horizontal bar chart for Driver Standings.
 * - Data from f1db-races-race-results.csv
 * - Filter by (year, round) 
 * - Uses constructor colors from the donut chart to match the driver <> constructor relation. 
 */

async function drawDriverStandings(raceData, containerSelector) {
    let raceResults = [], constructorsData = [];
    try {
        [raceResults, constructorsData] = await Promise.all([
            d3.csv("assets/data/f1db-races-race-results.csv"),
            d3.csv("assets/data/f1db-constructors.csv")
        ]);
    } catch (error) {
        console.error("[DriverStandings] Error loading CSV:", error);
        d3.select(containerSelector)
            .append("div")
            .attr("class", "placeholder-message")
            .text("Error loading driver standings data.");
        return;
    }

    // 2) Filter for selected race (year + round)
    const filtered = raceResults.filter(d =>
        +d.year === +raceData.year && +d.round === +raceData.round
    );
    if (!filtered.length) {
        d3.select(containerSelector)
            .append("div")
            .attr("class", "placeholder-message")
            .text("No driver standings data available for this race.");
        return;
    }

    // 3) Sort by finishing position (positionDisplayOrder in te dataset)
    const sorted = filtered.sort((a, b) => +a.positionDisplayOrder - +b.positionDisplayOrder);

    // 4) Prepare data fields
    sorted.forEach(d => {
        // Driver name
        if (d.driverName) {
            d.displayName = d.driverName.trim();
        } else if (d.driverId) {
            d.displayName = d.driverId
                .split("-")
                .map(str => str.charAt(0).toUpperCase() + str.slice(1))
                .join(" ");
        } else {
            d.displayName = "Unknown";
        }
        // Position fallback
        d.positionDisplayOrder = d.positionDisplayOrder || "N/A";
        // Numeric points
        d.points = +d.points || 0;
        // Constructor ID for color matching
        d.constructorId = d.constructorId || "";
        d.constructorName = d.constructorName || d.constructorId || "";
    });

    // 5) Clear container
    d3.select(containerSelector).selectAll("*").remove();

    // 6) Main wrapper
    const wrapper = d3.select(containerSelector)
        .append("div")
        .attr("class", "driver-standings-wrapper")
        .style("width", "100%")
        .style("max-width", "100%")
        .style("margin", "0")
        .style("text-align", "center")
        .style("background", "#111")
        .style("border-radius", "4px")
        .style("padding", "0")
        .style("overflow", "hidden")
        .style("box-shadow", "0 4px 8px rgba(0,0,0,0.5)");

    // 7) Title bar
    wrapper.append("div")
        .style("color", "#fff")
        .style("font-size", "1.6rem")
        .style("font-weight", "bold")
        .style("padding", "12px 0")
        .style("background", "#222")
        .style("border-radius", "4px 4px 0 0")
        .style("margin-bottom", "0")
        .style("border-bottom", "2px solid #333")
        .text("Driver Standings");

    const containerWidth = d3.select(containerSelector).node().getBoundingClientRect().width;

    const svgWidth = Math.min(700, containerWidth);
    const svgHeight = Math.max(svgWidth, 640);

    // 9) Create the SVG
    const svg = wrapper.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .style("background", "linear-gradient(to bottom, #000000, #1a1a1a)")
        .style("display", "block")
        .style("margin", "0 auto")
        .style("width", "100%")
        .style("min-height", "640px");

    // 10) Calculate better margins based on driver names    
    const longestName = sorted.reduce((max, d) =>
        d.displayName.length > max.length ? d.displayName : max, "");

    const leftMargin = Math.max(120, longestName.length * 8);

    const margin = {
        top: 20,
        right: 20,
        bottom: 40,
        left: leftMargin + 10
    };
    const chartWidth = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;

    // 11) Chart group
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 12) Scales
    const xMax = d3.max(sorted, d => d.points) || 25; // Minimum scale of 25 for better visuals
    const xScale = d3.scaleLinear()
        .domain([0, xMax])
        .range([0, chartWidth])
        .nice();

    const yScale = d3.scaleBand()
        .domain(sorted.map(d => d.displayName))
        .range([0, chartHeight])
        .padding(0.2);

    // 13) Axes
    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale);

    // X-axis group
    g.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(xAxis)
        .call(g => {
            g.selectAll("path").attr("stroke", "#444");
            g.selectAll(".tick line").attr("stroke", "#444");
            g.selectAll("text")
                .attr("fill", "#fff")
                .style("font-size", "12px");
        });

    // Y-axis group
    g.append("g")
        .call(yAxis)
        .call(g => {
            g.selectAll("path").attr("stroke", "#444");
            g.selectAll(".tick line").attr("stroke", "none");
            g.selectAll("text")
                .attr("fill", "#fff")
                .style("font-size", "12px");
        });

    // 14) Color scale matching constructor donut chart
    const colorScale = d3.scaleOrdinal(d3.schemeSet2);

    // 15) Bars
    const bars = g.selectAll(".driver-bar")
        .data(sorted)
        .enter()
        .append("rect")
        .attr("class", "driver-bar")
        .attr("y", d => yScale(d.displayName))
        .attr("x", 0)
        .attr("height", yScale.bandwidth())
        .attr("width", 0) // animate from 0
        .attr("fill", d => {
            // Only color top 10 positions (those with points)
            const position = +d.positionDisplayOrder;
            if (position <= 10 && d.points > 0) {
                // Use same color as constructor donut chart
                return colorScale(d.constructorName.replace(/-/g, " "));
            } else {
                // Use a neutral gray for all drivers outside points
                return "#555555";
            }
        });

    // 16) Labels: "P{positionDisplayOrder} - {points} pts"
    const labels = g.selectAll(".driver-label")
        .data(sorted)
        .enter()
        .append("text")
        .attr("class", "driver-label")
        .attr("y", d => yScale(d.displayName) + yScale.bandwidth() / 2)
        .attr("x", 5)
        .attr("fill", "#fff")
        .attr("dy", "0.35em")
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .style("opacity", 0)
        .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.8)")
        .text(d => `P${d.positionDisplayOrder} - ${d.points} pts`);

    // 17) Animate
    bars.transition()
        .duration(3000)
        .attr("width", d => xScale(d.points || 0.5));

    labels.transition()
        .delay(800)
        .duration(1200)
        .style("opacity", 1);
}