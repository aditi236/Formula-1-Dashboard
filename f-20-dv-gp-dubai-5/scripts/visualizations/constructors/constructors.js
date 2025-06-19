// ----------------------------------------------------------------------
// 1) Configuration Variables
// ----------------------------------------------------------------------
const CONSTRUCTORS_CSV_PATH = "assets/data/f1db-constructors.csv";
const SEASONS_STANDINGS_CSV_PATH = "assets/data/f1db-seasons-constructor-standings.csv";
const RACE_RESULTS_CSV_PATH = "assets/data/f1db-races-race-results.csv";
const DEFAULT_METRIC = "totalRaceWins"; // Fallback metric if none provided

/**
 * Initializes the main Constructors Visualization dashboard.
 *
 * This function sets up the container with two sections:
 * one for the bubble chart and one for the line chart.
 * It loads CSV data if not provided, converts string values to numbers,
 * aggregates race results metrics (race wins, podiums, pole positions),
 * and then calls the respective initialization functions.
 *
 * @param {string} selector - CSS selector for the container element.
 * @param {Array} allConstructors - Array of constructor objects.
 * @param {string} selectedMetric - Metric for sizing the bubbles (e.g., "totalRaceWins").
 * @param {Array} seasonConstructorStandingsData - Season-by-season standings dataset.
 */
async function initConstructorsVisualization(selector, allConstructors, selectedMetric, seasonConstructorStandingsData) {
    // ----------------------------------------------------------------------
    // 2) Load Constructor Data if Not Provided
    // ----------------------------------------------------------------------
    if (!allConstructors || !Array.isArray(allConstructors)) {
        const csvData = await d3.csv(CONSTRUCTORS_CSV_PATH);
        csvData.forEach(d => {
            d.totalRaceWins = +d.totalRaceWins || 0;
            d.totalChampionshipWins = +d.totalChampionshipWins || 0;
            d.totalPoints = +d.totalPoints || 0;
        });
        allConstructors = csvData;
    }

    // ----------------------------------------------------------------------
    // 3) Set Fallback Metric
    // ----------------------------------------------------------------------
    if (!selectedMetric) {
        selectedMetric = DEFAULT_METRIC;
    }

    // ----------------------------------------------------------------------
    // 4) Load Season Standings Data if Not Provided
    // ----------------------------------------------------------------------
    if (!seasonConstructorStandingsData || !Array.isArray(seasonConstructorStandingsData)) {
        const csvData = await d3.csv(SEASONS_STANDINGS_CSV_PATH);
        csvData.forEach(d => {
            d.year = +d.year;
            d.points = +d.points;
            d.positionNumber = +d.positionNumber;
        });
        seasonConstructorStandingsData = csvData;
    }

    // ----------------------------------------------------------------------
    // 5) Load and Aggregate Race Results Data
    // ----------------------------------------------------------------------
    // This step loads the race results CSV and aggregates new metrics:
    // - Race Wins: Count of rows where positionDisplayOrder is 1.
    // - Podiums: Count of rows where positionDisplayOrder is between 1 and 3.
    // - Pole Positions: Count of rows where polePosition is "true".
    let raceResultsAggregatedData;
    try {
        const raceResultsData = await d3.csv(RACE_RESULTS_CSV_PATH);
        raceResultsData.forEach(d => {
            d.year = +d.year;
            d.positionDisplayOrder = +d.positionDisplayOrder;
            d.polePosition = d.polePosition.toLowerCase() === "true";
        });

        // Aggregate the metrics by constructorId and year using d3.rollup.
        const raceResultsMap = d3.rollup(
            raceResultsData,
            v => ({
                raceWins: v.filter(r => r.positionDisplayOrder === 1).length,
                podiums: v.filter(r => r.positionDisplayOrder >= 1 && r.positionDisplayOrder <= 3).length,
                polePositions: v.filter(r => r.polePosition === true).length
            }),
            d => d.constructorId,
            d => d.year
        );

        // Convert the rollup Map to an array for easy use.
        raceResultsAggregatedData = [];
        for (let [constructorId, yearMap] of raceResultsMap.entries()) {
            for (let [year, metrics] of yearMap.entries()) {
                raceResultsAggregatedData.push({
                    constructorId,
                    year,
                    raceWins: metrics.raceWins,
                    podiums: metrics.podiums,
                    polePositions: metrics.polePositions
                });
            }
        }
    } catch (error) {
        console.error("Error loading race results CSV:", error);
        raceResultsAggregatedData = [];
    }

    // ----------------------------------------------------------------------
    // 6) Select and Clear the Container Element
    // ----------------------------------------------------------------------
    const container = d3.select(selector).html("");

    // ----------------------------------------------------------------------
    // 7) Create Bubble Chart Section
    // ----------------------------------------------------------------------
    const bubbleBlock = container.append("div")
        .attr("class", "visualisation-block");

    bubbleBlock.append("div")
        .attr("class", "visualisation-block-body")
        .attr("id", "constructors-bubble-chart-body");

    // ----------------------------------------------------------------------
    // 8) Create Line Chart Section
    // ----------------------------------------------------------------------
    const lineBlock = container.append("div")
        .attr("class", "visualisation-block");

    // Create header for the line chart section.
    lineBlock.append("div")
        .attr("class", "visualisation-block-header")
        .text("Constructor Performance Over Time");

    lineBlock.append("div")
        .attr("class", "visualisation-block-body")
        .attr("id", "constructors-line-chart-body");

    // ----------------------------------------------------------------------
    // 9) Initialize the Visualizations
    // ----------------------------------------------------------------------
    // Pass the raceResultsAggregatedData as a new parameter to the line chart.
    initConstructorsBubbleChart("#constructors-bubble-chart-body", allConstructors, selectedMetric);
    initConstructorsLineChart("#constructors-line-chart-body", allConstructors, seasonConstructorStandingsData, raceResultsAggregatedData);
}
