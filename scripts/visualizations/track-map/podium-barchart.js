/**
 * drawPodiumHistogram(raceData)
 * 
 * Creates a vertical bar chart for the top 3 finishers:
 * - Left bar = 2nd place (Orange)
 * - Middle bar = 1st place (Blue)
 * - Right bar = 3rd place (Red)
 * 
 * Bars start at height=0 and animate up once called. 
 * When the last bar finishes, confetti appears.
 */

async function drawPodiumHistogram(raceData, containerSelector, onAnimationEnd = () => { }) {
    let raceResults = [];
    try {
        raceResults = await d3.csv("assets/data/f1db-races-race-results.csv");
    } catch (error) {
        console.error("[PodiumHistogram] Error loading CSV:", error);
        d3.select(containerSelector)
            .append("div")
            .attr("class", "placeholder-message")
            .text("Error loading podium data.");
        return null;
    }

    // 2) Filter for this race (by year & round) and sort by finishing position
    const filtered = raceResults.filter(d =>
        +d.year === +raceData.year && +d.round === +raceData.round
    );
    if (!filtered.length) {
        d3.select(containerSelector)
            .append("div")
            .attr("class", "placeholder-message")
            .text("No podium data available for this race.");
        return null;
    }

    // Sort by ascending position (1 => winner, 2 => second, 3 => third, etc.)
    const sorted = filtered.sort((a, b) => +a.position - +b.position);
    const top3 = sorted.slice(0, 3); // take only the top 3


    top3.forEach(d => {
        d.points = +d.points || 0;
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
    });

    while (top3.length < 3) {
        top3.push({ displayName: "N/A", points: 0 });
    }

    // Reorder so index 0 => 2nd place, 1 => 1st place, 2 => 3rd place
    const podiumOrder = [top3[1], top3[0], top3[2]];

    // Clear container
    d3.select(containerSelector).selectAll("*").remove();

    // Create a wrapper in the specified container
    const wrapper = d3.select(containerSelector)
        .append("div")
        .attr("class", "podium-histogram-wrapper")
        .style("width", "100%")
        .style("margin", "0")
        .style("text-align", "center")
        .style("background", "linear-gradient(to bottom, #000000, #1a1a1a)")
        .style("border-radius", "4px")
        .style("padding", "0")
        .style("overflow", "hidden")
        .style("box-shadow", "0 4px 8px rgba(0,0,0,0.5)");

    // Title
    wrapper.append("div")
        .style("color", "#fff")
        .style("font-size", "1.6rem")
        .style("font-weight", "bold")
        .style("padding", "12px 0")
        .style("background", "#222")
        .style("border-radius", "4px 4px 0 0")
        .style("margin-bottom", "0")
        .style("border-bottom", "2px solid #333")
        .text("Podium (top 3)");

    // 4) Set up SVG
    const width = 550;
    const height = 320;
    const margin = { top: 30, right: 20, bottom: 70, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = wrapper.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "transparent")

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 5) Scales
    const xScale = d3.scaleBand()
        .domain(podiumOrder.map(d => d.displayName))
        .range([0, chartWidth])
        .padding(0.3);

    const maxPoints = d3.max(podiumOrder, d => d.points) || 0;
    const yScale = d3.scaleLinear()
        .domain([0, maxPoints])
        .range([chartHeight, 0])
        .nice();

    // 6) Color mapping for the 3 positions
    const colorMap = ["#FFB366", "#6F8ED9", "#FF6B6B"]; // Orange, Blue, Red

    // 7) Bars (start at height=0)
    const bars = g.selectAll(".podium-bar")
        .data(podiumOrder)
        .enter().append("rect")
        .attr("class", "podium-bar")
        .attr("x", d => xScale(d.displayName))
        .attr("width", xScale.bandwidth())
        .attr("y", chartHeight)
        .attr("height", 0)
        .attr("fill", (d, i) => colorMap[i]);

    // 8) X-axis
    const xAxis = g.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(xScale));

    xAxis.select(".domain").attr("stroke", "#444");
    xAxis.selectAll(".tick line").attr("stroke", "#444");
    xAxis.selectAll("text")
        .style("fill", "#fff")
        .style("font-size", "12px")
        .style("text-anchor", "middle");

    // 9) Y-axis
    const yAxis = g.append("g")
        .call(d3.axisLeft(yScale).ticks(5));

    yAxis.select(".domain").attr("stroke", "#444");
    yAxis.selectAll(".tick line").attr("stroke", "#444");
    yAxis.selectAll("text")
        .style("fill", "#fff")
        .style("font-size", "12px");

    // 10) Base line under the bars
    g.append("line")
        .attr("x1", 0)
        .attr("y1", chartHeight)
        .attr("x2", chartWidth)
        .attr("y2", chartHeight)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    // 11) Points labels
    const labels = g.selectAll(".bar-label")
        .data(podiumOrder)
        .enter().append("text")
        .attr("class", "bar-label")
        .attr("x", d => xScale(d.displayName) + xScale.bandwidth() / 2)
        .attr("y", chartHeight)
        .attr("dy", "-0.5em")
        .attr("text-anchor", "middle")
        .style("fill", "#fff")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(d => d.points)
        .style("opacity", 0);

    // 12) Return object with animateBars function
    return {
        animateBars: function () {
            bars.transition()
                .duration(2000)
                .attr("y", d => yScale(d.points))
                .attr("height", d => chartHeight - yScale(d.points))
                .on("end", function (d, i) {
                    // If it's the last bar, launch confetti
                    if (i === podiumOrder.length - 1) {
                        launchConfetti(svg, width, height);
                        onAnimationEnd(); // for tthe drivers standings chart to render
                    }
                });

            labels.transition()
                .delay(1000)
                .duration(1600)
                .style("opacity", 1)
                .attr("y", d => yScale(d.points) - 5);
        }
    };
}

/** 
 * Launch confetti across the entire SVG area, after the animation iso ver for the bars.
 */
function launchConfetti(svg, width, height) {
    const confettiCount = 30;
    // Using F1 team colors for the confetti
    const colors = ["#0600EF", "#FF8700", "#005AFF", "#00D2BE", "#DC0000", "#0090FF", "#2B4562", "#006F62", "#FFFFFF"];

    for (let i = 0; i < confettiCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 5 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const rotation = Math.random() * 360;

        const confetti = svg.append("rect")
            .attr("x", x)
            .attr("y", y)
            .attr("width", size)
            .attr("height", size / 2)
            .attr("fill", color)
            .attr("opacity", 1)
            .attr("transform", `rotate(${rotation}, ${x}, ${y})`);

        confetti.transition()
            .duration(1500 + Math.random() * 1000)
            .ease(d3.easeCubicOut)
            .attr("y", y + (height * 0.5) + Math.random() * 60)
            .attr("transform", `rotate(${rotation + 180}, ${x}, ${y + 100})`)
            .attr("opacity", 0)
            .remove();
    }
}