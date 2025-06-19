'use strict';

async function initEnginesVisualization(selector) {
    try {
        // Load dataset
        const data = await d3.csv("assets/data/Top_5_Engine_Manufacturers.csv");

        // Process data
        //returns data for top-5 manufacturers based on sustainability score or totalRaceWins
        function getTop5Manufacturers(metric) {
            return data
                .map(d => ({
                    name: d.name,
                    raceWins: +d.totalRaceWins || 0,
                    capacityScore: +d.capacity_score || 0,
                    configScore: +d.config_score || 0,
                    aspirationScore: +d.aspiration_score || 0,
                    sustainabilityScore: +d.final_sustainability_score || 0
                }))
                .sort((a, b) => b[metric] - a[metric]) // Sort based on the selected metric
                .slice(0, 5); // Get top 5
        }


        // Set dimensions
        const container = d3.select(selector).node().getBoundingClientRect();
        const margin = { top: 40, right: 50, bottom: 80, left: 80 };
        const width = container.width - margin.left - margin.right;
        const height = 700 - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(selector)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);


        //total race wins chart
        const customColors = ["#EB3510", "#F97F2A", "#FFCD04", "#2994C1", "#F9E2D7"];



        const colorScale = d3.scaleOrdinal(customColors);


        // Function to update chart
        function updateChart(metric) {
            //gathers data for new metric
            const top5Manufacturers = getTop5Manufacturers(metric);
            //sorts ranking for dynamic updates
            top5Manufacturers.sort((a, b) => {
                return metric === "totalRaceWins"
                    ? b.raceWins - a.raceWins  // Sort by Race Wins
                    : b.sustainabilityScore - a.sustainabilityScore; // Sort by Sustainability
            });
            // Remove previous elements
            svg.selectAll(".bar, .group-bar, .sustainability-bar").remove();
            svg.selectAll(".y-axis").remove();
            svg.selectAll(".x-axis").remove();
            svg.selectAll(".legend").remove();

            // Adjust Y-axis range
            let yMax = (metric === "totalRaceWins") ?
                d3.max(top5Manufacturers, d => d.raceWins) : 3.5;  // Limit sustainability to 3

            // X Scale
            const xScale = d3.scaleBand()
                .domain(top5Manufacturers.map(d => d.name))
                .range([0, width])
                .padding(0.5);

            const yScale = d3.scaleLinear()
                .domain([0, yMax])
                .nice()
                .range([height, 0]);


            // Add new Y-axis
            svg.append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(yScale).ticks(5));

            // Add X-axis if not present
            if (svg.select(".x-axis").empty()) {
                svg.append("g")
                    .attr("class", "x-axis")
                    .attr("transform", `translate(0,${height})`)
                    .call(d3.axisBottom(xScale))
                    .selectAll("text")
                    .attr("transform", "rotate(-20)")
                    .style("text-anchor", "end");
            }

            // Add X-axis label
            svg.select(".axis-label-x").remove();
            svg.append("text")
                .attr("class", "axis-label-x")
                .attr("x", width / 2)
                .attr("y", height + margin.bottom - 10)
                .attr("text-anchor", "middle")
                .text("Engine Manufacturer");

            // Add Y-axis label
            svg.select(".axis-label-y").remove();
            svg.append("text")
                .attr("class", "axis-label-y")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -margin.left + 20)
                .attr("text-anchor", "middle")
                .text(metric === "totalRaceWins" ? "Total Race Wins" : "Sustainability Score");

            if (metric === "totalRaceWins") {
                // Normal Bar Chart for Race Wins
                svg.selectAll(".bar")
                    .data(top5Manufacturers)
                    .enter()
                    .append("rect")
                    .attr("class", "bar")
                    .attr("x", d => xScale(d.name))
                    .attr("y", height) // Start from bottom of the bar
                    .attr("width", xScale.bandwidth())

                    .attr("height", 0)
                    .attr("fill", (d, i) => colorScale(i))
                    .transition()
                    .duration(2000)
                    .ease(d3.easeCubicOut)
                    .attr("y", d => yScale(d.raceWins)) // Move up to final position
                    .attr("height", d => height - yScale(d.raceWins)); // Grow to full height

            } else if (metric === "SustainabilityScore") {
                // Grouped Bar Chart for Sustainability Breakdown
                const subgroups = ["capacityScore", "configScore", "aspirationScore"];
                const subgroupColors = ["#638889", "#A7D397", "#F9EFDB"];
                const subgroupScale = d3.scaleBand()
                    .domain(subgroups)
                    .range([0, xScale.bandwidth()])
                    .padding([0.05]);


                svg.selectAll(".group-bar")
                    .data(top5Manufacturers.flatMap(d => subgroups.map(sub => ({
                        name: d.name,
                        subgroup: sub,
                        value: d[sub]
                    }))))
                    .enter()
                    .append("rect")
                    .attr("class", "group-bar")
                    .attr("x", d => xScale(d.name) + subgroupScale(d.subgroup))
                    .attr("y", height)
                    .attr("width", subgroupScale.bandwidth())
                    .attr("height", 0)
                    .attr("fill", d => subgroupColors[subgroups.indexOf(d.subgroup)])
                    .transition()
                    .duration(2000)
                    .attr("y", d => yScale(d.value))
                    .attr("height", d => height - yScale(d.value));

                // Outline for overall Sustainability Score Bars
                svg.selectAll(".sustainability-bar")
                    .data(top5Manufacturers)
                    .enter()
                    .append("rect")
                    .attr("class", "sustainability-bar")
                    .attr("x", d => xScale(d.name))
                    .attr("y", height)
                    .attr("width", xScale.bandwidth())
                    .attr("height", 0)
                    .attr("stroke", "white")
                    .attr("stroke-width", "2px")
                    .attr("fill", "none")
                    .transition()
                    .duration(2000)
                    .attr("y", d => yScale(d.sustainabilityScore))
                    .attr("height", d => height - yScale(d.sustainabilityScore));

                const legendGroup = svg.append("g")
                    .attr("class", "legend")
                    .attr("transform", `translate(${width - 190}, -15)`); // Moves legend to top-right

                // Define legend items (Including "Overall Sustainability Score")
                const legendLabels = [
                    "Capacity Sustainability Score",
                    "Config Sustainability Score",
                    "Aspiration Sustainability Score",
                    "Overall Sustainability Score"
                ];

                const legendColors = [
                    "#638889",  // Deep Wine Red (Capacity)
                    "#A7D397",  // Dusty Blue (Config)
                    "#F9EFDB",  // Faded Teal (Aspiration)
                    "none"      // Transparent for Overall Outline
                ];

                // Create legend items
                const legend = legendGroup.selectAll(".legend-item")
                    .data(legendLabels)
                    .enter()
                    .append("g")
                    .attr("class", "legend-item")
                    .attr("transform", (d, i) => `translate(0, ${i * 20})`); // Adjust spacing

                // Add color squares (for normal bars)
                legend.append("rect")
                    .attr("width", 12)
                    .attr("height", 12)
                    .attr("fill", (d, i) => legendColors[i])
                    .attr("stroke", (d, i) => i === 3 ? "#FFFFFF" : "none") //  White outline for "Overall sustainability"
                    .attr("stroke-width", (d, i) => i === 3 ? 2 : 0) //  Thicker stroke for outline

                // Add text labels
                legend.append("text")
                    .attr("x", 18)
                    .attr("y", 10)
                    .attr("fill", "white")
                    .style("font-size", "12px")
                    .text(d => d);

            }
        }

        // **Intersection Observer to Restart Animation on Scroll**
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateChart(d3.select("#engine-metric").property("value")); // Restart animation
                }
            });
        }, { threshold: 0.5 }); // Trigger when 50% of the section is visible

        // Observe the visualization container
        observer.observe(document.querySelector(selector));

        // **Initial Render**
        updateChart("totalRaceWins");

        // **Dropdown Interaction**
        d3.select("#engine-metric").on("change", function () {
            updateChart(this.value);
        });

    } catch (error) {
        console.error("Error loading engine manufacturers data:", error);
    }
}

// **Call the function on document load**
document.addEventListener("DOMContentLoaded", function () {
    initEnginesVisualization("#engines-visualization");
});