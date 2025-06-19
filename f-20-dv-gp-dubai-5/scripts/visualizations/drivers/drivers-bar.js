//Racing bar chart - the champions
async function loadChampionsBarChart() {
    try {
        const drivers = await d3.csv("assets/data/f1db-drivers.csv");

        //top 10 drivers based on totalChampionshipWins
        const topDrivers = drivers
            .map(d => ({
                name: d.fullName.trim(),
                wins: +d.totalChampionshipWins
            }))
            .filter(d => !isNaN(d.wins) && d.wins > 0)
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 10);

        d3.select("#champions-visualization").html("");
        const margin = { top: 90, right: 150, bottom: 30, left: 350 }; 
        const container = d3.select("#champions-visualization").node().getBoundingClientRect();
        const width = container.width - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        const svg = d3.select("#champions-visualization")
            .append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        //subheading
        svg.append("text")
        .attr("x", width / 2)
        .attr("y", -35) 
        .attr("text-anchor", "middle")
        .attr("fill", "#ccc")
        .attr("font-size", "22px")
        .attr("font-weight", "500")
        .text("Top 10 F1 Drivers by Championships 🏆");

        const xScale = d3.scaleLinear()
            .domain([0, d3.max(topDrivers, d => d.wins)])
            .range([0, width]);

        const yScale = d3.scaleBand()
            .domain(topDrivers.map(d => d.name))
            .range([0, height])
            .padding(0.2);

        //bars
        const bars = svg.selectAll(".bar-group")
            .data(topDrivers)
            .enter()
            .append("g")
            .attr("class", "bar-group");
        
        
        // const colors = ["#F4C542", "#E87E3A"];
        // bars.append("rect")
        //     .attr("class", "bar")
        //     .attr("y", d => yScale(d.name))
        //     .attr("width", 0)
        //     .attr("height", yScale.bandwidth())
        //     .attr("fill", (d, i) => colors[i % 2])
        //     .attr("rx", 5) 
        //     .attr("ry", 5) 
        //     .transition()
        //     .duration(1500)
        //     .attr("width", d => xScale(d.wins));

        const winColors = new Map([
            [7, "#E8E5E0"],  
            [5, "#288994"],   
            [4, "#2F387B"],   
            [3, "#D75B34"]    
        ]);

        bars.append("rect")
            .attr("class", "bar")
            .attr("y", d => yScale(d.name))
            .attr("width", 0)
            .attr("height", yScale.bandwidth())
            .attr("fill", d => winColors.get(d.wins)) 
            .attr("rx", 5)
            .attr("ry", 5)
            .transition()
            .duration(2000)
            .attr("width", d => xScale(d.wins));

        //dotted line
        bars.append("line")
        .attr("class", "guide-line")
        .attr("x1", d => xScale(d.wins))
        .attr("x2", d => xScale(d.wins))
        .attr("y1", d => yScale(d.name) + yScale.bandwidth() / 2)
        .attr("y2", d => yScale(d.name) + yScale.bandwidth() / 2)
        .attr("stroke", "#ddd")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0)
        .transition()
        .delay(2000) 
        .duration(700)
        .attr("opacity", 1)
        .attr("y2", height);

        //car image
        const sizeMultiplier = 2;
        const aspectRatio = 2;
        const carHeight = yScale.bandwidth() * sizeMultiplier;
        const carWidth = carHeight * aspectRatio;

        bars.append("image")
            .attr("xlink:href", "assets/data/f1-car.png")
            .attr("y", d => {
                return yScale(d.name) + (yScale.bandwidth() / 2) - (carHeight / 2);
            })
            .attr("height", carHeight)
            .attr("width", carWidth)
            .attr("x", -30)
            .transition()
            .duration(2000)
            .attr("x", d => xScale(d.wins) - 40);

        //for driver names
        bars.selectAll(".driver-label")
            .data(d => [d])
            .join(
                enter => enter.append("text")
                    .attr("class", "driver-label")
                    .attr("x", -10)
                    .attr("y", d => yScale(d.name) + yScale.bandwidth() / 2)
                    .attr("text-anchor", "end")
                    .attr("alignment-baseline", "middle")
                    .attr("fill", "white")
                    .attr("font-size", "16px")
                    .attr("font-weight", "bold")
                    .text(d => d.name),
                update => update,
                exit => exit.remove()
            );

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(5))
            .attr("color", "white")
            .selectAll("text")
            .style("font-size", "16px")
            .style("font-weight", "bold");

        const yAxis = svg.append("g")
            .call(d3.axisLeft(yScale))
            .attr("color", "white");

        yAxis.selectAll("text").remove();

    } catch (error) {
        console.error("Error loading driver data:", error);
    }
}
loadChampionsBarChart();

function observeDriversSection() {
    const driversSection = document.querySelector("#drivers");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                console.log("Viewing drivers section - Reloading graph");

                d3.select("#champions-visualization").html("");

                loadChampionsBarChart();
            }
        });
    }, { threshold: 0.5 });
    observer.observe(driversSection);
}
observeDriversSection();













