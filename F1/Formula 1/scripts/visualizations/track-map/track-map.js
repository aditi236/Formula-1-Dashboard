/**
 * Track Map Visualization
 *
 * 1) Populates #season-select (1950–2024).
 * 2) Loads world-countries.geojson and draws a Mercator map with zoom/pan.
 * 3) Loads f1db-races.csv & f1db-circuits.csv, merges them on circuitId.
 * 4) Uses d3.geoContains() to find which polygon (country) each latitide/longitude belongs to.
 * 5) Highlights polygons that host a race.
 * 6) Displays only the round numbers as labels.
 * 7) Runs a short force simulation to nudge labels apart if they overlap.
 * 8) Hover/click on a label or country polygon => tooltip with track info.
 * 9) Zoom in/out/reset buttons and pan feature.
 * 10) Console logs for debugging merges, host countries, etc.
 */

async function initTrackMapVisualization(selector) {
  console.log("[TrackMap] Initializing track map...");

  //  Populate season selector
  const seasonSelect = d3.select("#season-select");
  seasonSelect.selectAll("option").remove();
  d3.range(1950, 2025).forEach(year => {
    seasonSelect.append("option").attr("value", year).text(year);
  });
  seasonSelect.property("value", 2024);
  let selectedSeason = parseInt(seasonSelect.property("value")) || 2024;

  //  SVG Container
  const container = d3.select(selector);
  container.html("");
  const width = container.node().getBoundingClientRect().width;
  const height = 800;

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "world-map-container")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Main group for polygons & labels
  const mapGroup = svg.append("g").attr("class", "map-group");

  //  Tooltip (when hovered over country and over the number)
  let tooltip = d3.select("body").selectAll(".country-info-card").data([0]);
  const tooltipEnter = tooltip.enter()
    .append("div")
    .attr("class", "country-info-card")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("pointer-events", "none");
  const mergedTooltip = tooltip.merge(tooltipEnter);
  let tooltipTimeout;

  //  Zoom & Pan
  const zoomBehavior = d3.zoom()
    .scaleExtent([0.4, 8])
    .on("zoom", (event) => {
      mapGroup.attr("transform", event.transform);
    });
  svg.call(zoomBehavior);

  // Zoom Controls
  const zoomControls = svg.append("g")
    .attr("class", "zoom-controls")
    .attr("transform", `translate(${width - 60}, 30)`);

  // Zoom In
  zoomControls.append("rect")
    .attr("x", 0).attr("y", 0)
    .attr("width", 30).attr("height", 30)
    .attr("fill", "#333").attr("stroke", "#666")
    .attr("rx", 4).attr("ry", 4)
    .style("cursor", "pointer")
    .on("click", (event) => {
      event.stopPropagation();
      console.log("[TrackMap] Zoom In clicked");
      svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.5);
    });
  zoomControls.append("text")
    .attr("x", 15).attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", "20px")
    .style("pointer-events", "none")
    .text("+");

  // Zoom Out
  zoomControls.append("rect")
    .attr("x", 0).attr("y", 40)
    .attr("width", 30).attr("height", 30)
    .attr("fill", "#333").attr("stroke", "#666")
    .attr("rx", 4).attr("ry", 4)
    .style("cursor", "pointer")
    .on("click", (event) => {
      event.stopPropagation();
      console.log("[TrackMap] Zoom Out clicked");
      svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.67);
    });
  zoomControls.append("text")
    .attr("x", 15).attr("y", 60)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", "20px")
    .style("pointer-events", "none")
    .text("−");

  // Reset
  zoomControls.append("rect")
    .attr("x", 0).attr("y", 80)
    .attr("width", 30).attr("height", 30)
    .attr("fill", "#333").attr("stroke", "#666")
    .attr("rx", 4).attr("ry", 4)
    .style("cursor", "pointer")
    .on("click", (event) => {
      event.stopPropagation();
      console.log("[TrackMap] Reset clicked");
      svg.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity);
    });
  zoomControls.append("text")
    .attr("x", 15).attr("y", 100)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", "12px")
    .style("pointer-events", "none")
    .text("R");

  //  Projection & Path
  const projection = d3.geoMercator()
    .scale(width / 2 / Math.PI * 0.9)
    .center([0, 20])
    .translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);
  
  console.log("[TrackMap] Loading GeoJSON...");
  let worldData;
  try {
    worldData = await d3.json("assets/data/world-countries.geojson");
    console.log("[TrackMap] GeoJSON loaded. Features count:", worldData.features.length);
  } catch (err) {
    console.error("[TrackMap] Error loading GeoJSON:", err);
    container.append("div")
      .attr("class", "placeholder-message")
      .text("Error loading world map data. Please try again later.");
    return;
  }

  // Draw country polygons
  const countryPaths = mapGroup.selectAll("path.country")
    .data(worldData.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", "#ffffff")
    .attr("stroke", "#333333")
    .attr("stroke-width", 0.5)
    .style("opacity", 0.9);

  //  Update Function
  async function updateMap(season) {
    console.log(`[TrackMap] updateMap(${season}) called`);
    // Remove old label group
    mapGroup.selectAll(".round-markers").remove();

    // Reset country fill
    countryPaths
      .classed("highlighted-country", false)
      .attr("fill", "#ffffff")
      .on("mouseover", null)
      .on("mousemove", null)
      .on("mouseout", null)
      .on("click", null);

    console.log("[TrackMap] Loading CSV files...");
    let racesData, circuitsData;
    try {
      [racesData, circuitsData] = await Promise.all([
        d3.csv("assets/data/f1db-races.csv"),
        d3.csv("assets/data/f1db-circuits.csv")
      ]);
      console.log(`[TrackMap] Loaded ${racesData.length} races, ${circuitsData.length} circuits.`);
    } catch (err) {
      console.error("[TrackMap] Error loading CSVs:", err);
      return;
    }

    // Parse & trim races + circuits data

    racesData.forEach(r => {
      r.year = +r.year || 0;
      r.round = +r.round || 0;
      r.circuitId = (r.circuitId || "").trim().toLowerCase();
      r.raceName = (r.raceName || "").trim();
      r.courseLength = r.courseLength || "";
      r.laps = r.laps || "";
      r.distance = r.distance || "";
      r.turns = r.turns || "";
    });
    circuitsData.forEach(c => {
      c.circuitId = ((c.circuitId || c.id) || "").trim().toLowerCase();
      c.trackName = (c.id || "").trim();
      c.fullName = (c.fullName || "").trim();
      c.circuitName = c.trackName || (c.circuitName || "").trim();
      c.country = (c.country || c.countryId || "").trim();
      c.lat = +c.lat || +c.latitude || 0;
      c.lng = +c.lng || +c.longitude || 0;
    });

    // Filter for chosen season
    const seasonRaces = racesData.filter(d => d.year === season);
    console.log(`[TrackMap] Season ${season} has ${seasonRaces.length} races.`);

    // Merge races with circuits
    const mergedRaces = seasonRaces.map(r => {
      const circuit = circuitsData.find(c => c.circuitId === r.circuitId) || {};
      if (!circuit.circuitId) {
        console.warn(`[TrackMap] No circuit data found for circuitId="${r.circuitId}"`);
      }
      return {
        ...r,
        circuitName: circuit.trackName || circuit.fullName || circuit.circuitName || r.raceName,
        lat: circuit.lat,
        lng: circuit.lng,
        country: circuit.country || ""
      };
    });
    mergedRaces.sort((a, b) => a.round - b.round);
    console.log("[TrackMap] Merged Races:", mergedRaces);

    // Determine polygon country
    mergedRaces.forEach(r => {
      if (r.lat && r.lng) {
        r.geoCountry = findCountryByCoords(r.lng, r.lat, worldData) || r.country;
      } else {
        r.geoCountry = r.country;
      }
    });

    // Build dictionary: country -> races
    const countryToRaces = {};
    mergedRaces.forEach(r => {
      const key = (r.geoCountry || "").trim();
      if (!key) return;
      if (!countryToRaces[key]) {
        countryToRaces[key] = [];
      }
      countryToRaces[key].push(r);
    });
    // Host countries set
    const hostCountries = new Set(Object.keys(countryToRaces));
    console.log("[TrackMap] Host countries set:", hostCountries);

    // Highlight polygons
    countryPaths.each(function (d) {
      const geoCountry = (d.properties?.name || "").trim();
      if (hostCountries.has(geoCountry)) {
        d3.select(this)
          .classed("highlighted-country", true)
          .attr("fill", "rgba(203, 40, 59, 0.6)");
      }
    });

    // Attach polygon events (hover/click => aggregated card)
    countryPaths
      .filter(d => {
        const geoCountry = (d.properties?.name || "").trim();
        return hostCountries.has(geoCountry);
      })
      .on("mouseover", function (event, d) {
        event.stopPropagation();
        clearTimeout(tooltipTimeout);
        const geoCountry = (d.properties?.name || "").trim();
        const races = countryToRaces[geoCountry] || [];
        if (races.length > 0) {
          showCountryCard(event, geoCountry, races);
        }
      })
      .on("mousemove", function (event) {
        event.stopPropagation();
        clearTimeout(tooltipTimeout);
        mergedTooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function (event, d) {
        event.stopPropagation();
        tooltipTimeout = setTimeout(() => {
          mergedTooltip.transition().duration(500).style("opacity", 0);
        }, 300);
      })
      .on("click", function (event, d) {
        event.stopPropagation();
        const geoCountry = (d.properties?.name || "").trim();
        const races = countryToRaces[geoCountry] || [];
        if (races.length > 0) {
          showCountryCard(event, geoCountry, races);
        }
      });


    // Force-based label placement (to create more gap between the numbers/tacks so they dont overlap each other)        
    //  Build nodes from mergedRaces
    let nodes = mergedRaces
      .filter(r => r.lat && r.lng)
      .map(r => {
        const [px, py] = projection([r.lng, r.lat]);
        return {
          anchorX: px,
          anchorY: py,
          x: px,
          y: py,
          radius: 12, // label radius for collision
          data: r
        };
      });

    //  Create a force simulation for the label nodes
    let simulation = d3.forceSimulation(nodes)
      .force("collide", d3.forceCollide(d => d.radius))
      .force("x", d3.forceX(d => d.anchorX).strength(0.2))
      .force("y", d3.forceY(d => d.anchorY).strength(0.2))
      .velocityDecay(0.7)
      .stop();

    //  Manually run ~200 ticks
    for (let i = 0; i < 200; i++) {
      simulation.tick();
    }

    //  Create the text labels from final positions
    const labelsGroup = mapGroup.append("g").attr("class", "round-markers");
    labelsGroup.selectAll(".round-marker")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "round-marker")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .text(d => d.data.round)
      .style("font-family", "'Formula1 Bold', sans-serif")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("paint-order", "stroke")
      .style("stroke", "#000")
      .style("stroke-width", "3px")
      .style("fill", "#fff")
      .style("text-anchor", "middle")
      .style("pointer-events", "all")
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        event.stopPropagation();
        clearTimeout(tooltipTimeout);
        showRaceCard(event, d.data);
      })
      .on("mousemove", function (event) {
        event.stopPropagation();
        clearTimeout(tooltipTimeout);
        mergedTooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function (event) {
        event.stopPropagation();
        tooltipTimeout = setTimeout(() => {
          mergedTooltip.transition().duration(500).style("opacity", 0);
        }, 300);
      })
      .on("click", function (event, d) {
        event.stopPropagation();
        onRaceClick(d.data);  //triggers thee new race details heee.
      });

    console.log("[TrackMap] updateMap complete.");

    // Add help text in bottom left corner
    const helpText = svg.append("g")
      .attr("class", "help-text")
      .attr("transform", `translate(20, ${height - 20})`)
      .style("cursor", "help");

    // Info icon background
    helpText.append("circle")
      .attr("r", 12)
      .attr("fill", "#333")
      .attr("stroke", "#666")
      .attr("stroke-width", 1);

    // Info icon "i"
    helpText.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("font-style", "italic")
      .text("i");

    // Help text label
    helpText.append("text")
      .attr("x", 20)
      .attr("y", 4)
      .attr("fill", "white")
      .style("font-family", "'Formula1 Regular', sans-serif")
      .style("font-size", "12px")
      .text("Click on the numbers to see race details for the chosen race.");

    // Show tooltip on hover over the help text
    helpText.on("mouseover", function (event) {
      mergedTooltip.transition().duration(200).style("opacity", 1);
      mergedTooltip.html(`
  <div class="card-header">Help</div>
  <div class="card-content">
    <p>Click on the numbers to see detailed race information.</p>
    <p>Highlighted countries in red have hosted F1 races this year.</p>
    <p>Hover over countries to see the info about all the tracks in the country or the numbers to see specific track information.</p>
  </div>
`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
      .on("mousemove", function (event) {
        mergedTooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        tooltipTimeout = setTimeout(() => {
          mergedTooltip.transition().duration(500).style("opacity", 0);
        }, 300);
      });
  }

  // Helper: find polygon that contains [lng, lat]
  function findCountryByCoords(lng, lat, geoData) {
    for (const feature of geoData.features) {
      if (d3.geoContains(feature, [lng, lat])) {
        return (feature.properties?.name || "").trim();
      }
    }
    return "";
  }

  // Show aggregated card for a country
  function showCountryCard(event, countryName, races) {
    clearTimeout(tooltipTimeout);
    mergedTooltip.transition().duration(200).style("opacity", 1);

    let html = ` 
            <div class="card-header"><span class="track-name">${countryName}</span></div>
        `;
    html += `<div class="card-content">`;
    const sorted = races.sort((a, b) => a.round - b.round);
    sorted.forEach(r => {
      const lengthKM = r.courseLength ? `${r.courseLength} km / ${(r.courseLength * 0.621371).toFixed(2)} miles` : "N/A";
      const laps = r.laps || "N/A";
      const distanceNum = Number(r.distance);
      const dist = r.distance
        ? `${distanceNum} km / ${(distanceNum * 0.621371).toFixed(2)} miles`
        : "N/A";
      const turns = r.turns || "N/A";
      html += `
                <div class="card-race">
                    <hr class="custom-hr" />
                    <h4>${r.circuitName}</h4>            
                    <p>Circuit Length: ${lengthKM}</p>
                    <p>Laps: ${laps}</p>
                    <p>Distance: ${dist}</p>
                    <p>Corners: ${turns}</p>
                    <p>Round: ${r.round}</p>
                </div>
            `;
    });
    html += `</div>`;
    mergedTooltip.html(html)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
  }

  // Show a card for a single race
  function showRaceCard(event, d) {
    clearTimeout(tooltipTimeout);
    mergedTooltip.transition().duration(200).style("opacity", 1);

    const lengthKM = d.courseLength ? `${d.courseLength} km` : "N/A";
    const laps = d.laps || "N/A";
    const dist = d.distance ? `${d.distance} km` : "N/A";
    const turns = d.turns || "N/A";

    let html = `<div class="card-header">
                        <span class="track-name">${d.circuitName}</span>
                        <span class="country-name" style="padding: 2px 4px; margin-left: 6px;">${d.geoCountry || d.country || "Unknown"}</span>
                    </div>`;
    html += `<div class="card-content">
                    <p>Circuit Length: ${lengthKM}</p>
                    <p>Laps: ${laps}</p>
                    <p>Distance: ${dist}</p>
                    <p>Corners: ${turns}</p>
                    <p>Round: ${d.round}</p>
                </div>`;
    mergedTooltip.html(html)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
  }

  // Listen for season changes
  seasonSelect.on("change", function () {
    selectedSeason = parseInt(this.value) || 2024;
    console.log(`[TrackMap] Season changed to ${selectedSeason}`);
    updateMap(selectedSeason);
  });

  // Initial load
  updateMap(selectedSeason);
  console.log("[TrackMap] initTrackMapVisualization done.");
}


/**
 * Called when a user clicks on a race label (round number).
 * loading additional data for that sepcific race and display new charts below the map.
 */
function onRaceClick(raceData) {
  console.log("[TrackMap] Race clicked:", raceData);

  // Clear out any previous race details
  d3.select("#race-details-container").html("");

  const trackName = raceData.circuitName || raceData.circuitId || "";
  const formattedTrackName = trackName
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const country = raceData.country || "";
  const titleText = `Race Details: ${formattedTrackName}, ${country} ${raceData.year || ""}`;

  d3.select("#race-details-container")
    .append("div")
    .attr("class", "race-details-header")
    .style("width", "100%")
    .style("margin", "0")
    .style("padding", "15px 0")
    .style("text-align", "center")
    .style("color", "#fff")
    .style("background", "#8B0000")
    .style("border-bottom", "1px solid rgba(255,255,255,0.2)")
    .style("box-shadow", "0 2px 10px rgba(0,0,0,0.3)")
    .style("font-size", "1.8rem")
    .style("font-weight", "bold")
    .style("letter-spacing", "1px")
    .style("text-transform", "uppercase")
    .text(titleText)
    .append("span")
    .attr("class", "track-icon")
    .style("margin-left", "10px")
    .style("vertical-align", "middle")
    .html("🏁");

  // Scroll to #race-details-container (smoothly) so user sees the details right away
  setTimeout(() => {
    const detailsEl = document.getElementById("race-details-container");
    if (detailsEl) {
      detailsEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 100);

  // Create a TOP ROW container for Podium + Fastest Lap side by side
  const topRow = d3.select("#race-details-container")
    .append("div")
    .attr("id", "top-row-charts")
    .style("width", "100%")
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("gap", "10px")
    .style("background", "#1a1a1a")
    .style("padding", "10px")
    .style("justify-content", "center");

  // Podium container
  topRow.append("div")
    .attr("id", "podium-container")
    .style("width", "49%")
    .style("flex", "1 1 580px")
    .style("min-width", "450px");

  // Fastest Lap container
  topRow.append("div")
    .attr("id", "fastest-lap-container")
    .style("width", "49%")
    .style("flex", "1 1 580px")
    .style("min-width", "450px");

  // Create a STANDINGS ROW (Driver + Constructor) - hidden initially
  const standingsRow = d3.select("#race-details-container")
    .append("div")
    .attr("id", "standings-row")
    .style("width", "100%")
    .style("display", "none") // reveal after podium animates
    .style("background", "#1a1a1a")
    .style("padding", "10px")
    .style("gap", "10px")
    .style("flex-wrap", "wrap")
    .style("justify-content", "center")
    .style("display", "flex"); // so driver + constructor are side by side

  // Driver Standings container
  standingsRow.append("div")
    .attr("id", "driver-standings-container")
    .style("width", "49%")
    .style("flex", "1 1 580px")
    .style("min-width", "450px")
    .style("min-height", "640px");

  // Constructor Standings container
  standingsRow.append("div")
    .attr("id", "constructor-standings-container")
    .style("width", "49%")
    .style("flex", "1 1 580px")
    .style("min-width", "450px");

  (async function () {
    let podiumObj = await drawPodiumHistogram(raceData, "#podium-container", function () {
      // Reveal the Driver+Constructor row
      d3.select("#standings-row").style("display", "flex");
      // Draw the Driver Standings (bar chart)
      drawDriverStandings(raceData, "#driver-standings-container");
      // Draw the Constructor Standings (donut chart)
      drawConstructorStandings(raceData, "#constructor-standings-container");

      // Scroll to the new row
      setTimeout(() => {
        document.getElementById("standings-row")
          .scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    });

    // Draw Fastest Lap; once it finishes, animate the podium bars
    drawFastestLapVisualization(raceData, "#fastest-lap-container", function () {
      if (podiumObj && typeof podiumObj.animateBars === "function") {
        podiumObj.animateBars();
      }
    });
  })();
}
