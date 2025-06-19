"use strict";

async function initTyresVisualization() {
    try {
        // Define dimensions
        const container = d3.select("#tyres-visualization").node().getBoundingClientRect();
        const width = container.width, height = container.height || 200;
        const radius = Math.min(width, height) / 1.1;

        // Clear any previous visualization
        d3.select("#tyres-visualization").html("");

        // Append tooltip to the BODY, not SVG (Ensures proper positioning)
        const tooltip = d3.select("body").append("div").attr("class", "tooltip");

        // Create SVG container
        const svg = d3.select("#tyres-visualization")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        // Add a container for the tire image
        const tireContainer = svg.append("g").attr("class", "tire-container");

        // Add the tyre image in the background
        tireContainer.append("image")
            .attr("xlink:href", "assets/images/tyre.png")
            .attr("x", -radius * 0.59)
            .attr("y", -radius * 0.57)
            .attr("width", radius * 1.2)
            .attr("height", radius * 1.2)
            .attr("class", "tyre-image");

        // Define inner and outer radius
        const outerRadius = radius * 0.43;
        const innerRadius = radius * 0.37;

        // Define color scale
        const colors = ["#FF5C5C", "#FFE03D", "#59D98E", "#5CAFFF", "#F2D650", "#96E07C", "#FFA857", "#79C7F2"];
        const colorScale = d3.scaleOrdinal(colors);

        // Load Data Dynamically
        d3.csv("assets/data/f1db-tyre-manufacturers.csv").then(data => {
            data.forEach(d => {
                d.totalRaceWins = +d.totalRaceWins;
                d.totalPolePositions = +d.totalPolePositions;
                d.totalFastestLaps = +d.totalFastestLaps;
            });

            updateChart("totalRaceWins");

            // Dropdown Interaction
            d3.select("#tyre-metric").on("change", (event) => updateChart(event.target.value));

            function updateChart(metric) {
                svg.selectAll(".arc-progress").remove();

                data.sort((a, b) => b[metric] - a[metric]);

                const pie = d3.pie().value(d => d[metric]).sort(null);

                const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

                const progressArcs = svg.selectAll(".arc-progress")
                    .data(pie(data))
                    .join("path")
                    .attr("class", "arc-progress")
                    .attr("fill", d => colorScale(d.data.name));

                progressArcs
                    .on("mouseover", function (event, d) {
                        const segmentColor = d3.select(this).attr("fill");

                        tooltip.html(`
                            <strong>${d.data.name}</strong><br>
                            <span class="tooltip-text">Country: ${d.data.countryId}</span><br>
                            <span class="tooltip-text">${metric}: ${d.data[metric]}</span>
                        `);

                        tooltip
                            .style("background", segmentColor)
                            .classed("visible", true);

                        d3.select(this) // Applies the pointer cursor to the segment instead
                            .style("cursor", "pointer");
                    })
                    .on("mousemove", function (event) {
                        tooltip
                            .style("left", `${event.pageX + 25}px`)
                            .style("top", `${event.pageY - 10}px`);
                    })
                    .on("mouseleave", function () {
                        tooltip.classed("visible", false);
                    });

                function animateSequentially(index) {
                    if (index >= data.length) return;
                    const arcData = pie(data)[index];

                    svg.selectAll(".arc-progress")
                        .filter((_, i) => i === index)
                        .transition()
                        .duration(500)
                        .ease(d3.easeCubicOut)
                        .attrTween("d", function () {
                            const interpolate = d3.interpolate(arcData.startAngle, arcData.endAngle);
                            return function (t) {
                                return arc({ startAngle: arcData.startAngle, endAngle: interpolate(t) });
                            };
                        })
                        .on("end", () => animateSequentially(index + 1));
                }

                animateSequentially(0);
            }

            const tyresSection = document.querySelector("#tyres");
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        updateChart(d3.select("#tyre-metric").property("value"));
                    }
                });
            }, { threshold: 0.6 });

            observer.observe(tyresSection);
        });

    } catch (error) {
        console.error("Error loading or processing data:", error);
    }
}

initTyresVisualization();
