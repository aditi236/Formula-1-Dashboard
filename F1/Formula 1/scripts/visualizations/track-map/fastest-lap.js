/**
 * Fastest Lap Visualization
 */

async function drawFastestLapVisualization(raceData, containerSelector, onAnimationEnd = () => { }) {
    let fastestLapsData = [];
    try {
        fastestLapsData = await d3.csv("assets/data/f1db-races-fastest-laps.csv");
    } catch (error) {
        console.error("[FastestLapViz] Error loading CSV:", error);
        d3.select(containerSelector)
            .append("div")
            .attr("class", "placeholder-message")
            .text("Error loading fastest lap data.");
        return;
    }

    // 2) Find the record for this year + round
    const matchingRecord = fastestLapsData.find(d =>
        +d.year === +raceData.year &&
        +d.round === +raceData.round
    );

    if (!matchingRecord) {
        console.warn("[FastestLapViz] No fastest lap data found for", raceData);
        d3.select(containerSelector)
            .append("div")
            .attr("class", "placeholder-message")
            .text("No fastest lap data available for this race.");
        return;
    }

    // 3) Extract the lap time and driver
    const lapTimeString = matchingRecord.time || "";
    let driverName = matchingRecord.driverId || "Unknown Driver";
    driverName = driverName
        .split("-")
        .map(str => str.charAt(0).toUpperCase() + str.slice(1))
        .join(" ");

    // Convert to total seconds
    const lapTimeSeconds = convertTimeToSeconds(lapTimeString);

    // 4) Create wrapper
    d3.select(containerSelector)
        .selectAll(".fastest-lap-viz-wrapper")
        .remove();

    const vizWrapper = d3.select(containerSelector)
        .append("div")
        .attr("class", "fastest-lap-viz-wrapper")
        .style("width", "100%")
        .style("margin", "0")
        .style("text-align", "center")
        .style("background", "linear-gradient(to bottom, #000000, #1a1a1a)")
        .style("border-radius", "4px")
        .style("padding", "0")
        .style("overflow", "hidden")
        .style("flex", "1 1 100%")
        .style("max-width", "100%")
        .style("box-shadow", "0 4px 8px rgba(0,0,0,0.5)");


    vizWrapper.append("div")
        .style("color", "#fff")
        .style("font-size", "1.6rem")
        .style("font-weight", "bold")
        .style("padding", "12px 0")
        .style("background", "#222")
        .style("border-radius", "4px 4px 0 0")
        .style("margin-bottom", "0")
        .style("border-bottom", "2px solid #333")
        .text("Fastest Lap");


    const vizContainer = vizWrapper
        .append("div")
        .attr("id", "fastest-lap-viz")
        .style("width", "100%")
        .style("padding", "25px")
        .style("background", "transparent");

    // Reference to the lap time text that will be updated during animation
    const lapTimeHeader = vizWrapper.append("div")
        .attr("class", "lap-time-header")
        .style("color", "#fff")
        .style("font-size", "1.5rem")
        .style("font-weight", "bold")
        .style("padding", "10px 0")
        .style("background", "transparent")
        .text("Lap Time 0:00.000"); // Start at 0

    // Show the driver name
    vizWrapper.append("div")
        .style("color", "#999")
        .style("font-size", "1rem")
        .style("padding", "5px 0 10px 0")
        .style("background", "transparent")
        .style("font-weight", "normal")
        .text(`Fastest Lap by ${driverName}`);

    // 5) Create and animate the racing progress bar
    createRacingProgressBar(vizContainer, lapTimeSeconds, formatLapTime(lapTimeSeconds), lapTimeHeader, onAnimationEnd);
}

/**
 * Creates an animated racing progress bar visualization
 */
function createRacingProgressBar(container, lapTimeSeconds, formattedLapTime, lapTimeHeader, onAnimationEnd) {
    const width = 500;
    const height = 180;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block")
        .style("margin", "0 auto")
        .style("background", "transparent");

    // Racing track background
    svg.append("rect")
        .attr("x", 0)
        .attr("y", 45)
        .attr("width", width)
        .attr("height", 60) // track
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("fill", "#333")
        .attr("stroke", "#555")
        .attr("stroke-width", 2);

    // Track lane lines
    for (let i = 1; i < 3; i++) {
        svg.append("line")
            .attr("x1", 0)
            .attr("y1", 45 + (i * 15))
            .attr("x2", width)
            .attr("y2", 45 + (i * 15))
            .attr("stroke", "#555")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "10,10");
    }

    // Start line
    svg.append("rect")
        .attr("x", 10)
        .attr("y", 35)
        .attr("width", 5)
        .attr("height", 80)
        .attr("fill", "#fff");

    // Finish line
    const finishLineGroup = svg.append("g")
        .attr("transform", `translate(${width - 60}, 35)`);

    // Checkered pattern (5x8 grid)
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 5; col++) {
            const isBlack = (row + col) % 2 === 0;
            finishLineGroup.append("rect")
                .attr("x", col * 5)
                .attr("y", row * 10)
                .attr("width", 5)
                .attr("height", 10)
                .attr("fill", isBlack ? "#000" : "#fff");
        }
    }

    // Track border (gives a nice 3D effect)
    svg.append("rect")
        .attr("x", 0)
        .attr("y", 45)
        .attr("width", width)
        .attr("height", 60)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-width", 2);

    // Progress bar
    const progressBar = svg.append("rect")
        .attr("x", 15)
        .attr("y", 50)
        .attr("width", 0)
        .attr("height", 50)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", "url(#progressGradient)");

    // Gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "progressGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
        gradient.append("stop").attr("offset", "0%").attr("stop-color", "#5FCF79");   
        gradient.append("stop").attr("offset", "50%").attr("stop-color", "#F9D75B"); 
        gradient.append("stop").attr("offset", "100%").attr("stop-color", "#E25A45"); 
        

    // Car group - larger car
    const carGroup = svg.append("g")
        .attr("transform", `translate(15, 75)`)
        .attr("class", "racing-car");

    // Car shape 
    carGroup.append("path")
        .attr("d", "M2,10 L7,4 L32,4 L38,10 L42,10 L42,18 L2,18 Z")
        .attr("fill", "#e74c3c");
    // Front wing
    carGroup.append("rect")
        .attr("x", 0)
        .attr("y", 11)
        .attr("width", 8)
        .attr("height", 7)
        .attr("fill", "#333");
    // Rear wing
    carGroup.append("rect")
        .attr("x", 33)
        .attr("y", 6)
        .attr("width", 8)
        .attr("height", 12)
        .attr("fill", "#333");
    // Wheels
    carGroup.append("circle")
        .attr("cx", 10)
        .attr("cy", 18)
        .attr("r", 5)
        .attr("fill", "#333");
    carGroup.append("circle")
        .attr("cx", 32)
        .attr("cy", 18)
        .attr("r", 5)
        .attr("fill", "#333");
    // Driver's helmet
    carGroup.append("circle")
        .attr("cx", 22)
        .attr("cy", 8)
        .attr("r", 4)
        .attr("fill", "#3498db");

    // Clock 
    const clockGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, 25)`);
    clockGroup.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 18)
        .attr("fill", "#222")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1);
    clockGroup.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 2)
        .attr("fill", "#fff");

    const clockHand = clockGroup.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", -12)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("transform", "rotate(0)");

    // Max progress width 
    const maxProgressWidth = width - 60;

    // Countdown 
    const countdownGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);
    const countdownText = countdownGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#fff")
        .attr("font-size", "45px")
        .attr("font-weight", "bold")
        .text("3");

    // Countdown transitions => startLapAnimation
    countdownText.transition()
        .duration(1000).text("3")
        .transition().duration(1000).text("2")
        .transition().duration(1000).text("1")
        .transition().duration(500).text("GO!")
        .transition().duration(500).style("opacity", 0).remove()
        .on("end", startLapAnimation);

    function startLapAnimation() {
        // Animation speed
        const animDuration = Math.min(2000, lapTimeSeconds * 250);

        // 1) Progress bar
        progressBar.transition()
            .duration(animDuration)
            .ease(d3.easePolyOut.exponent(2.5))
            .attr("width", maxProgressWidth)
            // 2) When final transition ends, call onAnimationEnd; so the other charts can start (so far, podium)
            .on("end", function () {
                onAnimationEnd();
            });

        // 3) Car 
        carGroup.transition()
            .duration(animDuration)
            .ease(d3.easePolyOut.exponent(2.5))
            .attr("transform", `translate(${width - 40}, 75)`);

        // 4) Clock hand
        clockHand.transition()
            .duration(animDuration)
            .ease(d3.easeLinear)
            .attrTween("transform", function () {
                return function (t) {
                    return `rotate(${t * 360})`;
                };
            });

        // 5) Time display
        let startTime = Date.now();
        function updateTime() {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(1, elapsed / (animDuration / 1000));
            const currentSeconds = progress * lapTimeSeconds;

            // Format M:SS.sss
            const minutes = Math.floor(currentSeconds / 60);
            const seconds = currentSeconds % 60;
            const formattedTime = `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;

            // timeText.text(formattedTime);
            lapTimeHeader.text(`Lap Time ${formattedTime}`);

            if (progress < 1) {
                requestAnimationFrame(updateTime);
            } else {
                // Final time
                // timeText.text(formattedTime);
                lapTimeHeader.text(`Lap Time ${formattedLapTime}`);

                // Completion effect
                svg.append("rect")
                    .attr("x", 0)
                    .attr("y", 45)
                    .attr("width", width)
                    .attr("height", 60)
                    .attr("fill", "#fff")
                    .attr("opacity", 0.6)
                    .transition()
                    .duration(500)
                    .attr("opacity", 0)
                    .remove();

                // Waving flag
                const flagGroup = svg.append("g")
                    .attr("transform", `translate(${width - 30}, 20)`)
                    .style("opacity", 0);

                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        const isBlack = (row + col) % 2 === 0;
                        flagGroup.append("rect")
                            .attr("x", col * 6)
                            .attr("y", row * 6)
                            .attr("width", 6)
                            .attr("height", 6)
                            .attr("fill", isBlack ? "#000" : "#fff");
                    }
                }

                flagGroup.transition()
                    .duration(300)
                    .style("opacity", 1)
                    .transition()
                    .duration(1000)
                    .attrTween("transform", function () {
                        return function (t) {
                            const waveOffset = Math.sin(t * 10) * 5;
                            return `translate(${width - 30}, ${20 + waveOffset})`;
                        };
                    })
                    .transition()
                    .duration(300)
                    .style("opacity", 0)
                    .remove();
            }
        }
        updateTime();
    }
}

// time utils; add to utils folder later
function convertTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    if (parts.length === 2) {
        const minutes = +parts[0];
        const seconds = +parts[1];
        return minutes * 60 + seconds;
    }
    return parseFloat(timeStr) || 0;
}

function formatLapTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}